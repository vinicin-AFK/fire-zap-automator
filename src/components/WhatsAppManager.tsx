import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useHybridAPI } from "@/hooks/useHybridAPI";
import { Smartphone, Send, Zap, MessageSquare, Activity } from "lucide-react";

interface WhatsAppConnection {
  id: string;
  type: 'personal' | 'business';
  number: string;
  status: 'connected' | 'disconnected' | 'connecting';
  messages_sent: number;
}

const WhatsAppManager = () => {
  const { toast } = useToast();
  const {
    createPersonalSession,
    sendPersonalMessage,
    sendBusinessMessage,
    getSessionStatus
  } = useHybridAPI();

  const [activeTab, setActiveTab] = useState("personal");
  const [sessionId, setSessionId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);

  const handleCreateSession = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Erro",
        description: "Informe um ID para a sessão",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createPersonalSession(sessionId);
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Sessão criada com sucesso! Use WhatsApp Web para conectar.",
        });
        
        // Adicionar à lista de conexões
        const newConnection: WhatsAppConnection = {
          id: sessionId,
          type: 'personal',
          number: `Session: ${sessionId}`,
          status: 'connecting',
          messages_sent: 0
        };
        setConnections(prev => [...prev, newConnection]);
        setSessionId("");
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao criar sessão",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar sessão",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast({
        title: "Erro",
        description: "Informe o número e a mensagem",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (activeTab === "personal") {
        if (!sessionId.trim()) {
          toast({
            title: "Erro",
            description: "Informe o ID da sessão para envio pessoal",
            variant: "destructive"
          });
          return;
        }
        result = await sendPersonalMessage(sessionId, phoneNumber, message);
      } else {
        result = await sendBusinessMessage(phoneNumber, message);
      }

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Mensagem enviada com sucesso!",
        });
        setMessage("");
        setPhoneNumber("");
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao enviar mensagem",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSessionStatus = async (sessionId: string) => {
    try {
      const result = await getSessionStatus(sessionId);
      if (result.success) {
        toast({
          title: "Status da Sessão",
          description: `Status: ${result.data?.status || 'Verificando...'}`,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-fire bg-clip-text text-transparent mb-2">
            Gerenciador WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões WhatsApp sem QR Code
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connections.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connections.reduce((total, conn) => total + conn.messages_sent, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Conexões WhatsApp
            </CardTitle>
            <CardDescription>
              Crie sessões e envie mensagens sem precisar escanear QR Code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">Pessoal (Baileys)</TabsTrigger>
                <TabsTrigger value="business">Business (Meta API)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-id">ID da Sessão</Label>
                    <Input
                      id="session-id"
                      placeholder="Ex: usuario-001"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleCreateSession}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Criando..." : "Criar Sessão"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="business" className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    WhatsApp Business API
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Use a API oficial do WhatsApp Business para envios em massa e automação empresarial.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Enviar Mensagem</h3>
              
              {activeTab === "personal" && (
                <div className="space-y-2">
                  <Label htmlFor="session-send">ID da Sessão</Label>
                  <Input
                    id="session-send"
                    placeholder="ID da sessão para envio"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Input
                    id="message"
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSendMessage}
                disabled={loading}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {loading ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connections List */}
        {connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suas Conexões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{connection.number}</p>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {connection.type === 'personal' ? 'Pessoal' : 'Business'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={connection.status === 'connected' ? 'default' : 'secondary'}
                      >
                        {connection.status === 'connected' ? 'Conectado' : 
                         connection.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkSessionStatus(connection.id)}
                      >
                        Verificar Status
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WhatsAppManager;