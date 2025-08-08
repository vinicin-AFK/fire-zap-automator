const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
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

app.get('/', (req, res) => {
  res.send('🔥 Fire Zap Backend está rodando com sucesso!');
});

server.listen(3000, () => {
  console.log('🚀 Servidor iniciado na porta 3000');
});
