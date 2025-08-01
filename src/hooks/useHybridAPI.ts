import { supabase } from "@/integrations/supabase/client";

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
    } catch (error) {
      console.error('Erro ao obter status da sessão:', error);
      return { success: false, error: error.message };
    }
  };

  // WebSocket para atualizações real-time
  const connectWebSocket = () => {
    const projectId = 'fuohmclakezkvgaiarao';
    const wsUrl = `wss://${projectId}.functions.supabase.co/functions/v1/hybrid-websocket`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('🔗 WebSocket conectado');
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Mensagem WebSocket recebida:', data);
        
        // Emitir eventos customizados para componentes ouvirem
        window.dispatchEvent(new CustomEvent('hybrid-update', { detail: data }));
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('❌ WebSocket desconectado');
      // Reconectar após 3 segundos
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };
    
    return ws;
  };

  return {
    createPersonalSession,
    connectPersonalSession,
    sendPersonalMessage,
    sendBusinessMessage,
    getSessionStatus,
    connectWebSocket
  };
};