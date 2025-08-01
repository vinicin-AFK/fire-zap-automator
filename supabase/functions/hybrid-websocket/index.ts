import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log("🔗 Nova conexão WebSocket estabelecida");

  const clients = new Set([socket]);

  socket.onopen = () => {
    console.log("✅ WebSocket conectado");
    socket.send(JSON.stringify({
      type: "connection",
      status: "connected",
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 Mensagem recebida:", data);

      switch (data.type) {
        case "session_update":
          // Propaga atualizações de sessão para todos os clientes
          broadcastToClients({
            type: "session_status",
            sessionId: data.sessionId,
            connected: data.connected,
            qr: data.qr,
            timestamp: new Date().toISOString()
          });
          break;

        case "message_sent":
          // Notifica sobre mensagem enviada
          broadcastToClients({
            type: "message_status",
            messageId: data.messageId,
            status: "sent",
            timestamp: new Date().toISOString()
          });
          break;

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
      console.error("Erro ao processar mensagem WebSocket:", error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Erro ao processar mensagem",
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log("❌ WebSocket desconectado");
    clients.delete(socket);
  };

  socket.onerror = (error) => {
    console.error("Erro no WebSocket:", error);
    clients.delete(socket);
  };

  function broadcastToClients(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Enviar status inicial
  setTimeout(() => {
    socket.send(JSON.stringify({
      type: "status",
      message: "WebSocket pronto para receber comandos",
      timestamp: new Date().toISOString()
    }));
  }, 1000);

  return response;
});