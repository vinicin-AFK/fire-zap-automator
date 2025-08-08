# Como Configurar o Webhook no WhatsApp Business API

## 🔗 URL do Webhook
Adicione esta URL no Facebook Developer Console:

```
https://fuohmclakezkvgaiarao.supabase.co/functions/v1/whatsapp-webhook
```

## ⚙️ Configuração no Facebook Developer Console

### 1. Acesse o Facebook Developer Console
- Vá para: https://developers.facebook.com/
- Navegue até seu app do WhatsApp Business
- Vá em: **WhatsApp > Configuration**

### 2. Configure o Webhook
- **Callback URL**: `https://fuohmclakezkvgaiarao.supabase.co/functions/v1/whatsapp-webhook`
- **Verify Token**: Use o token que você configurou no secret `WHATSAPP_VERIFY_TOKEN`
- **Webhook Fields**: Selecione `messages`

### 3. Eventos para Receber
Marque as seguintes opções:
- ✅ `messages` - Para receber mensagens
- ✅ `message_deliveries` - Para status de entrega
- ✅ `message_reads` - Para confirmações de leitura

## 🔑 Secrets Necessários
Certifique-se de ter configurado todos os secrets:

1. `WHATSAPP_API_KEY` - Access Token do WhatsApp Business
2. `WHATSAPP_PHONE_NUMBER_ID` - ID do número de telefone
3. `WHATSAPP_VERIFY_TOKEN` - Token para verificação do webhook
4. `OPENAI_API_KEY` - Para respostas do bot

## ✅ Testando a Configuração

### 1. Verificação do Webhook
O Facebook vai fazer uma requisição GET para verificar o webhook:
```
GET https://fuohmclakezkvgaiarao.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=CHALLENGE
```

### 2. Mensagens Recebidas
Quando alguém enviar uma mensagem para seu número do WhatsApp Business, você receberá um payload como este:
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "field": "messages",
          "value": {
            "messages": [
              {
                "from": "5511999999999",
                "id": "wamid.xxx",
                "timestamp": "1640995200",
                "type": "text",
                "text": {
                  "body": "Olá!"
                }
              }
            ],
            "metadata": {
              "phone_number_id": "123456789"
            }
          }
        }
      ]
    }
  ]
}
```

## 🚀 Funcionalidades Implementadas

✅ **Recepção de Mensagens**: Webhook processa mensagens recebidas  
✅ **Respostas Automáticas**: Bot responde automaticamente usando OpenAI  
✅ **Banco de Dados**: Mensagens são salvas na tabela `messages`  
✅ **Realtime**: Interface atualiza em tempo real  
✅ **Status de Mensagens**: Processa confirmações de entrega e leitura  

## 📱 Como Testar

1. Configure o webhook no Facebook Developer Console
2. Envie uma mensagem para seu número do WhatsApp Business
3. Verifique os logs da função: [WhatsApp Webhook Logs](https://supabase.com/dashboard/project/fuohmclakezkvgaiarao/functions/whatsapp-webhook/logs)
4. Veja as mensagens aparecerem na página de Heating em tempo real

## 🔧 Troubleshooting

Se as mensagens não estão chegando:

1. **Verifique os logs**: [Webhook Logs](https://supabase.com/dashboard/project/fuohmclakezkvgaiarao/functions/whatsapp-webhook/logs)
2. **Confirme os secrets**: Todos os tokens estão configurados?
3. **Teste a URL**: Webhook está respondendo?
4. **Facebook Console**: Webhook está ativo e verificado?