import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Flame, Bot, MessageCircle, Play, Square, Clock, MessageSquare, BarChart3, Settings } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatAnalytics } from "@/components/ChatAnalytics";
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

  const sendMessageToBot = async (chipId: string, message: string, isInitiatedByChip = true) => {
    const chip = chips.find(c => c.id === chipId);
    if (!chip) return;

    let botResponse = "Olá! 👋";

    try {
      if (isInitiatedByChip) {
        await supabase.from("messages").insert({
          user_id: user?.id,
          from_chip_id: chipId,
          to_chip_id: "bot",
          content: message,
          status: "sent"
        });
      }

      const response = await supabase.functions.invoke('whatsapp-bot', {
        body: { 
          message: message,
          chipName: chip.name,
          isInitiatedByBot: !isInitiatedByChip
        }
      });

      if (response.error) {
        console.error('Erro ao chamar bot:', response.error);
        
        const fallbackMessages = [
          "Oi! Como você está? 😊",
          "Olá! Tudo bem por aí?",
          "E aí! Como foi o dia?",
          "Oi! Alguma novidade? 😄",
          "Olá! Como estão as coisas?",
          "E aí! Tudo tranquilo?",
          "Oi! Como foi o trabalho hoje?",
          "Olá! Que bom te ver online!",
          "E aí! Tudo bem com você?",
          "Oi! Como está se sentindo?"
        ];
        
        botResponse = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
      } else {
        botResponse = response.data?.response || "Olá! 👋";
      }
      
      setTimeout(async () => {
        if (!isInitiatedByChip) {
          await supabase.from("messages").insert({
            user_id: user?.id,
            from_chip_id: "bot",
            to_chip_id: chipId,
            content: botResponse,
            status: "sent"
          });

          setTimeout(async () => {
            const chipResponses = [
              "Oi! Tudo bem sim! 😊",
              "Olá! Como você está?",
              "Oi bot! Tudo ótimo!",
              "Hey! Obrigado por perguntar! 👍",
              "Oi! Tudo certo por aqui!"
            ];
            
            const chipResponse = chipResponses[Math.floor(Math.random() * chipResponses.length)];
            
            await supabase.from("messages").insert({
              user_id: user?.id,
              from_chip_id: chipId,
              to_chip_id: "bot",
              content: chipResponse,
              status: "sent"
            });

            await supabase
              .from("chips")
              .update({ 
                messages_count: chip.messages_count + 2,
                last_activity: new Date().toISOString()
              })
              .eq("id", chipId);

            loadMessages();
            loadChips();
          }, Math.random() * 3000 + 1500);

        } else {
          await supabase.from("messages").insert({
            user_id: user?.id,
            from_chip_id: "bot",
            to_chip_id: chipId,
            content: botResponse,
            status: "sent"
          });

          await supabase
            .from("chips")
            .update({ 
              messages_count: chip.messages_count + 2,
              last_activity: new Date().toISOString()
            })
            .eq("id", chipId);

          loadMessages();
          loadChips();
        }
      }, Math.random() * 3000 + 1000);

    } catch (error) {
      console.error("Erro ao enviar mensagem para bot:", error);
    }
  };

  const sendMessageBetweenChips = async (fromChipId: string, toChipId: string) => {
    const fromChip = chips.find(c => c.id === fromChipId);
    const toChip = chips.find(c => c.id === toChipId);
    
    if (!fromChip || !toChip) return;

    const conversationStarters = [
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
      const initialMessage = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
      const responseMessage = responses[Math.floor(Math.random() * responses.length)];

      await supabase.from("messages").insert({
        user_id: user?.id,
        from_chip_id: fromChipId,
        to_chip_id: toChipId,
        content: initialMessage,
        status: "sent"
      });

      setTimeout(async () => {
        await supabase.from("messages").insert({
          user_id: user?.id,
          from_chip_id: toChipId,
          to_chip_id: fromChipId,
          content: responseMessage,
          status: "sent"
        });

        await updateChipCounters(fromChipId, toChipId, 2);
        loadMessages();
        loadChips();
      }, Math.random() * 4000 + 2000);

    } catch (error) {
      console.error("Erro ao enviar mensagem entre chips:", error);
    }
  };

  const updateChipCounters = async (fromChipId: string, toChipId: string, messageCount: number) => {
    const fromChip = chips.find(c => c.id === fromChipId);
    const toChip = chips.find(c => c.id === toChipId);
    
    if (!fromChip || !toChip) return;

    await Promise.all([
      supabase
        .from("chips")
        .update({ 
          messages_count: fromChip.messages_count + messageCount,
          last_activity: new Date().toISOString()
        })
        .eq("id", fromChipId),
      supabase
        .from("chips")
        .update({ 
          messages_count: toChip.messages_count + messageCount,
          last_activity: new Date().toISOString()
        })
        .eq("id", toChipId)
    ]);
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
    
    let messageCount = 0;
    
    const sendRandomMessage = () => {
      messageCount++;
      
      if (heatingMode === "bot") {
        const chipInitiates = Math.random() < 0.7;
        
        if (chipInitiates) {
          const chipMessages = [
            "Oi, tudo bem?",
            "Como você está hoje?",
            "Qual é a novidade?",
            "Bom dia! Como estão as coisas?",
            "E aí, como foi o dia?",
            "Olá! Tudo certo?"
          ];
          const randomMessage = chipMessages[Math.floor(Math.random() * chipMessages.length)];
          sendMessageToBot(selectedChip, randomMessage, true);
        } else {
          const botMessages = [
            "Oi! Como você está hoje? 😊",
            "Olá! Tudo bem por aí?",
            "Oi! Como foi seu dia?",
            "Hey! Tudo tranquilo?",
            "Bom dia! Como estão as coisas? ☀️"
          ];
          const randomBotMessage = botMessages[Math.floor(Math.random() * botMessages.length)];
          sendMessageToBot(selectedChip, randomBotMessage, false);
        }
      } else if (heatingMode === "chip" && targetChip) {
        const firstChip = Math.random() < 0.5 ? selectedChip : targetChip;
        const secondChip = firstChip === selectedChip ? targetChip : selectedChip;
        sendMessageBetweenChips(firstChip, secondChip);
      }
      
      if (messageCount % 5 === 0) {
        toast({
          title: `🔥 Aquecimento ativo`,
          description: `${messageCount} mensagens enviadas`,
        });
      }
    };
    
    sendRandomMessage();
    
    const interval = setInterval(() => {
      sendRandomMessage();
    }, Math.random() * 4000 + 2000);

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
            <h1 className="text-xl font-bold">Aquecimento Inteligente</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {chips.filter(c => c.connected).length} chips online
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat Inteligente
            </TabsTrigger>
            <TabsTrigger value="heating" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Aquecimento
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Interface de Chat Avançada</h2>
              <p className="text-muted-foreground">
                Converse entre seus chips de forma intuitiva e natural
              </p>
            </div>
            <ChatInterface 
              chips={chips} 
              userId={user?.id}
              onChipSelect={(chipId) => console.log('Chip selecionado:', chipId)}
            />
          </TabsContent>

          <TabsContent value="heating" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Controles de Aquecimento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Controles de Aquecimento
                  </CardTitle>
                  <CardDescription>
                    Configure o aquecimento automático dos seus chips
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chip de Origem</label>
                    <Select value={selectedChip} onValueChange={setSelectedChip}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o chip" />
                      </SelectTrigger>
                      <SelectContent>
                        {chips.map((chip) => (
                          <SelectItem key={chip.id} value={chip.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${chip.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                              {chip.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modo de Aquecimento</label>
                    <Select value={heatingMode} onValueChange={(value: "bot" | "chip" | "") => setHeatingMode(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bot">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Conversar com Bot
                          </div>
                        </SelectItem>
                        <SelectItem value="chip">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Conversar entre Chips
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {heatingMode === "chip" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chip de Destino</label>
                      <Select value={targetChip} onValueChange={setTargetChip}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {chips.filter(chip => chip.id !== selectedChip).map((chip) => (
                            <SelectItem key={chip.id} value={chip.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${chip.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {chip.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      onClick={isHeating ? stopHeating : startHeating}
                      className="w-full"
                      variant={isHeating ? "destructive" : "default"}
                    >
                      {isHeating ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Parar Aquecimento
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Aquecimento
                        </>
                      )}
                    </Button>
                  </div>

                  {isHeating && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Aquecimento ativo</span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Mensagens sendo enviadas automaticamente
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status dos Chips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Status dos Chips
                  </CardTitle>
                  <CardDescription>
                    Monitor em tempo real da atividade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {chips.map((chip) => (
                      <div key={chip.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${chip.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="font-medium text-sm">{chip.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {chip.phone_number}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={chip.connected ? "default" : "secondary"}>
                            {chip.connected ? "Online" : "Offline"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {chip.messages_count} msgs
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mensagens Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Mensagens Recentes
                </CardTitle>
                <CardDescription>
                  Últimas mensagens enviadas pelo sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.slice(0, 10).map((message) => {
                    const fromChip = chips.find(c => c.id === message.from_chip_id);
                    const toChip = chips.find(c => c.id === message.to_chip_id);
                    const isFromBot = message.from_chip_id === "bot";
                    const isToBot = message.to_chip_id === "bot";

                    return (
                      <div key={message.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isFromBot ? (
                              <Badge variant="secondary" className="text-xs">
                                <Bot className="h-3 w-3 mr-1" />
                                Bot
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {fromChip?.name || "Desconhecido"}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">→</span>
                            {isToBot ? (
                              <Badge variant="secondary" className="text-xs">
                                <Bot className="h-3 w-3 mr-1" />
                                Bot
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {toChip?.name || "Desconhecido"}
                              </Badge>
                            )}
                          </div>
                          <Badge 
                            variant={
                              message.status === "sent" ? "default" :
                              message.status === "received" ? "secondary" :
                              "destructive"
                            }
                            className="text-xs"
                          >
                            {message.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.sent_at).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Analytics Avançado</h2>
              <p className="text-muted-foreground">
                Insights detalhados sobre o desempenho dos seus chats
              </p>
            </div>
            <ChatAnalytics chips={chips} messages={messages} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Personalize o comportamento do aquecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Intervalo de Mensagens (segundos)</label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 segundos</SelectItem>
                        <SelectItem value="30">30 segundos</SelectItem>
                        <SelectItem value="60">1 minuto</SelectItem>
                        <SelectItem value="120">2 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Máximo de Mensagens por Hora</label>
                    <Select defaultValue="20">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 mensagens</SelectItem>
                        <SelectItem value="20">20 mensagens</SelectItem>
                        <SelectItem value="50">50 mensagens</SelectItem>
                        <SelectItem value="100">100 mensagens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Heating;