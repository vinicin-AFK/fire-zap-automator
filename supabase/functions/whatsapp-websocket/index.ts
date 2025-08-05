import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log('🔗 Nova conexão WebSocket WhatsApp estabelecida');

  socket.onopen = () => {
    console.log('✅ WebSocket conectado - enviando status inicial');
    
    // Enviar status inicial
    socket.send(JSON.stringify({
      type: 'status',
      message: 'Conectado ao servidor WhatsApp',
      timestamp: new Date().toISOString()
    }));

    // Simular geração de QR Code após 2 segundos
    setTimeout(() => {
      console.log('📷 Gerando QR Code simulado');
      
      const mockQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        `2@${Math.random().toString(36).substring(7)},${Math.random().toString(36).substring(7)},${Date.now()}`
      )}`;
      
      socket.send(JSON.stringify({
        type: 'qr',
        qr: mockQRCode,
        qrCode: mockQRCode, // compatibilidade
        timestamp: new Date().toISOString()
      }));
    }, 2000);

    // Simular conexão pronta após 15 segundos (tempo para usuário escanear)
    setTimeout(() => {
      console.log('🤖 Simulando WhatsApp conectado');
      
      socket.send(JSON.stringify({
        type: 'ready',
        sessionId: `session_${Date.now()}`,
        message: 'WhatsApp conectado com sucesso!',
        timestamp: new Date().toISOString()
      }));
    }, 15000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Mensagem recebida:', data);

      switch (data.type) {
        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'connect':
          console.log('🔄 Solicitação de conexão recebida para:', data.phoneNumber);
          socket.send(JSON.stringify({
            type: 'status',
            message: 'Iniciando conexão WhatsApp...',
            status: 'connecting',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.log('❓ Tipo de mensagem desconhecido:', data.type);
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Tipo de mensagem não reconhecido',
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao processar mensagem',
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log('❌ WebSocket desconectado');
  };

  socket.onerror = (error) => {
    console.error('🚨 Erro no WebSocket:', error);
  };

  return response;
});