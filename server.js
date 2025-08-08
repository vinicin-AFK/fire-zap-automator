const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || null; // se definido, exigir Authorization: Bearer <API_TOKEN>
const DEFAULT_COUNTRY = process.env.COUNTRY_CODE || '55'; // Brasil por padrão

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

let lastQrDataUrl = null;
let status = 'idle'; // idle → starting/qr/authenticated/ready/...
let client = null;
let initializing = false;

async function ensureClientInit(force = false) {
  if (client && !force) return client;
  if (initializing) return client;

  initializing = true;
  lastQrDataUrl = null;
  status = 'starting';
  io.emit('status', { status });

  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'firezap' }),
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    webVersionCache: { type: 'local' },
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    },
  });

  client.on('qr', async (qr) => {
    status = 'qr';
    try {
      lastQrDataUrl = await qrcode.toDataURL(qr);
      io.emit('qr', lastQrDataUrl);
      io.emit('status', { status });
      console.log('QR code updated');
    } catch (e) {
      console.error('Failed to generate QR:', e);
    }
  });

  client.on('loading_screen', (percent, message) => {
    io.emit('status', { status: 'loading', percent, message });
  });

  client.on('authenticated', () => {
    status = 'authenticated';
    io.emit('status', { status });
    console.log('Authenticated');
  });

  client.on('ready', async () => {
    status = 'ready';
    io.emit('status', { status });
    console.log('WhatsApp is ready');

    try {
      global.__FIREZAP_CLIENT__ = client;
      const bot = require('./bot');
      if (bot && typeof bot.attach === 'function') {
        await bot.attach(client, io);
        console.log('Bot attach: OK');
      } else if (bot && bot.default && typeof bot.default === 'function') {
        await bot.default(client, io);
        console.log('Bot default attach: OK');
      } else {
        console.log('Bot não exporta função attach() — pulando.');
      }
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log('Nenhum bot customizado encontrado (./bot).');
      } else {
        console.error('Erro ao carregar bot:', e);
      }
    }
  });

  client.on('auth_failure', (msg) => {
    status = 'auth_failure';
    io.emit('status', { status, msg });
    console.error('Auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    status = 'disconnected';
    io.emit('status', { status, reason });
    console.warn('Client disconnected:', reason);
    client.initialize(); // tenta reconectar
  });

  client.initialize();
  initializing = false;
  return client;
}

// sockets
io.on('connection', (socket) => {
  socket.emit('status', { status });
  if (lastQrDataUrl) socket.emit('qr', lastQrDataUrl);
});

// health & qr
app.get('/health', (_, res) => res.json({ ok: true, status }));

app.get('/qr', (req, res) => {
  if (!lastQrDataUrl) return res.status(404).json({ error: 'QR não disponível ainda' });
  res.json({ dataUrl: lastQrDataUrl, status });
});

app.post('/qr/start', async (req, res) => {
  try {
    await ensureClientInit(true);
    res.json({ ok: true, status });
  } catch (e) {
    console.error('Erro /qr/start:', e);
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

// utils
function requireAuth(req, res) {
  if (!API_TOKEN) return true;
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (token === API_TOKEN) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

function normalizeToJid(raw) {
  if (!raw) return null;
  if (/@c\.us$/.test(raw)) return raw;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  const hasDDI = digits.length >= 12;
  const withCountry = hasDDI ? digits : (DEFAULT_COUNTRY + digits);
  return `${withCountry}@c.us`;
}

async function makeMediaFromInput(input) {
  if (!input || typeof input !== 'object') throw new Error('Campo "media" inválido.');
  if (input.dataUrl && typeof input.dataUrl === 'string' && input.dataUrl.startsWith('data:')) {
    const match = input.dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) throw new Error('dataUrl inválida');
    const mimetype = match[1] || input.mimetype || 'application/octet-stream';
    const b64 = match[2];
    const filename = input.filename || 'file';
    return new MessageMedia(mimetype, b64, filename);
  }
  if (input.base64 && input.mimetype) {
    const filename = input.filename || 'file';
    return new MessageMedia(input.mimetype, input.base64, filename);
  }
  if (input.url) {
    const response = await fetch(input.url);
    if (!response.ok) throw new Error(`Falha ao baixar URL (${response.status})`);
    const arrayBuf = await response.arrayBuffer();
    const b64 = Buffer.from(arrayBuf).toString('base64');
    const headerMime = response.headers.get('content-type');
    const mimetype = input.mimetype || headerMime || 'application/octet-stream';
    let filename = input.filename;
    try {
      if (!filename) {
        const u = new URL(input.url);
        filename = u.pathname.split('/').pop() || 'file';
      }
    } catch {}
    return new MessageMedia(mimetype, b64, filename || 'file');
  }
  throw new Error('Forneça "dataUrl", ou "base64"+"mimetype", ou "url" em media.');
}

// session maintenance
app.get('/session', async (req, res) => {
  try {
    const state = client ? await client.getState().catch(() => status) : 'none';
    const info = client && client.info || null;
    res.json({ ok: true, status, state, me: info ? { wid: info.wid?._serialized || null, pushname: info.pushname || null } : null });
  } catch (e) {
    res.json({ ok: false, status, error: String(e && e.message || e) });
  }
});

app.post('/session/clear', async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const fs = require('fs');
    const path = require('path');
    const p = path.resolve(process.cwd(), '.wwebjs_auth');
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    if (client) { try { await client.destroy(); } catch {} }
    status = 'idle';
    lastQrDataUrl = null;
    io.emit('status', { status });
    res.json({ ok: true, message: 'Sessão limpa. Clique em "Gerar QR" para iniciar.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

app.post('/session/restart', async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    if (client) { try { await client.destroy(); } catch {} }
    status = 'idle';
    lastQrDataUrl = null;
    io.emit('status', { status });
    res.json({ ok: true, message: 'Cliente parado. Clique em "Gerar QR" para iniciar.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

// messaging
app.post('/send', async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (status !== 'ready') return res.status(503).json({ error: 'Cliente não está pronto. Status: ' + status });

  const { to, numbers, message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Campo "message" é obrigatório.' });

  try {
    let jids = [];
    if (Array.isArray(numbers)) {
      jids = numbers.map(normalizeToJid).filter(Boolean);
    } else if (to) {
      const jid = normalizeToJid(to);
      if (jid) jids = [jid];
    }
    if (!jids.length) return res.status(400).json({ error: 'Informe "to" (string) ou "numbers" (array) com números válidos.' });

    const results = [];
    for (const jid of jids) {
      try {
        const r = await client.sendMessage(jid, message);
        results.push({ jid, id: r.id?._serialized || null, success: true });
      } catch (e) {
        results.push({ jid, success: false, error: String(e && e.message || e) });
      }
    }

    res.json({ ok: true, results });
  } catch (e) {
    console.error('Erro no /send:', e);
    res.status(500).json({ error: 'Erro interno', detail: String(e && e.message || e) });
  }
});

app.post('/send-media', async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (status !== 'ready') return res.status(503).json({ error: 'Cliente não está pronto. Status: ' + status });

  const { to, numbers, caption, media } = req.body || {};
  if (!media) return res.status(400).json({ error: 'Campo "media" é obrigatório.' });

  try {
    const msgMedia = await makeMediaFromInput(media);
    let jids = [];
    if (Array.isArray(numbers)) {
      jids = numbers.map(normalizeToJid).filter(Boolean);
    } else if (to) {
      const jid = normalizeToJid(to);
      if (jid) jids = [jid];
    }
    if (!jids.length) return res.status(400).json({ error: 'Informe "to" (string) ou "numbers" (array) com números válidos.' });

    const results = [];
    for (const jid of jids) {
      try {
        const r = await client.sendMessage(jid, msgMedia, { caption });
        results.push({ jid, id: r.id?._serialized || null, success: true });
      } catch (e) {
        results.push({ jid, success: false, error: String(e && e.message || e) });
      }
    }

    res.json({ ok: true, results });
  } catch (e) {
    console.error('Erro no /send-media:', e);
    res.status(400).json({ error: String(e && e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT} — clique "Gerar QR" no front pra iniciar.`);
});
