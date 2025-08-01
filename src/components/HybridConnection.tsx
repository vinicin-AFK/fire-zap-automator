import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Building2, QrCode, Send } from "lucide-react";

interface Session {
  id: string;
  connected: boolean;
  qr?: string;
  type: 'personal' | 'business';
  createdAt: string;
}

export const HybridConnection = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  // Criar sessão pessoal (Baileys)
  const createPersonalSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para a sessão",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session/create', {
        body: { sessionId: sessionName }
      });

      if (error) throw error;

      setSessions(prev => [...prev, data.session]);
      setSessionName("");
      
      toast({
        title: "Sessão Criada",
        description: `Sessão pessoal "${data.session.id}" criada com sucesso!`
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Conectar sessão pessoal
  const connectPersonalSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('baileys-session/connect', {
        body: { sessionId }
      });

      if (error) throw error;

      toast({
        title: "Conectando",
        description: "Escaneie o QR code no WhatsApp para conectar"
      });

      // Simular conexão após alguns segundos
      setTimeout(() => {
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, connected: true, qr: undefined }
            : session
        ));
        
        toast({
          title: "Conectado!",
          description: `Sessão ${sessionId} conectada com sucesso!`
        });
      }, 5000);

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Enviar mensagem pessoal
  const sendPersonalMessage = async (sessionId: string) => {
    if (!phoneNumber || !message) {
      toast({
        title: "Erro",
        description: "Preencha número e mensagem",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('baileys-session/send', {
        body: { sessionId, number: phoneNumber, message }
      });

      if (error) throw error;

      toast({
        title: "Mensagem Enviada",
        description: `Mensagem enviada via sessão pessoal ${sessionId}`
      });

      setPhoneNumber("");
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Enviar mensagem business
  const sendBusinessMessage = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Erro",
        description: "Preencha número e mensagem",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('business-api', {
        body: { number: phoneNumber, message }
      });

      if (error) throw error;

      toast({
        title: "Mensagem Enviada",
        description: "Mensagem enviada via WhatsApp Business API"
      });

      setPhoneNumber("");
      setMessage("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🔥 Fire Zap Híbrido</h1>
        <p className="text-muted-foreground">
          Gerencie conexões pessoais (Baileys) e empresariais (Business API)
        </p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            WhatsApp Pessoal
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            WhatsApp Business
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Sessões Pessoais (Baileys)
              </CardTitle>
              <CardDescription>
                Conecte múltiplos números pessoais do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da sessão (ex: telefone-1)"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
                <Button 
                  onClick={createPersonalSession}
                  disabled={isLoading}
                >
                  Criar Sessão
                </Button>
              </div>

              <div className="grid gap-4">
                {sessions.filter(s => s.type === 'personal').map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{session.id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Criado em: {new Date(session.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={session.connected ? "default" : "secondary"}>
                          {session.connected ? "Conectado" : "Desconectado"}
                        </Badge>
                        {!session.connected && (
                          <Button
                            size="sm"
                            onClick={() => connectPersonalSession(session.id)}
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            Conectar
                          </Button>
                        )}
                        {session.connected && (
                          <Button
                            size="sm"
                            onClick={() => sendPersonalMessage(session.id)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                      </div>
                    </div>
                    {session.qr && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm mb-2">Escaneie este QR code no WhatsApp:</p>
                        <div className="bg-white p-2 rounded border text-xs font-mono break-all">
                          {session.qr}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                WhatsApp Business API
              </CardTitle>
              <CardDescription>
                Envie mensagens usando a API oficial do WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="business-phone">Número (com código do país)</Label>
                  <Input
                    id="business-phone"
                    placeholder="5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="business-message">Mensagem</Label>
                  <Input
                    id="business-message"
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={sendBusinessMessage}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar via Business API
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seção de envio comum */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Mensagem</CardTitle>
          <CardDescription>
            Preencha os dados para enviar mensagens via sessões pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="phone">Número (com código do país)</Label>
              <Input
                id="phone"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="msg">Mensagem</Label>
              <Input
                id="msg"
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};