import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log("🔗 Nova conexão WhatsApp WebSocket estabelecida");

    socket.onopen = () => {
      console.log("✅ WhatsApp WebSocket conectado");
      
      // Enviar status inicial
      socket.send(JSON.stringify({
        type: "message",
        data: {
          type: "status",
          message: "WhatsApp Socket conectado, gerando QR code...",
          timestamp: new Date().toISOString()
        }
      }));
      
      // Simular geração de QR code após 2 segundos
      setTimeout(() => {
        const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(`whatsapp:connect:${Date.now()}`);
        console.log("📱 Enviando QR Code");
        
        socket.send(JSON.stringify({
          type: "qr",
          data: qrCode
        }));
      }, 2000);

      // Simular autenticação após 15 segundos
      setTimeout(() => {
        console.log("🔐 WhatsApp autenticado");
        socket.send(JSON.stringify({
          type: "ready",
          data: {
            sessionId: `session_${Date.now()}`,
            status: "authenticated",
            message: "WhatsApp conectado com sucesso!"
          }
        }));
      }, 15000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Mensagem WhatsApp recebida:", data);

        switch (data.type) {
          case "connect":
            console.log("🔄 Solicitação de conexão WhatsApp");
            socket.send(JSON.stringify({
              type: "message",
              data: {
                type: "connecting",
                message: "Conectando ao WhatsApp...",
                timestamp: new Date().toISOString()
              }
            }));
            break;

          case "ping":
            socket.send(JSON.stringify({
              type: "message",
              data: {
                type: "pong",
                timestamp: new Date().toISOString()
              }
            }));
            break;

          default:
            console.log("Tipo de mensagem WhatsApp desconhecido:", data.type);
        }
      } catch (error) {
        console.error("Erro ao processar mensagem WhatsApp:", error);
        socket.send(JSON.stringify({
          type: "error",
          data: {
            message: "Erro ao processar mensagem",
            timestamp: new Date().toISOString()
          }
        }));
      }
    };

    socket.onclose = () => {
      console.log("❌ WhatsApp WebSocket desconectado");
    };

    socket.onerror = (error) => {
      console.error("Erro no WhatsApp WebSocket:", error);
    };

    return response;
  }

  // Fallback para requisições HTTP
  return new Response(JSON.stringify({ 
    message: "WhatsApp Socket.IO endpoint - use WebSocket para conectar" 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
});