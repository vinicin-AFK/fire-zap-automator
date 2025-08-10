const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

// Se quiser multi-sessão: `node robo.js --session 5511999999999`
const args = process.argv;
const idx = args.indexOf('--session');
const sessionId = idx !== -1 ? String(args[idx + 1] || 'default') : 'default';

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: sessionId,
        dataPath: './.wwebjs_auth'
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
    }
});

client.on('qr', async qr => {
    // QR no terminal (debug local)
    qrcode.generate(qr, { small: true });

    // QR bruto
    console.log(`QR_RAW:${qr}`);

    // QR como Data URL (PNG)
    const dataUrl = await QRCode.toDataURL(qr, { width: 320, errorCorrectionLevel: 'M' });
    console.log(`QR_DATAURL:${dataUrl}`);
});

client.on('authenticated', () => {
    console.log('STATUS:authenticated');
});

client.on('ready', () => {
    console.log('STATUS:ready');
});

client.on('disconnected', (reason) => {
    console.log(`STATUS:disconnected:${reason || ''}`);
});

client.on('auth_failure', (msg) => {
    console.log(`STATUS:error:auth_failure:${msg || ''}`);
});

client.initialize();

// ---------------- FUNIL DE MENSAGENS ----------------
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async msg => {
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();

        await delay(3000);
        await chat.sendStateTyping();
        await delay(3000);

        const contact = await msg.getContact();
        const name = contact.pushname;

        await client.sendMessage(msg.from, `Olá! ${name.split(" ")[0]} tudo bem? quem te enviou essa mensagem foi o robô que acabamos de criar, incrível né😎`);
        await delay(3000);
        await chat.sendStateTyping();
        await client.sendMessage(msg.from, 'A versão grátis do robô automatiza apenas mensagens de texto.');
        await delay(3000);
        await chat.sendStateTyping();
        await client.sendMessage(msg.from,
            'Na versão PRO: desbloqueie tudo!\n\n' +
            '✍️ Envio de textos\n' +
            '🎙️ Áudios\n' +
            '🖼️ Imagens\n' +
            '🎥 Vídeos\n' +
            '📂 Arquivos\n\n' +
            '💡 Simulação de "digitando..." e "gravando áudio"\n' +
            '🚀 Envio de mensagens em massa\n' +
            '📇 Captura automática de contatos\n' +
            '💻 Aprenda como deixar o robô funcionando 24 hrs, com o PC desligado\n' +
            '✅ E 3 Bônus exclusivos\n\n' +
            '🔥 Adquira a versão PRO agora: https://pay.kiwify.com.br/FkTOhRZ?src=pro'
        );
    }
});
