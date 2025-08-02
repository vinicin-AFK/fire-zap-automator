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
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.host;
      const socketUrl = `${protocol}//${host}/functions/v1/whatsapp-socketio`;
      
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

      socketRef.current.on('qr', (qrCode: string) => {
        console.log('📨 QR Code recebido via Socket.IO');
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
          isConnected: true
        }));
      });

      socketRef.current.on('authenticated', (data: any) => {
        console.log('📨 Autenticado via Socket.IO:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'connected',
          isConnected: true
        }));
      });

      socketRef.current.on('auth_failure', (data: any) => {
        console.log('📨 Falha na autenticação via Socket.IO:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Falha na autenticação'
        }));
      });

      socketRef.current.on('disconnected', (data: any) => {
        console.log('📨 Desconectado via Socket.IO:', data);
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false,
          qrCode: null
        }));
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