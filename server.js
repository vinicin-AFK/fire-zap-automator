// server.js (CommonJS)
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server: IOServer } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST', 'DELETE'] } });

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Namespace específico pro WhatsApp
const wppNSP = io.of('/wpp');

// ---------------- Process Manager (robo.js) ----------------
class BotProcess {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.status = 'starting'; // starting | qr | ready | disconnected | error | exited
    this.qr = null;
    this.buffer = '';

    // Importante: usar o mesmo Node para rodar o bot
    const nodeExec = process.execPath; // ex.: /usr/bin/node
    const scriptPath = path.resolve('./robo.js');

    this.child = spawn(nodeExec, [scriptPath, '--session', sessionId], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stderr.setEncoding('utf8');

    this.child.stdout.on('data', (chunk) => this._onData(chunk));
    this.child.stderr.on('data', (chunk) => this._onData(chunk, true));

    this.child.on('exit', (code, sig) => {
      this.status = 'exited';
      this._emit('status', { status: this.status, code, sig });
    });
  }

  _onData(chunk, isErr = false) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);

      // Debug opcional:
      // if (isErr) console.error(`[${this.sessionId}] ${line}`);
      // else console.log(`[${this.sessionId}] ${line}`);

      // Parseia marcadores
      if (line.startsWith('QR_DATAURL:')) {
        const dataUrl = line.replace('QR_DATAURL:', '');
        this.qr = dataUrl;
        this.status = 'qr';
        this._emit('qr', { qr: dataUrl });
        this._emit('status', { status: this.status });
      } else if (line.startsWith('QR_RAW:')) {
        // se quiser usar o QR cru pra geração no frontend
      } else if (line.startsWith('STATUS:')) {
        const st = line.replace('STATUS:', '');
        if (st.startsWith('ready')) {
          this.status = 'ready';
          this.qr = null;
        } else if (st.startsWith('authenticated')) {
          this.status = 'authenticated';
        } else if (st.startsWith('disconnected')) {
          this.status = 'disconnected';
        } else if (st.startsWith('error')) {
          this.status = 'error';
        }
        this._emit('status', { status: this.status, raw: st });
        if (this.status === 'ready') this._emit('qr', { qr: null });
      }
    }
  }

  _emit(event, payload) {
    wppNSP.to(this.sessionId).emit(event, { sessionId: this.sessionId, ...payload });
  }

  getStatus() { return this.status; }
  getQR() { return this.qr; }

  stop() {
    if (this.child && !this.child.killed) {
      this.child.kill('SIGTERM');
    }
  }
}

class BotManager {
  constructor() { this.map = new Map(); }
  ensure(id) {
    if (!this.map.has(id)) this.map.set(id, new BotProcess(id));
    return this.map.get(id);
  }
  get(id) { return this.map.get(id) || null; }
  all() { return Array.from(this.map.keys()); }
  remove(id) {
    const p = this.map.get(id);
    if (p) { p.stop(); this.map.delete(id); }
  }
}
const manager = new BotManager();

// ---------------- REST ----------------

// Criar/garantir sessão (spawna `node robo.js --session :id`)
app.post('/wpp/session/:id', (req, res) => {
  const { id } = req.params;
  const s = manager.ensure(id);
  res.json({ ok: true, id, status: s.getStatus() });
});

// Status
app.get('/wpp/session/:id/status', (req, res) => {
  const { id } = req.params;
  const s = manager.get(id);
  if (!s) return res.status(404).json({ error: 'Sessão não existe' });
  res.json({ ok: true, id, status: s.getStatus() });
});

// QR atual (PNG base64 data URL)
app.get('/wpp/session/:id/qr', (req, res) => {
  const { id } = req.params;
  const s = manager.get(id);
  if (!s) return res.status(404).json({ error: 'Sessão não existe' });
  res.json({ ok: true, id, status: s.getStatus(), qr: s.getQR() });
});

// Parar sessão (mata o processo do bot)
app.delete('/wpp/session/:id', (req, res) => {
  const { id } = req.params;
  manager.remove(id);
  res.json({ ok: true, id, status: 'stopped' });
});

// ---------------- Socket.IO ----------------
wppNSP.on('connection', (socket) => {
  socket.on('subscribe', ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);
    const s = manager.ensure(sessionId);
    // Snapshot inicial
    socket.emit('status', { sessionId, status: s.getStatus() });
    if (s.getQR()) socket.emit('qr', { sessionId, qr: s.getQR() });
  });

  socket.on('unsubscribe', ({ sessionId }) => {
    if (sessionId) socket.leave(sessionId);
  });
});

// ---------------- Start ----------------
server.listen(PORT, () => {
  console.log(`FireZap server on :${PORT}`);
  console.log(`Crie sessão: POST http://localhost:${PORT}/wpp/session/5511999999999`);
});
