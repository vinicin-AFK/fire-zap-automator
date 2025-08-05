import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectSocketIO = useCallback((sessionId?: string) => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    console.log('🔄 Conectando ao Socket.IO do WhatsApp...');

    try {
      const socketUrl = "wss://fuohmclakezkvgaiarao.functions.supabase.co/functions/v1/whatsapp-websocket";
      const socket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: false,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Conectado ao servidor WebSocket!');
        setState(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true,
          error: null,
        }));
        reconnectAttempts.current = 0;
      });

      socket.on('disconnect', () => {
        console.warn('⚠️ Desconectado do servidor WebSocket');
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false,
        }));
        attemptReconnect();
      });

      socket.on('connect_error', (error: any) => {
        console.error('❌ Erro de conexão com WebSocket:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: error.message || 'Erro de conexão',
        }));
        attemptReconnect();
      });

      socket.on('qr', (qrCode: string) => {
        console.log('📷 QR Code recebido');
        setState(prev => ({
          ...prev,
          qrCode,
          connectionStatus: 'qr_ready',
        }));
      });

      socket.on('ready', (sessionId: string) => {
        console.log('🤖 Sessão WhatsApp pronta');
        setState(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true,
          sessionId,
          qrCode: null,
        }));
      });

      socket.on('error', (error: any) => {
        console.error('Erro recebido do servidor:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: typeof error === 'string' ? error : JSON.stringify(error),
        }));
      });

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
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
      }
    };
  }, [connectSocketIO]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
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