import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔄 Conectando ao Socket.IO WhatsApp...');
    
    try {
      const socketUrl = "https://fuohmclakezkvgaiarao.functions.supabase.co/functions/v1/whatsapp-socketio";
      
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket.IO WhatsApp conectado');
        reconnectAttempts.current = 0;
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'connecting',
          error: null 
        }));
      });

      // Escuta eventos específicos emitidos pelo servidor
      socketRef.current.on('qr', (qrCode: string) => {
        console.log('📱 QR Code recebido via Socket.IO:', qrCode);
        setState(prev => ({
          ...prev,
          qrCode: qrCode,
          connectionStatus: 'qr_ready'
        }));
      });

      socketRef.current.on('ready', (data: any) => {
        console.log('📨 WhatsApp pronto via Socket.IO:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true,
          qrCode: null
        }));
      });

      socketRef.current.on('message', (data: any) => {
        console.log('📨 Mensagem Socket.IO recebida:', data);
        
        if (data.data?.type === 'status') {
          console.log('ℹ️ Status:', data.data.message);
        }
      });

      socketRef.current.on('error', (data: any) => {
        console.error('📨 Erro via Socket.IO:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: data.message || 'Erro desconhecido'
        }));
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Erro de conexão Socket.IO:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Erro de conexão Socket.IO'
        }));
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket.IO desconectado:', reason);
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false
        }));
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
      // Apenas conecta o WebSocket - não precisa de requisição HTTP separada
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
    reconnect: connectWebSocket,
  };
};