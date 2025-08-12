import { supabase } from "@/integrations/supabase/client";
import { io, Socket } from 'socket.io-client';

// Hook para gerenciar sessões híbridas do Fire Zap
export const useHybridAPI = () => {
  
  // Criar sessão pessoal (Baileys)
  const createPersonalSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session', {
        body: { sessionId, action: 'create' }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar sessão pessoal:', error);
      return { success: false, error: error.message };
    }
  };

  // Conectar sessão pessoal
  const connectPersonalSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session', {
        body: { sessionId, action: 'connect' }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao conectar sessão pessoal:', error);
      return { success: false, error: error.message };
    }
  };

  // Enviar mensagem pessoal (Baileys)
  const sendPersonalMessage = async (sessionId: string, number: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session', {
        body: { sessionId, number, message, action: 'send' }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar mensagem pessoal:', error);
      return { success: false, error: error.message };
    }
  };

  // Enviar mensagem business (Meta API)
  const sendBusinessMessage = async (number: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('business-api', {
        body: { number, message }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar mensagem business:', error);
      return { success: false, error: error.message };
    }
  };

  // Obter status da sessão
  const getSessionStatus = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session', {
        body: { sessionId, action: 'status' }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Erro ao obter status da sessão:', error);
      return { success: false, error: error.message };
    }
  };

  // Validar se número existe no WhatsApp (via backend híbrido)
  const validateNumber = async (sessionId: string, number: string) => {
    try {
      const backendUrl = 'https://fire-zap-automator-production.up.railway.app';
      const res = await fetch(`${backendUrl}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, number })
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        const msg = json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return { success: true, data: json };
    } catch (error: any) {
      console.error('Erro ao validar número:', error);
      return { success: false, error: error.message };
    }
  };

  // Socket.IO e integrações REST com backend híbrido Fire Zap
  const API = 'https://fire-zap-automator-production.up.railway.app';

  // Conectar Socket.IO no namespace /wpp e, opcionalmente, assinar uma sessão
  const connectWebSocket = (sessionId?: string) => {
    const socket: Socket = io(`${API}/wpp`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      console.log('🔗 Socket.IO conectado (namespace /wpp)');
      if (sessionId) {
        socket.emit('subscribe', { sessionId });
      }
    });

    // Eventos esperados pelo backend híbrido
    socket.on('qr', (payload: any) => {
      try {
        window.dispatchEvent(new CustomEvent('hybrid-update', { detail: { type: 'qr', ...payload } }));
      } catch (error) {
        console.error('Erro ao processar evento qr:', error);
      }
    });

    socket.on('status', (payload: any) => {
      try {
        window.dispatchEvent(new CustomEvent('hybrid-update', { detail: { type: 'status', ...payload } }));
      } catch (error) {
        console.error('Erro ao processar evento status:', error);
      }
    });

    // Fallback para servidores antigos que enviam "message"
    socket.on('message', (data: any) => {
      try {
        console.log('📨 Mensagem Socket.IO recebida:', data);
        window.dispatchEvent(new CustomEvent('hybrid-update', { detail: data }));
      } catch (error) {
        console.error('Erro ao processar mensagem Socket.IO:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado');
    });

    socket.on('connect_error', (error) => {
      console.error('Erro no Socket.IO:', error);
    });

    return socket;
  };

  // Criar/garantir sessão híbrida via REST
  const createHybridSession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API}/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      return { success: true, data };
    } catch (error: any) {
      console.error('Erro ao criar sessão híbrida:', error);
      return { success: false, error: error.message };
    }
  };

  // Aquecimento: bot → target
  const startWarmupBot = async (
    sessionId: string,
    target: string,
    scriptName: string = 'default',
    pace: 'slow' | 'normal' | 'fast' = 'slow'
  ) => {
    try {
      const res = await fetch(`${API}/api/warmup/bot/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, target, scriptName, pace }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error: any) {
      console.error('Erro ao iniciar warmup bot:', error);
      return { success: false, error: error.message };
    }
  };

  // Aquecimento: sessão A ↔ sessão B (n2n)
  const startWarmupN2N = async (
    a: string,
    b: string,
    rounds: number = 6,
    pace: 'slow' | 'normal' | 'fast' = 'normal'
  ) => {
    try {
      const res = await fetch(`${API}/api/warmup/n2n/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a, b, rounds, pace }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);
      return { success: true, data: json };
    } catch (error: any) {
      console.error('Erro ao iniciar warmup n2n:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    createPersonalSession,
    connectPersonalSession,
    sendPersonalMessage,
    sendBusinessMessage,
    getSessionStatus,
    connectWebSocket,
    validateNumber,
    // Novos helpers híbridos
    createHybridSession,
    startWarmupBot,
    startWarmupN2N,
  };
};