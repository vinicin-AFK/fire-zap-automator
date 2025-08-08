const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js'); // Mudança Buttons
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('WhatsApp conectado.✅');
});

client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms)); // Função que usamos para criar o delay entre uma ação e outra

// Funil

client.on('message', async msg => {

    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {

        const chat = await msg.getChat();

        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        const contact = await msg.getContact(); //Pegando o contato
        const name = contact.pushname; //Pegando o nome do contato
        await client.sendMessage(msg.from,'Olá! '+ name.split(" ")[0] + ' tudo bem? quem te enviou essa mensagem foi o robô que acabamos de criar, incrível né😎'); //Primeira mensagem de texto
        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await client.sendMessage(msg.from,'A versão grátis do robô automatiza apenas mensagens de texto.'); //Primeira mensagem de texto
        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await client.sendMessage(msg.from, 'Na versão PRO: desbloqueie tudo!\n\n' +
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