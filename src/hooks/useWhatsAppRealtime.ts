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

  const connectSocketIO = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔄 Conectando ao Socket.IO WhatsApp...');
    
    try {
      const socketUrl = "https://fuohmclakezkvgaiarao.functions.supabase.co/hybrid-socketio";
      console.log('🔗 Conectando na URL:', socketUrl);
      
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        timeout: 10000
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket.IO WhatsApp conectado com sucesso');
        reconnectAttempts.current = 0;
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'connecting',
          error: null 
        }));
      });

      socketRef.current.on('qr', (qrImage: string) => {
        console.log('📱 QR Code recebido:', qrImage ? 'QR recebido com sucesso' : 'QR vazio');
        setState(prev => ({
          ...prev,
          qrCode: qrImage,
          connectionStatus: 'qr_ready'
        }));
      });

      socketRef.current.on('ready', (data: any) => {
        console.log('📨 WhatsApp pronto:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true,
          qrCode: null,
          sessionId: data?.sessionId || null
        }));
      });

      socketRef.current.on('message', (data: any) => {
        console.log('📨 Mensagem recebida:', data);
        if (data?.type === 'status') {
          console.log('ℹ️ Status:', data.message);
        }
      });

      socketRef.current.on('error', (error: any) => {
        console.error('❌ Erro Socket.IO:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: error?.message || 'Erro de conexão Socket.IO'
        }));
      });

      socketRef.current.on('connect_error', (error: any) => {
        console.error('❌ Erro de conexão Socket.IO:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: `Falha ao conectar: ${error?.message || 'Erro desconhecido'}`
        }));
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('❌ Socket.IO desconectado:', reason);
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false
        }));

        // Tentar reconectar se não foi desconexão intencional
        if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocketIO();
          }, 2000 * reconnectAttempts.current);
        }
      });

    } catch (error) {
      console.error('❌ Erro ao criar Socket.IO:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: 'Erro ao conectar Socket.IO'
      }));
    }
  }, []);

  const connectToWhatsApp = useCallback(async (phoneNumber: string) => {
    console.log('🔄 Iniciando conexão WhatsApp para:', phoneNumber);
    
    try {
      connectSocketIO();
      console.log('✅ Socket.IO iniciado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: error.message || 'Erro inesperado'
      }));
    }
  }, [connectSocketIO]);

  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando Socket.IO WhatsApp...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
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
        socketRef.current.disconnect();
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
    reconnect: connectSocketIO,
  };
};