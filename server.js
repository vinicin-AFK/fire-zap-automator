const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const sessions = {};

async function startSession(sessionId) {
  const sessionPath = path.join(__dirname, "sessions", sessionId);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) sessions[sessionId].qr = qr;
    if (connection === "open") sessions[sessionId].connected = true;
    if (connection === "close") {
      sessions[sessionId].connected = false;
      setTimeout(() => startSession(sessionId), 3000);
    }
    io.emit("session-update", {
      sessionId,
      qr: sessions[sessionId]?.qr || null,
      connected: sessions[sessionId]?.connected || false,
    });
  });

  sessions[sessionId] = { sock, connected: false, qr: null };
}

io.on("connection", (socket) => {
  socket.on("create-session", ({ sessionId }) => {
    if (!sessions[sessionId]) startSession(sessionId);
    else socket.emit("session-update", sessions[sessionId]);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () =>
  console.log(`🔥 FireZap rodando na porta ${port}`)
);
