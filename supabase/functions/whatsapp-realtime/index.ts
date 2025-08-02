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

  if (upgradeHeader.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log("🔗 Nova conexão WebSocket WhatsApp estabelecida");

    socket.onopen = () => {
      console.log("✅ WebSocket WhatsApp conectado");
      
      // Simular geração de QR code após 2 segundos
      setTimeout(() => {
        const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(`whatsapp:connect:${Date.now()}`);
        console.log("📱 Enviando QR Code");
        
        socket.send(JSON.stringify({
          type: "qr",
          qr: qrCode,
          sessionId: `session_${Date.now()}`,
          timestamp: new Date().toISOString()
        }));
      }, 2000);

      // Simular autenticação após 15 segundos
      setTimeout(() => {
        console.log("🔐 WhatsApp autenticado");
        socket.send(JSON.stringify({
          type: "authenticated",
          sessionId: `session_${Date.now()}`,
          message: "WhatsApp conectado com sucesso!",
          timestamp: new Date().toISOString()
        }));
      }, 15000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Mensagem WhatsApp recebida:", data);

        switch (data.type) {
          case "ping":
            socket.send(JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString()
            }));
            break;
          
          default:
            console.log("Tipo de mensagem desconhecido:", data.type);
        }
      } catch (error) {
        console.error("Erro ao processar mensagem WhatsApp:", error);
      }
    };

    socket.onclose = () => {
      console.log("❌ WebSocket WhatsApp desconectado");
    };

    socket.onerror = (error) => {
      console.error("Erro no WebSocket WhatsApp:", error);
    };

    return response;
  }

  // Handle HTTP requests
  try {
    const { action, phoneNumber } = await req.json();
    
    console.log(`📞 Ação WhatsApp: ${action} para número: ${phoneNumber}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      action,
      phoneNumber,
      message: "Conecte-se via WebSocket para receber atualizações em tempo real" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro no WhatsApp realtime:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});