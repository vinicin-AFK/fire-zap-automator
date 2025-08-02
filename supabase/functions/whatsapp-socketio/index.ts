import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";

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

  try {
    const io = new Server(req, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    console.log("🔗 Servidor WhatsApp Socket.IO iniciado");

    io.on("connection", (socket) => {
      console.log("✅ Cliente WhatsApp Socket.IO conectado:", socket.id);

      // Simular geração de QR code
      setTimeout(() => {
        const qrCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        console.log("📱 Enviando QR Code para cliente");
        socket.emit("qr", qrCode);
      }, 2000);

      // Simular autenticação após 10 segundos
      setTimeout(() => {
        console.log("🔐 WhatsApp autenticado");
        socket.emit("ready", {
          sessionId: `session_${Date.now()}`,
          status: "authenticated",
          message: "WhatsApp conectado com sucesso!"
        });
      }, 10000);

      socket.on("message", (data) => {
        try {
          console.log("📨 Mensagem WhatsApp recebida:", data);

          switch (data.type) {
            case "connect":
              console.log("🔄 Solicitação de conexão WhatsApp");
              socket.emit("message", {
                type: "connecting",
                message: "Conectando ao WhatsApp...",
                timestamp: new Date().toISOString()
              });
              break;

            case "send_message":
              console.log("💬 Enviando mensagem WhatsApp");
              socket.emit("message", {
                type: "message_sent",
                messageId: `msg_${Date.now()}`,
                status: "sent",
                timestamp: new Date().toISOString()
              });
              break;

            default:
              console.log("Tipo de mensagem WhatsApp desconhecido:", data.type);
          }
        } catch (error) {
          console.error("Erro ao processar mensagem WhatsApp:", error);
          socket.emit("error", {
            message: "Erro ao processar mensagem",
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on("disconnect", () => {
        console.log("❌ Cliente WhatsApp Socket.IO desconectado:", socket.id);
      });

      socket.on("error", (error) => {
        console.error("Erro no WhatsApp Socket.IO:", error);
      });

      // Enviar status inicial
      socket.emit("message", {
        type: "status",
        message: "WhatsApp Socket.IO pronto",
        timestamp: new Date().toISOString()
      });
    });

    return new Response("WhatsApp Socket.IO server running", { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error("Erro no servidor WhatsApp Socket.IO:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});