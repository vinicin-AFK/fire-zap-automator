// server.js
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { Server as IOServer } from 'socket.io';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'; // ajuste se quiser restringir

// ------------------ Infra básica ------------------
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST', 'DELETE'] },
});
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// (Opcional) servir /public para testes de QR simples
const PUBLIC_DIR = path.resolve('./public');
if (fs.existsSync(PUBLIC_DIR)) app.use(express.static(PUBLIC_DIR));

// Espaço do Socket.IO dedicado ao WPP
const wppNSP = io.of('/wpp');

// ------------------ Session Manager ------------------
class WppSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.status = 'starting'; // starting | qr | ready | disconnected | error
    this.qrDataUrl = null;

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.resolve('./.wwebjs_auth'),
        clientId: sessionId,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
        ],
      },
    });

    this._bindEvents();
    this._init();
  }

  _bindEvents() {
    this.client.on('qr', async (qr) => {
      // Terminal para debug
      qrcodeTerminal.generate(qr, { small: true });
      // DataURL PNG para UI
      this.qrDataUrl = await qrcode.toDataURL(qr, { width: 320, errorCorrectionLevel: 'M' });
      this.status = 'qr';
      this._emit('qr', { qr: this.qrDataUrl });
      this._emit('status', { status: this.status });
      console.log(`[${this.sessionId}] Novo QR gerado.`);
    });

    this.client.on('authenticated', () => {
      console.log(`[${this.sessionId}] Autenticado.`);
    });

    this.client.on('ready', () => {
      console.log(`[${this.sessionId}] Sessão pronta.`);
      this.qrDataUrl = null;
      this.status = 'ready';
      this._emit('qr', { qr: null });
      this._emit('status', { status: this.status });
    });

    this.client.on('disconnected', async (reason) => {
      console.warn(`[${this.sessionId}] Disconnected: ${reason}`);
      this.status = 'disconnected';
      this._emit('status', { status: this.status, reason });
      // Tenta reconectar de forma simples
      setTimeout(() => this.reconnect(), 1500);
    });

    this.client.on('auth_failure', (msg) => {
      console.error(`[${this.sessionId}] Auth failure: ${msg}`);
      this.status = 'error';
      this._emit('status', { status: this.status, error: 'auth_failure' });
    });
  }

  async _init() {
    try {
      await this.client.initialize();
    } catch (e) {
      console.error(`[${this.sessionId}] Erro ao inicializar:`, e?.message);
      this.status = 'error';
      this._emit('status', { status: this.status, error: e?.message });
    }
  }

  async reconnect() {
    try { await this.client.destroy(); } catch {}
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.resolve('./.wwebjs_auth'),
        clientId: this.sessionId,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
        ],
      },
    });
    this._bindEvents();
    this.status = 'starting';
    this._emit('status', { status: this.status });
    await this.client.initialize();
  }

  _emit(event, payload) {
    // Emite no namespace /wpp para a "sala" da sessão
    wppNSP.to(this.sessionId).emit(event, { sessionId: this.sessionId, ...payload });
  }

  getStatus() {
    return this.status;
  }

  getQR() {
    return this.qrDataUrl;
  }

  async sendText(to, message) {
    const jid = String(to).includes('@') ? String(to) : `${to}@c.us`;
    const msg = await this.client.sendMessage(jid, String(message));
    return { id: msg.id.id, timestamp: msg.timestamp };
  }

  async logout() {
    try { await this.client.logout(); } catch {}
    const sessPath = path.join('./.wwebjs_auth', `session-${this.sessionId}`);
    if (fs.existsSync(sessPath)) fs.rmSync(sessPath, { recursive: true, force: true });
    this.status = 'disconnected';
    this.qrDataUrl = null;
    this._emit('status', { status: this.status });
  }
}

class WppManager {
  constructor() { this.sessions = new Map(); }
  ensure(sessionId) {
    if (!this.sessions.has(sessionId)) {
      const s = new WppSession(sessionId);
      this.sessions.set(sessionId, s);
    }
    return this.sessions.get(sessionId);
  }
  get(sessionId) { return this.sessions.get(sessionId) || null; }
  all() { return Array.from(this.sessions.keys()); }
}

const manager = new WppManager();

// ------------------ Rotas REST ------------------

// Cria/garante uma sessão
app.post('/wpp/session/:id', (req, res) => {
  const { id } = req.params;
  const sess = manager.ensure(id);
  res.json({ ok: true, id, status: sess.getStatus() });
});

// Status da sessão
app.get('/wpp/session/:id/status', (req, res) => {
  const { id } = req.params;
  const sess = manager.get(id);
  if (!sess) return res.status(404).json({ error: 'Sessão não existe' });
  res.json({ ok: true, id, status: sess.getStatus() });
});

// QR atual (PNG data URL). Útil se não usar Socket.IO
app.get('/wpp/session/:id/qr', (req, res) => {
  const { id } = req.params;
  const sess = manager.get(id);
  if (!sess) return res.status(404).json({ error: 'Sessão não existe' });
  res.json({ ok: true, id, status: sess.getStatus(), qr: sess.getQR() });
});

// Enviar mensagem de texto
app.post('/wpp/session/:id/send', async (req, res) => {
  const { id } = req.params;
  const { to, msg } = req.body || {};
  const sess = manager.get(id);
  if (!sess) return res.status(404).json({ error: 'Sessão não existe' });
  if (!to || !msg) return res.status(400).json({ error: 'Body: { "to": "5511999999999", "msg": "Olá" }' });
  try {
    const r = await sess.sendText(to, msg);
    res.json({ ok: true, result: r });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e?.message });
  }
});

// Logout + limpar credenciais
app.delete('/wpp/session/:id', async (req, res) => {
  const { id } = req.params;
  const sess = manager.get(id);
  if (!sess) return res.status(404).json({ error: 'Sessão não existe' });
  await sess.logout();
  res.json({ ok: true, id, status: 'disconnected' });
});

// Listar sessões
app.get('/wpp/sessions', (_req, res) => {
  res.json({ ok: true, sessions: manager.all() });
});

// ------------------ Socket.IO ------------------
wppNSP.on('connection', (socket) => {
  // Cliente pede para "assinar" uma sessão
  socket.on('subscribe', ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);
    // Garante que a sessão exista
    const sess = manager.ensure(sessionId);
    // Manda snapshot inicial
    socket.emit('status', { sessionId, status: sess.getStatus() });
    if (sess.getQR()) socket.emit('qr', { sessionId, qr: sess.getQR() });
  });

  socket.on('unsubscribe', ({ sessionId }) => {
    if (sessionId) socket.leave(sessionId);
  });
});

// ------------------ Start/Stop ------------------
server.listen(PORT, () => {
  console.log(`FireZap server on :${PORT}`);
  console.log(`Crie sessão: POST http://localhost:${PORT}/wpp/session/5511999999999`);
});

process.on('SIGINT', () => {
  console.log('Encerrando...');
  server.close(() => process.exit(0));
});
