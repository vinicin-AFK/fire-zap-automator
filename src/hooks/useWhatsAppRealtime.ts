import { useState, useEffect, useCallback, useRef } from 'react';

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

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🔄 Conectando ao WebSocket WhatsApp...');
    
    try {
      const wsUrl = "wss://fuohmclakezkvgaiarao.functions.supabase.co/functions/v1/whatsapp-socketio";
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('✅ WebSocket WhatsApp conectado');
        reconnectAttempts.current = 0;
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'connecting',
          error: null 
        }));
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensagem WebSocket recebida:', data);

          switch (data.type) {
            case 'qr':
              console.log('📱 QR Code recebido:', data.data);
              setState(prev => ({
                ...prev,
                qrCode: data.data,
                connectionStatus: 'qr_ready'
              }));
              break;

            case 'ready':
              console.log('📨 WhatsApp pronto:', data.data);
              setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                isConnected: true,
                qrCode: null,
                sessionId: data.data?.sessionId || null
              }));
              break;

            case 'message':
              console.log('📨 Mensagem recebida:', data.data);
              if (data.data?.type === 'status') {
                console.log('ℹ️ Status:', data.data.message);
              }
              break;

            case 'error':
              console.error('📨 Erro recebido:', data.data);
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                error: data.data?.message || 'Erro desconhecido'
              }));
              break;

            default:
              console.log('Tipo de mensagem desconhecido:', data.type);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log('❌ WebSocket desconectado:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false
        }));

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 2000 * reconnectAttempts.current);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ Erro no WebSocket:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Erro de conexão WebSocket'
        }));
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
      connectWebSocket();
      console.log('✅ WebSocket iniciado com sucesso');
      
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

    if (socketRef.current) {
      socketRef.current.close(1000, 'Desconexão manual');
      socketRef.current = null;
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
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connectToWhatsApp,
    disconnect,
    reconnect: connectWebSocket,
  };
};