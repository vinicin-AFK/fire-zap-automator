import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Flame, Bot, MessageCircle, Play, Square, Clock } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  connected: boolean;
  messages_count: number;
  last_activity: string | null;
}

interface Message {
  id: string;
  content: string;
  from_chip_id: string;
  to_chip_id: string;
  sent_at: string;
  status: string;
}

const Heating = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedChip, setSelectedChip] = useState<string>("");
  const [heatingMode, setHeatingMode] = useState<"bot" | "chip" | "">("");
  const [targetChip, setTargetChip] = useState<string>("");
  const [isHeating, setIsHeating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [heatingInterval, setHeatingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadChips();
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (heatingInterval) {
        clearInterval(heatingInterval);
      }
    };
  }, [navigate]);

  const loadChips = async () => {
    try {
      const { data, error } = await supabase
        .from("chips")
        .select("*")
        .eq("connected", true)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar chips conectados.",
          variant: "destructive",
        });
      } else {
        setChips(data || []);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar chips.",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar mensagens.",
          variant: "destructive",
        });
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const sendMessageToBot = async (chipId: string, message: string) => {
    const chip = chips.find(c => c.id === chipId);
    if (!chip) return;

    try {
      const response = await supabase.functions.invoke('whatsapp-bot', {
        body: { 
          message: message,
          chipName: chip.name 
        }
      });

      if (response.error) {
        console.error('Erro ao chamar bot:', response.error);
        return;
      }

      const botResponse = response.data?.response || "Olá! 👋";
      
      // Salvar mensagem do chip para o bot
      await supabase.from("messages").insert({
        user_id: user?.id,
        from_chip_id: chipId,
        to_chip_id: "bot",
        content: message,
        status: "sent"
      });

      // Simular resposta do bot após um delay
      setTimeout(async () => {
        await supabase.from("messages").insert({
          user_id: user?.id,
          from_chip_id: "bot",
          to_chip_id: chipId,
          content: botResponse,
          status: "sent"
        });

        // Atualizar contador de mensagens
        await supabase
          .from("chips")
          .update({ 
            messages_count: chip.messages_count + 1,
            last_activity: new Date().toISOString()
          })
          .eq("id", chipId);

        loadMessages();
        loadChips();
      }, Math.random() * 3000 + 1000); // Delay de 1-4 segundos

    } catch (error) {
      console.error("Erro ao enviar mensagem para bot:", error);
    }
  };

  const sendMessageBetweenChips = async (fromChipId: string, toChipId: string) => {
    const fromChip = chips.find(c => c.id === fromChipId);
    const toChip = chips.find(c => c.id === toChipId);
    
    if (!fromChip || !toChip) return;

    const conversations = [
      "Oi! Como você está?",
      "Tudo bem por aí? 😊",
      "E aí, como foram as vendas hoje?",
      "Bom dia! Pronto para mais um dia?",
      "Opa! Viu as novidades?",
      "Olá! Como está o movimento hoje?",
      "Ei! Tudo certo com você?",
      "Fala! Como estão as coisas?",
      "Oi! Preparado para trabalhar? 💪",
      "Salve! Qual é a boa de hoje?"
    ];

    const responses = [
      "Oi! Tudo ótimo por aqui! E você? 😄",
      "Tudo tranquilo! Obrigado por perguntar 👍",
      "Bem corrido, mas no controle! 🚀",
      "Bom dia! Sempre pronto! ☀️",
      "Vi sim! Muito bom! 🔥",
      "Movimento bom hoje! E por aí?",
      "Tudo certo! Obrigado! 😊",
      "Tudo bem! Trabalhando firme! 💼",
      "Sempre preparado! Vamos que vamos! 🎯",
      "A boa é trabalhar! E você? 😎"
    ];

    try {
      const message = conversations[Math.floor(Math.random() * conversations.length)];
      const response = responses[Math.floor(Math.random() * responses.length)];

      // Enviar mensagem do primeiro chip
      await supabase.from("messages").insert({
        user_id: user?.id,
        from_chip_id: fromChipId,
        to_chip_id: toChipId,
        content: message,
        status: "sent"
      });

      // Simular resposta do segundo chip
      setTimeout(async () => {
        await supabase.from("messages").insert({
          user_id: user?.id,
          from_chip_id: toChipId,
          to_chip_id: fromChipId,
          content: response,
          status: "sent"
        });

        // Atualizar contadores
        await Promise.all([
          supabase
            .from("chips")
            .update({ 
              messages_count: fromChip.messages_count + 1,
              last_activity: new Date().toISOString()
            })
            .eq("id", fromChipId),
          supabase
            .from("chips")
            .update({ 
              messages_count: toChip.messages_count + 1,
              last_activity: new Date().toISOString()
            })
            .eq("id", toChipId)
        ]);

        loadMessages();
        loadChips();
      }, Math.random() * 4000 + 2000); // Delay de 2-6 segundos

    } catch (error) {
      console.error("Erro ao enviar mensagem entre chips:", error);
    }
  };

  const startHeating = () => {
    if (!selectedChip) {
      toast({
        title: "Erro",
        description: "Selecione um chip para aquecer.",
        variant: "destructive",
      });
      return;
    }

    if (heatingMode === "chip" && !targetChip) {
      toast({
        title: "Erro",
        description: "Selecione o chip de destino.",
        variant: "destructive",
      });
      return;
    }

    setIsHeating(true);
    
    const interval = setInterval(() => {
      if (heatingMode === "bot") {
        const messages = [
          "Oi, tudo bem?",
          "Como você está hoje?",
          "Qual é a novidade?",
          "Bom dia! Como estão as coisas?",
          "E aí, como foi o dia?",
          "Olá! Tudo certo?",
          "Opa! Como anda tudo?",
          "Oi! Que bom te ver online!",
          "Fala! Tudo tranquilo?",
          "Hey! Como você está?"
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        sendMessageToBot(selectedChip, randomMessage);
      } else if (heatingMode === "chip" && targetChip) {
        sendMessageBetweenChips(selectedChip, targetChip);
      }
    }, Math.random() * 10000 + 5000); // Intervalo de 5-15 segundos

    setHeatingInterval(interval);
    
    toast({
      title: "Aquecimento iniciado! 🔥",
      description: `Chip ${chips.find(c => c.id === selectedChip)?.name} está sendo aquecido.`,
    });

    loadMessages();
  };

  const stopHeating = () => {
    if (heatingInterval) {
      clearInterval(heatingInterval);
      setHeatingInterval(null);
    }
    setIsHeating(false);
    
    toast({
      title: "Aquecimento parado",
      description: "O processo de aquecimento foi interrompido.",
    });
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Atualizar mensagens a cada 3 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Aquecimento de Chips</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuração de Aquecimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Configurar Aquecimento
              </CardTitle>
              <CardDescription>
                Configure o aquecimento dos seus chips do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {chips.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum chip conectado. 
                    <Button variant="link" onClick={() => navigate("/connect-number")}>
                      Conecte um chip primeiro
                    </Button>
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chip para Aquecer</label>
                    <Select value={selectedChip} onValueChange={setSelectedChip}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um chip" />
                      </SelectTrigger>
                      <SelectContent>
                        {chips.map((chip) => (
                          <SelectItem key={chip.id} value={chip.id}>
                            {chip.name} ({chip.phone_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modo de Aquecimento</label>
                    <Select value={heatingMode} onValueChange={(value: "bot" | "chip") => setHeatingMode(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bot">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Conversar com Bot IA
                          </div>
                        </SelectItem>
                        {chips.length > 1 && (
                          <SelectItem value="chip">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Chip para Chip
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {heatingMode === "chip" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chip de Destino</label>
                      <Select value={targetChip} onValueChange={setTargetChip}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o chip de destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {chips.filter(chip => chip.id !== selectedChip).map((chip) => (
                            <SelectItem key={chip.id} value={chip.id}>
                              {chip.name} ({chip.phone_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    {!isHeating ? (
                      <Button onClick={startHeating} className="flex-1 shadow-fire">
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar Aquecimento
                      </Button>
                    ) : (
                      <Button onClick={stopHeating} variant="destructive" className="flex-1">
                        <Square className="h-4 w-4 mr-2" />
                        Parar Aquecimento
                      </Button>
                    )}
                  </div>

                  {isHeating && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Clock className="h-4 w-4 animate-pulse" />
                      Aquecimento em andamento...
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Log de Mensagens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Log de Mensagens
              </CardTitle>
              <CardDescription>
                Acompanhe as mensagens sendo enviadas em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma mensagem ainda
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const fromChip = chips.find(c => c.id === message.from_chip_id);
                    const isFromBot = message.from_chip_id === "bot";
                    const isToBot = message.to_chip_id === "bot";
                    
                    return (
                      <div key={message.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isFromBot ? (
                              <Badge variant="secondary">
                                <Bot className="h-3 w-3 mr-1" />
                                Bot IA
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {fromChip?.name || "Chip"}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">→</span>
                            {isToBot ? (
                              <Badge variant="secondary">
                                <Bot className="h-3 w-3 mr-1" />
                                Bot IA
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {chips.find(c => c.id === message.to_chip_id)?.name || "Chip"}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.sent_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Heating;