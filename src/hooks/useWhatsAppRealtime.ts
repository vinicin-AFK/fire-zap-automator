import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

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
      const wsUrl = "wss://fire-zap-automator-production.up.railway.app";
      console.log('🔗 Conectando na URL:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket WhatsApp conectado com sucesso');
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
          console.log('📨 Mensagem recebida:', data);

          switch (data.type) {
            case 'qr':
              console.log('📱 QR Code recebido');
              setState(prev => ({
                ...prev,
                qrCode: data.qr,
                connectionStatus: 'qr_ready'
              }));
              break;

            case 'authenticated':
              console.log('🔐 WhatsApp autenticado');
              setState(prev => ({
                ...prev,
                connectionStatus: 'connected',
                isConnected: true,
                qrCode: null,
                sessionId: data.sessionId
              }));
              break;

            case 'status':
              console.log('ℹ️ Status:', data.message);
              setState(prev => ({
                ...prev,
                connectionStatus: 'connecting'
              }));
              break;

            default:
              console.log('📨 Tipo de mensagem:', data.type);
          }
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: 'Erro de conexão WebSocket'
        }));
      };

      wsRef.current.onclose = (event) => {
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
      
      // Aguardar conexão WebSocket
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'connect',
            phoneNumber: phoneNumber
          }));
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao conectar WhatsApp:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Erro inesperado'
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
      wsRef.current.close(1000, 'User disconnected');
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
      if (wsRef.current) {
        wsRef.current.close();
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