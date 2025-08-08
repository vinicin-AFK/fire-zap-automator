import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { QrCode, Smartphone, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppQRConnectProps {
  sessionId?: string;
  onConnectionSuccess?: () => void;
}

export function WhatsAppQRConnect({ 
  sessionId = "default-session", 
  onConnectionSuccess 
}: WhatsAppQRConnectProps) {
  const { toast } = useToast();
  const {
    qrCode,
    connectionStatus,
    isConnected,
    connectToWhatsApp,
    disconnect,
    reconnect,
    error
  } = useWhatsAppRealtime();

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isConnected && onConnectionSuccess) {
      onConnectionSuccess();
      toast({
        title: "✅ Conectado com sucesso!",
        description: "Seu WhatsApp está conectado e pronto para uso.",
      });
    }
  }, [isConnected, onConnectionSuccess, toast]);

  useEffect(() => {
    if (error) {
      toast({
        title: "❌ Erro na conexão",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectToWhatsApp(sessionId);
    } catch (error) {
      console.error("Erro ao conectar:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsConnecting(false);
  };

  const handleReconnect = () => {
    reconnect();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'qr_ready': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'qr_ready': return 'QR Code Pronto';
      case 'error': return 'Erro';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
            🔥 Conectar WhatsApp
            <Smartphone className="h-6 w-6" />
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp usando QR Code para começar a automação
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status da Conexão */}
          <div className="flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className="text-sm"
            >
              {getStatusText()}
            </Badge>
          </div>

          {/* Conteúdo Principal */}
          <div className="text-center space-y-4">
            {isConnected ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">
                  ✅ Conectado com sucesso!
                </h3>
                <p className="text-muted-foreground">
                  Seu WhatsApp está conectado e pronto para automação
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleDisconnect} variant="outline">
                    Desconectar
                  </Button>
                  <Button onClick={handleReconnect} variant="ghost">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconectar
                  </Button>
                </div>
              </div>
            ) : qrCode && connectionStatus === 'qr_ready' ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <QrCode className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">
                  📱 Escaneie o QR Code abaixo:
                </h3>
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                      alt="QR Code para conectar WhatsApp"
                      className="w-64 h-64 mx-auto"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        // Fallback se a API externa falhar
                        console.log('Erro ao carregar QR externo, usando dados diretos');
                        e.currentTarget.src = `data:image/svg+xml;base64,${btoa(`
                          <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
                            <rect width="300" height="300" fill="white"/>
                            <text x="150" y="150" text-anchor="middle" font-size="16" fill="black">
                              QR Code gerado
                            </text>
                          </svg>
                        `)}`;
                      }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>1. Abra o WhatsApp no seu celular</p>
                  <p>2. Vá em Menu (⋮) → Dispositivos conectados</p>
                  <p>3. Toque em "Conectar um dispositivo"</p>
                  <p>4. Escaneie este QR Code</p>
                </div>
                <Button onClick={handleReconnect} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar QR Code
                </Button>
              </div>
            ) : connectionStatus === 'connecting' || isConnecting ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">
                  Estabelecendo conexão...
                </h3>
                <p className="text-muted-foreground">
                  Aguarde enquanto conectamos com o WhatsApp
                </p>
              </div>
            ) : connectionStatus === 'error' ? (
              <div className="space-y-4">
                <div className="text-red-500 text-center">
                  <h3 className="text-lg font-semibold">❌ Erro na conexão</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {error || "Erro desconhecido ao conectar"}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleConnect} variant="outline">
                    Tentar novamente
                  </Button>
                  <Button onClick={handleReconnect} variant="ghost">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Smartphone className="h-16 w-16 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold">
                  WhatsApp Desconectado
                </h3>
                <p className="text-muted-foreground">
                  Clique no botão abaixo para iniciar a conexão
                </p>
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="w-full max-w-xs mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Informações Adicionais */}
          {!isConnected && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <h4 className="font-medium mb-2">💡 Dica importante:</h4>
              <p>
                Mantenha seu celular conectado à internet durante todo o processo. 
                A conexão é estabelecida através do WhatsApp Web.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}