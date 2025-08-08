import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Só aceita conexões WebSocket
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Esta função requer conexão WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log("🔗 Nova conexão WebSocket WhatsApp estabelecida");

  socket.onopen = () => {
    console.log("✅ WebSocket WhatsApp conectado");
    
    // Enviar status inicial
    socket.send(JSON.stringify({
      type: "status",
      message: "WebSocket conectado, aguarde o QR code...",
      timestamp: new Date().toISOString()
    }));
    
    // Simular geração de QR code após 3 segundos
    setTimeout(() => {
      const qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(`whatsapp:connect:${Date.now()}`);
      console.log("📱 Enviando QR Code");
      
      socket.send(JSON.stringify({
        type: "qr",
        qr: qrCode,
        sessionId: `session_${Date.now()}`,
        timestamp: new Date().toISOString()
      }));
    }, 3000);

    // Simular autenticação após 20 segundos
    setTimeout(() => {
      console.log("🔐 WhatsApp autenticado");
      socket.send(JSON.stringify({
        type: "authenticated",
        sessionId: `session_${Date.now()}`,
        message: "WhatsApp conectado com sucesso!",
        timestamp: new Date().toISOString()
      }));
    }, 20000);
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
        
        case "connect":
          console.log("🔄 Solicitação de conexão para:", data.phoneNumber);
          socket.send(JSON.stringify({
            type: "connecting",
            message: "Iniciando conexão WhatsApp...",
            timestamp: new Date().toISOString()
          }));
          break;
        
        default:
          console.log("Tipo de mensagem desconhecido:", data.type);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem WhatsApp:", error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Erro ao processar mensagem",
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log("❌ WebSocket WhatsApp desconectado");
  };

  socket.onerror = (error) => {
    console.error("Erro no WebSocket WhatsApp:", error);
  };

  return response;
});