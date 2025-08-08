const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let isBotRunning = false;

app.use(cors());

app.get("/start-bot", (req, res) => {
  if (isBotRunning) return res.send("Bot já está rodando!");
  exec("node robo.js", (err) => {
    if (err) return res.status(500).send("Erro ao iniciar bot.");
  });
  isBotRunning = true;
  res.send("Bot iniciado com sucesso.");
});

io.on("connection", () => {
  console.log("Frontend conectado via socket");
});

server.listen(3000, () => {
  console.log("Servidor local rodando em http://localhost:3000");
});

module.exports = io;
