// robo.js (CommonJS)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

// Permite múltiplas sessões: node robo.js --session 5511999999999
const args = process.argv;
const idx = args.indexOf('--session');
const sessionId = idx !== -1 ? String(args[idx + 1] || 'default') : 'default';

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: sessionId,
    dataPath: './.wwebjs_auth',
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

client.on('qr', async (qr) => {
  // Mostra no terminal (útil no VSCode)
  qrcodeTerminal.generate(qr, { small: true });
  // Envia QR como mensagens "marcadas" que o server vai capturar:
  // 1) QR bruto (string)
  console.log(`QR_RAW:${qr}`);
  // 2) QR como PNG base64 (ideal pro frontend)
  const dataUrl = await qrcode.toDataURL(qr, { width: 320, errorCorrectionLevel: 'M' });
  console.log(`QR_DATAURL:${dataUrl}`);
});

client.on('authenticated', () => console.log('STATUS:authenticated'));
client.on('ready', () => console.log('STATUS:ready'));
client.on('disconnected', (reason) => console.log(`STATUS:disconnected:${reason || ''}`));
client.on('auth_failure', (msg) => console.log(`STATUS:error:auth_failure:${msg || ''}`));

client.initialize().catch((e) => {
  console.log(`STATUS:error:init:${e?.message || e}`);
  process.exitCode = 1;
});
