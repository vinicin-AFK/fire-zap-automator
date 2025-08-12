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
      const backendUrl = 'https://fire-zap-automator-production-d511.up.railway.app';
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

  // Socket.IO para atualizações real-time
  const connectWebSocket = () => {
    const socketUrl = 'https://fire-zap-automator-production-d511.up.railway.app';
    
    const socket: Socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    });
    
    socket.on('connect', () => {
      console.log('🔗 Socket.IO conectado');
      socket.emit('message', {
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('message', (data: any) => {
      try {
        console.log('📨 Mensagem Socket.IO recebida:', data);
        
        // Emitir eventos customizados para componentes ouvirem
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

  return {
    createPersonalSession,
    connectPersonalSession,
    sendPersonalMessage,
    sendBusinessMessage,
    getSessionStatus,
    connectWebSocket,
    validateNumber
  };
};