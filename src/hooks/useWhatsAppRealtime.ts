import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppRealtimeState {
  qrCode: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'qr_ready' | 'error';
  isConnected: boolean;
  sessionId: string | null;
  error: string | null;
}

export const useWhatsAppRealtime = () => {
  const [state, setState] = useState<WhatsAppRealtimeState>({
    qrCode: null,
    connectionStatus: 'disconnected',
    isConnected: false,
    sessionId: null,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🔄 Conectando ao WebSocket WhatsApp...');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/functions/v1/whatsapp-realtime`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket WhatsApp conectado');
        reconnectAttempts.current = 0;
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'connecting',
          error: null 
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensagem WebSocket WhatsApp:', data);

          switch (data.type) {
            case 'qr':
              setState(prev => ({
                ...prev,
                qrCode: data.qr,
                connectionStatus: 'qr_ready',
                sessionId: data.sessionId
              }));
              break;

            case 'authenticated':
              setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                isConnected: true
              }));
              break;

            case 'auth_failure':
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                error: 'Falha na autenticação'
              }));
              break;

            case 'disconnected':
              setState(prev => ({
                ...prev,
                connectionStatus: 'disconnected',
                isConnected: false,
                qrCode: null
              }));
              break;

            case 'error':
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                error: data.message || 'Erro desconhecido'
              }));
              break;
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem WebSocket:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Erro no WebSocket WhatsApp:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Erro de conexão WebSocket'
        }));
      };

      wsRef.current.onclose = (event) => {
        console.log('❌ WebSocket WhatsApp desconectado:', event.code, event.reason);
        
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false
        }));

        // Auto-reconnect logic
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectAttempts.current++;
          
          console.log(`🔄 Tentando reconectar em ${timeout}ms (tentativa ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, timeout);
        }
      };

    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: 'Erro ao conectar WebSocket'
      }));
    }
  }, []);

  const connectToWhatsApp = useCallback(async (phoneNumber: string) => {
    console.log('🔄 Iniciando conexão WhatsApp para:', phoneNumber);
    
    try {
      // Primeiro conecta o WebSocket
      connectWebSocket();

      // Depois invoca a função Edge para iniciar a sessão
      const { data, error } = await supabase.functions.invoke('whatsapp-realtime', {
        body: { 
          action: 'connect',
          phoneNumber: phoneNumber 
        }
      });

      if (error) {
        console.error('❌ Erro ao invocar função WhatsApp:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: error.message || 'Erro ao conectar'
        }));
        return;
      }

      console.log('✅ Função WhatsApp invocada com sucesso:', data);
      
    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: error.message || 'Erro inesperado'
      }));
    }
  }, [connectWebSocket]);

  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando WebSocket WhatsApp...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      qrCode: null,
      connectionStatus: 'disconnected',
      isConnected: false,
      sessionId: null,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connectToWhatsApp,
    disconnect,
    reconnect: connectWebSocket,
  };
};