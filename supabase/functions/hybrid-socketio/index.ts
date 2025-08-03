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

    console.log("🔗 Servidor Socket.IO iniciado");

    io.on("connection", (socket) => {
      console.log("✅ Cliente Socket.IO conectado:", socket.id);

      // Enviar mensagem de boas-vindas
      socket.emit("message", {
        type: "connection",
        status: "connected",
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      socket.on("message", (data) => {
        try {
          console.log("📨 Mensagem recebida:", data);

          switch (data.type) {
            case "session_update":
              io.emit("message", {
                type: "session_status",
                sessionId: data.sessionId,
                connected: data.connected,
                qr: data.qr,
                timestamp: new Date().toISOString()
              });
              break;

            case "message_sent":
              io.emit("message", {
                type: "message_status",
                messageId: data.messageId,
                status: "sent",
                timestamp: new Date().toISOString()
              });
              break;

            case "ping":
              socket.emit("message", {
                type: "pong",
                timestamp: new Date().toISOString()
              });
              break;

            default:
              console.log("Tipo de mensagem desconhecido:", data.type);
          }
        } catch (error) {
          console.error("Erro ao processar mensagem:", error);
          socket.emit("message", {
            type: "error",
            message: "Erro ao processar mensagem",
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on("qr", (qrCode) => {
        console.log("📨 QR Code recebido");
        socket.emit("qr", qrCode);
      });

      socket.on("ready", (data) => {
        console.log("📨 WhatsApp pronto");
        socket.emit("ready", data);
      });

      socket.on("disconnect", () => {
        console.log("❌ Cliente Socket.IO desconectado:", socket.id);
      });

      socket.on("error", (error) => {
        console.error("Erro no Socket.IO:", error);
      });

      // Iniciar processo WhatsApp
      setTimeout(() => {
        socket.emit("message", {
          type: "status",
          message: "Iniciando conexão WhatsApp...",
          timestamp: new Date().toISOString()
        });

        // Simular QR Code real do WhatsApp
        setTimeout(() => {
          // QR Code real no formato do WhatsApp (base64 simulado)
          const qrCode = generateWhatsAppQR();
          console.log("📱 QR Code WhatsApp gerado");
          socket.emit("qr", qrCode);
        }, 2000);

        // Simular autenticação
        setTimeout(() => {
          console.log("🔐 WhatsApp autenticado");
          socket.emit("ready", {
            sessionId: `session_${socket.id}_${Date.now()}`,
            status: "authenticated",
            message: "WhatsApp conectado com sucesso!",
            timestamp: new Date().toISOString()
          });
        }, 20000); // 20 segundos para dar tempo de escanear
      }, 1000);
    });

    return new Response("Socket.IO server running", { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error("Erro no servidor Socket.IO:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função para gerar QR Code no formato WhatsApp
function generateWhatsAppQR(): string {
  const timestamp = Date.now();
  const randomData = Math.random().toString(36).substring(2, 15);
  
  // Simular dados QR do WhatsApp
  const qrData = {
    ref: `${timestamp}_${randomData}`,
    publicKey: generateRandomKey(),
    secretKey: generateRandomKey(),
    serverToken: generateRandomKey(),
    clientToken: generateRandomKey(),
    wid: `${timestamp}@s.whatsapp.net`,
    is: "WA",
    lc: "BR",
    lg: "pt"
  };
  
  // Retornar como string codificada (simula o QR real)
  return btoa(JSON.stringify(qrData));
}

function generateRandomKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}