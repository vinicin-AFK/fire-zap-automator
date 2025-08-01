import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simula funcionamento do Baileys para sessions pessoais
const sessions = new Map();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, action, number, message } = await req.json();

    switch (action) {
      case 'create':
        return await createSession(sessionId);
      case 'connect':
        return await connectSession(sessionId);
      case 'send':
        return await sendMessage(sessionId, number, message);
      case 'status':
        return await getStatus(sessionId);
      default:
        return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Erro no baileys-session:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createSession(sessionId: string) {
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Informe sessionId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sessionData = {
    id: sessionId,
    connected: false,
    qr: generateSimulatedQR(sessionId),
    createdAt: new Date().toISOString(),
    type: 'personal'
  };

  sessions.set(sessionId, sessionData);
  console.log(`✅ Sessão pessoal criada: ${sessionId}`);

  return new Response(JSON.stringify({
    success: true,
    session: sessionData
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function connectSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Simula conexão após 3 segundos
  setTimeout(() => {
    session.connected = true;
    session.qr = null;
    sessions.set(sessionId, session);
    console.log(`🔗 Sessão ${sessionId} conectada!`);
  }, 3000);

  return new Response(JSON.stringify({
    success: true,
    message: 'Conectando...',
    session
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendMessage(sessionId: string, number: string, message: string) {
  const session = sessions.get(sessionId);
  if (!session || !session.connected) {
    return new Response(JSON.stringify({ error: 'Sessão não conectada' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`📱 Enviando mensagem pessoal via ${sessionId} para ${number}: ${message}`);

  return new Response(JSON.stringify({
    success: true,
    messageId: `msg_${Date.now()}`,
    to: number,
    message,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getStatus(sessionId: string) {
  const session = sessions.get(sessionId);
  
  return new Response(JSON.stringify({
    session: session || null,
    exists: !!session
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateSimulatedQR(sessionId: string): string {
  // Gera um QR code simulado para demonstração
  const qrData = `firezap://connect/${sessionId}/${Date.now()}`;
  return btoa(qrData);
}