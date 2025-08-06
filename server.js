const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());

let isBotRunning = false;

app.get("/start-bot", (req, res) => {
  if (isBotRunning) return res.send("Bot já está rodando!");

  const subprocess = exec("node robo.js", (err, stdout, stderr) => {
    if (err) {
      console.error("Erro ao iniciar bot:", err);
      return res.status(500).send("Erro ao iniciar bot.");
    }
  });

  isBotRunning = true;
  res.send("Bot iniciado com sucesso.");
});

io.on("connection", (socket) => {
  console.log("Frontend conectado.");
});

server.listen(3000, () => {
  console.log("🔥 Servidor backend iniciado na porta 3000");
});

module.exports = io;
