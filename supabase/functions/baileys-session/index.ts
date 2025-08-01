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
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (req.method === 'POST' && action === 'create') {
      const { sessionId } = await req.json();
      
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Informe sessionId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Simula criação de sessão Baileys
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

    if (req.method === 'POST' && action === 'connect') {
      const { sessionId } = await req.json();
      
      const session = sessions.get(sessionId);
      if (!session) {
        return new Response(JSON.stringify({ error: 'Sessão não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Simula conexão bem-sucedida após 3 segundos
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

    if (req.method === 'POST' && action === 'send') {
      const { sessionId, number, message } = await req.json();
      
      const session = sessions.get(sessionId);
      if (!session || !session.connected) {
        return new Response(JSON.stringify({ error: 'Sessão não conectada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`📱 Enviando mensagem pessoal via ${sessionId} para ${number}: ${message}`);

      // Simula envio de mensagem
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

    if (req.method === 'GET' && action === 'status') {
      const sessionId = url.searchParams.get('sessionId');
      const session = sessions.get(sessionId);
      
      return new Response(JSON.stringify({
        session: session || null,
        exists: !!session
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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

function generateSimulatedQR(sessionId: string): string {
  // Gera um QR code simulado para demonstração
  const qrData = `firezap://connect/${sessionId}/${Date.now()}`;
  return btoa(qrData);
}