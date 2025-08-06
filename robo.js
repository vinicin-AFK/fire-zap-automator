const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const io = require("./server");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ["--no-sandbox"] }
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  io.emit("qr", qr);
  console.log("QR enviado para frontend via socket.");
});

client.on("ready", () => {
  console.log("✅ Cliente conectado com sucesso.");
  io.emit("status", "connected");
});

client.initialize();
