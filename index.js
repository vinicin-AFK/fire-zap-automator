const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let qrImage = null;
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  qrImage = await qrcode.toDataURL(qr);
  io.emit('qr', qrImage);
  isReady = false;
  console.log('📸 Novo QR Code gerado');
});

client.on('ready', () => {
  console.log('✅ WhatsApp conectado com sucesso!');
  io.emit('ready', 'connected');
  isReady = true;
});

client.initialize();

io.on('connection', (socket) => {
  console.log('🟢 Cliente frontend conectado');
  if (qrImage) socket.emit('qr', qrImage);
  if (isReady) socket.emit('ready', 'connected');
});

app.post('/api/validate', async (req, res) => {
  try {
    const { sessionId, number } = req.body || {};
    if (!number) return res.status(400).json({ ok: false, error: 'Body: { number }' });

    if (!isReady) {
      return res.status(400).json({ ok: false, error: 'Sessão não está pronta (status=not_ready)' });
    }

    const cleanNumber = String(number).replace(/\D/g, '');
    const jid = number.includes('@') ? number : `${cleanNumber}@c.us`;

    let exists = false;
    try {
      // Preferência: getNumberId (retorna objeto se existir)
      const info = await client.getNumberId(cleanNumber);
      exists = !!info;
    } catch (e) {
      try {
        // Fallback: isRegisteredUser
        exists = await client.isRegisteredUser(jid);
      } catch (err) {
        return res.status(500).json({ ok: false, error: err.message || 'validate_failed' });
      }
    }

    return res.json({ ok: true, number: cleanNumber, exists });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

app.get('/', (req, res) => {
  res.send('🔥 Fire Zap Backend está rodando com sucesso!');
});

server.listen(3000, () => {
  console.log('🚀 Servidor iniciado na porta 3000');
});
