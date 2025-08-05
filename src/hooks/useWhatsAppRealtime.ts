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

  const connectSocketIO = useCallback((sessionId?: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    console.log('🔄 Conectando ao WebSocket do WhatsApp...');

    try {
      const socketUrl = "wss://fuohmclakezkvgaiarao.functions.supabase.co/functions/v1/whatsapp-websocket";
      const socket = new WebSocket(socketUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ Conectado ao servidor WebSocket!');
        setState(prev => ({
          ...prev,
          connectionStatus: 'connecting',
          error: null,
        }));
        reconnectAttempts.current = 0;
      };

      socket.onclose = () => {
        console.warn('⚠️ Desconectado do servidor WebSocket');
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false,
        }));
        attemptReconnect();
      };

      socket.onerror = (error: any) => {
        console.error('❌ Erro de conexão com WebSocket:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Erro de conexão com o WebSocket',
        }));
        attemptReconnect();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensagem recebida:', data);

          switch (data.type) {
            case 'qr':
              console.log('📷 QR Code recebido');
              setState(prev => ({
                ...prev,
                qrCode: data.qrCode,
                connectionStatus: 'qr_ready',
              }));
              break;

            case 'ready':
              console.log('🤖 Sessão WhatsApp pronta');
              setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                isConnected: true,
                sessionId: data.sessionId,
                qrCode: null,
              }));
              break;

            case 'status':
              console.log('📊 Status recebido:', data.message);
              setState(prev => ({
                ...prev,
                connectionStatus: data.status || 'connecting',
              }));
              break;

            case 'error':
              console.error('🚨 Erro do servidor:', data.message);
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                error: data.message,
              }));
              break;

            default:
              console.log('❓ Tipo de mensagem desconhecido:', data.type);
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      };

    } catch (error: any) {
      console.error('Erro inesperado ao conectar:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: error.message || 'Erro inesperado',
      }));
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('🚫 Número máximo de tentativas de reconexão atingido.');
      return;
    }

    reconnectAttempts.current += 1;
    const delay = 3000;

    console.log(`🔁 Tentando reconectar em ${delay / 1000} segundos... (${reconnectAttempts.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectSocketIO();
    }, delay);
  }, [connectSocketIO]);

  useEffect(() => {
    connectSocketIO();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectSocketIO]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      socketRef.current.close();
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

  return {
    ...state,
    connectToWhatsApp: connectSocketIO,
    disconnect,
    reconnect: connectSocketIO,
  };
};