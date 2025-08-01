import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Flame, Bot, MessageCircle, Play, Square, Clock, MessageSquare } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MessagesSidebar } from "@/components/MessagesSidebar";
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

    let botResponse = "Olá! 👋"; // Valor padrão

    try {
      // Se a mensagem foi iniciada pelo chip, enviar primeiro a mensagem do chip
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
        
        // Usar respostas de fallback variadas
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
          "Oi! Como está se sentindo?",
          "Olá! Tudo certo?",
          "E aí! Como você está hoje?",
          "Oi! Que bom te ver! 😊",
          "Olá! Como está se sentindo hoje?",
          "E aí! Tudo bem?",
          "Oi! Alguma novidade hoje?",
          "Olá! Tudo tranquilo por aí?",
          "E aí! Como foi tudo?",
          "Oi! Que bom falar contigo! 😄",
          "Olá! Como estão as coisas hoje?"
        ];
        
        botResponse = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        console.log("✅ Usando fallback:", botResponse);
      } else {
        botResponse = response.data?.response || "Olá! 👋";
      }
      
      // Simular digitação e resposta do bot
      setTimeout(async () => {
        // Se o bot iniciou a conversa, primeiro ele fala
        if (!isInitiatedByChip) {
          await supabase.from("messages").insert({
            user_id: user?.id,
            from_chip_id: "bot",
            to_chip_id: chipId,
            content: botResponse,
            status: "sent"
          });

          // Depois o chip responde
          setTimeout(async () => {
            const chipResponses = [
              "Oi! Tudo bem sim! 😊",
              "Olá! Como você está?",
              "Oi bot! Tudo ótimo!",
              "Hey! Obrigado por perguntar! 👍",
              "Oi! Tudo certo por aqui!",
              "Olá! Sempre bem! E você?",
              "Oi! Dia produtivo hoje! 💪",
              "Hey! Tudo tranquilo! 😄",
              "Oi! Trabalhando firme! 🚀",
              "Olá! Tudo em ordem! ✅"
            ];
            
            const chipResponse = chipResponses[Math.floor(Math.random() * chipResponses.length)];
            
            await supabase.from("messages").insert({
              user_id: user?.id,
              from_chip_id: chipId,
              to_chip_id: "bot",
              content: chipResponse,
              status: "sent"
            });

            // Atualizar contador (2 mensagens)
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
          // Caso normal: chip fala, bot responde
          await supabase.from("messages").insert({
            user_id: user?.id,
            from_chip_id: "bot",
            to_chip_id: chipId,
            content: botResponse,
            status: "sent"
          });

          // Atualizar contador (1 mensagem extra, já que a do chip foi enviada antes)
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
      }, Math.random() * 3000 + 1000); // Delay de 1-4 segundos

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
      "Salve! Qual é a boa de hoje?",
      "Hey! Como foi o final de semana?",
      "Bom dia! Café da manhã feito? ☕",
      "Oi! Viu o jogo ontem?",
      "E aí! Como está a família?",
      "Olá! Animado para hoje? 🚀",
      "Fala! Tudo tranquilo no trabalho?",
      "Oi! Que tal uma pausa? 😄",
      "Hey! Novidades por aí?",
      "Bom dia! Sol tá forte hoje ☀️",
      "E aí! Almoçou bem? 🍽️"
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
      "A boa é trabalhar! E você? 😎",
      "Foi ótimo! Descansou bem! 😴",
      "Já sim! E você? Como está? ☕",
      "Vi! Que jogo! E você viu? ⚽",
      "Todos bem, obrigado! E a sua? 👨‍👩‍👧‍👦",
      "Sempre animado! Bora trabalhar! 💪",
      "Tudo suave! E você, como está? 😊",
      "Boa ideia! Vamos fazer isso! ⏰",
      "Sempre tem! E por aí? 📰",
      "Verdade! Dia lindo! Como está? 🌞",
      "Almocei bem! E você? O que comeu? 🥗"
    ];

    const followUpQuestions = [
      "E como está o trabalho?",
      "Alguma novidade boa?",
      "O que você acha de fazermos aquela reunião?",
      "Viu as vendas de hoje?",
      "Tá com algum plano para hoje?",
      "Como estão os clientes por aí?",
      "Conseguiu resolver aquela pendência?",
      "O que achou das mudanças?",
      "Tá precisando de alguma ajuda?",
      "Vamos almoçar juntos hoje?"
    ];

    const followUpAnswers = [
      "Trabalho tá correndo bem! 💼",
      "Sempre tem novidade boa! 😊",
      "Boa ideia! Vamos marcar sim! 📅",
      "Vi sim! Estão boas! 📈",
      "Tenho alguns planos! E você? 🎯",
      "Clientes estão satisfeitos! 👥",
      "Consegui resolver! Obrigado! ✅",
      "Achei interessante! E você? 🤔",
      "Por enquanto não! Mas obrigado! 🙏",
      "Vamos sim! Onde você quer ir? 🍴"
    ];

    try {
      const isFollowUp = Math.random() < 0.3; // 30% chance de ser uma conversa de continuação
      
      let initialMessage, responseMessage, followUpMsg = null, followUpResp = null;

      if (isFollowUp) {
        initialMessage = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
        responseMessage = followUpAnswers[Math.floor(Math.random() * followUpAnswers.length)];
      } else {
        initialMessage = conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
        responseMessage = responses[Math.floor(Math.random() * responses.length)];
        
        // 40% chance de ter uma pergunta de follow-up
        if (Math.random() < 0.4) {
          followUpMsg = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
          followUpResp = followUpAnswers[Math.floor(Math.random() * followUpAnswers.length)];
        }
      }

      // Enviar mensagem inicial
      await supabase.from("messages").insert({
        user_id: user?.id,
        from_chip_id: fromChipId,
        to_chip_id: toChipId,
        content: initialMessage,
        status: "sent"
      });

      // Simular digitação e resposta
      setTimeout(async () => {
        await supabase.from("messages").insert({
          user_id: user?.id,
          from_chip_id: toChipId,
          to_chip_id: fromChipId,
          content: responseMessage,
          status: "sent"
        });

        // Se tiver follow-up, enviar após outro delay
        if (followUpMsg && followUpResp) {
          setTimeout(async () => {
            await supabase.from("messages").insert({
              user_id: user?.id,
              from_chip_id: fromChipId,
              to_chip_id: toChipId,
              content: followUpMsg,
              status: "sent"
            });

            // Resposta final
            setTimeout(async () => {
              await supabase.from("messages").insert({
                user_id: user?.id,
                from_chip_id: toChipId,
                to_chip_id: fromChipId,
                content: followUpResp,
                status: "sent"
              });

              await updateChipCounters(fromChipId, toChipId, 4); // 4 mensagens no total
              loadMessages();
              loadChips();
            }, Math.random() * 3000 + 2000);

          }, Math.random() * 4000 + 3000);
        } else {
          await updateChipCounters(fromChipId, toChipId, 2); // 2 mensagens
          loadMessages();
          loadChips();
        }

      }, Math.random() * 4000 + 2000); // Delay inicial de 2-6 segundos

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
    
    // Variáveis para controlar a frequência
    let messageCount = 0;
    
    const sendRandomMessage = () => {
      messageCount++;
      
      if (heatingMode === "bot") {
        // 70% chance do chip iniciar, 30% do bot iniciar (mais natural)
        const chipInitiates = Math.random() < 0.7;
        
        if (chipInitiates) {
          const chipMessages = [
            "Oi, tudo bem?",
            "Como você está hoje?",
            "Qual é a novidade?",
            "Bom dia! Como estão as coisas?",
            "E aí, como foi o dia?",
            "Olá! Tudo certo?",
            "Opa! Como anda tudo?",
            "Oi! Que bom te ver online!",
            "Fala! Tudo tranquilo?",
            "Hey! Como você está?",
            "Oi! Como foi o trabalho hoje?",
            "E aí! Tudo bem com você?",
            "Olá! Como está se sentindo?",
            "Oi! Alguma novidade?",
            "Como foi o final de semana?",
            "Tudo certo por aí?",
            "Qual é a boa de hoje?",
            "Como está o movimento?",
            "Preparado para trabalhar?",
            "Viu as novidades?",
            "Como foram as vendas?",
            "Tudo tranquilo no trabalho?",
            "Que tal uma pausa?",
            "Almoçou bem?",
            "Como está a família?",
            "Viu o jogo ontem?",
            "Sol tá forte hoje né?",
            "Bom dia! Café feito?",
            "Como está o humor hoje?",
            "Pronto para mais um dia?"
          ];
          const randomMessage = chipMessages[Math.floor(Math.random() * chipMessages.length)];
          sendMessageToBot(selectedChip, randomMessage, true);
        } else {
          // Bot inicia a conversa
          const botMessages = [
            "Oi! Como você está hoje? 😊",
            "Olá! Tudo bem por aí?",
            "Oi! Como foi seu dia?",
            "Hey! Tudo tranquilo?",
            "Bom dia! Como estão as coisas? ☀️",
            "Oi! Que bom falar com você!",
            "Olá! Como está se sentindo hoje?",
            "Hey! Alguma novidade boa?",
            "Oi! Como foi o trabalho? 💼",
            "Olá! Tudo certo com você?",
            "Oi! Preparado para hoje? 🚀",
            "Como foi o sono? Dormiu bem? 😴",
            "E aí! Qual é o plano de hoje?",
            "Oi! Como está o ânimo? 💪",
            "Bom dia! Que tal o tempo? ⛅",
            "Hey! Tudo nos conformes?",
            "Oi! Como anda a vida? 🌟",
            "Olá! Novidades por aí? 📰",
            "Oi! Como está o trabalho hoje?",
            "Hey! Tudo correndo bem?"
          ];
          const randomBotMessage = botMessages[Math.floor(Math.random() * botMessages.length)];
          sendMessageToBot(selectedChip, randomBotMessage, false);
        }
      } else if (heatingMode === "chip" && targetChip) {
        // Alternar quem inicia a conversa de forma mais natural
        const firstChip = Math.random() < 0.5 ? selectedChip : targetChip;
        const secondChip = firstChip === selectedChip ? targetChip : selectedChip;
        sendMessageBetweenChips(firstChip, secondChip);
      }
      
      // Mostrar progresso do aquecimento
      if (messageCount % 5 === 0) {
        toast({
          title: `🔥 Aquecimento ativo`,
          description: `${messageCount} mensagens enviadas`,
        });
      }
    };
    
    // Enviar primeira mensagem imediatamente
    sendRandomMessage();
    
    // Configurar intervalo mais frequente e variável
    const interval = setInterval(() => {
      sendRandomMessage();
    }, Math.random() * 4000 + 2000); // Intervalo reduzido: 2-6 segundos

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
    
    // Configurar realtime para mensagens
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Realtime message update:', payload);
          loadMessages(); // Recarregar mensagens quando houver mudanças
        }
      )
      .subscribe();

    const interval = setInterval(loadMessages, 10000); // Backup: atualizar mensagens a cada 10 segundos

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full flex">
        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div className="flex items-center gap-2">
                  <Flame className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold">Aquecimento de Chips</h1>
                </div>
              </div>
              
              {/* Botão para abrir/fechar sidebar de mensagens */}
              <div className="flex items-center gap-2">
                <SidebarTrigger>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensagens
                </SidebarTrigger>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
            {/* Configuração de Aquecimento - agora ocupa toda a largura */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* Estatísticas dos chips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 border-t">
                      {chips.map((chip) => (
                        <div key={chip.id} className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{chip.name}</h4>
                            <Badge variant={chip.connected ? "default" : "secondary"}>
                              {chip.connected ? "Conectado" : "Desconectado"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{chip.phone_number}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <MessageCircle className="h-3 w-3" />
                            {chip.messages_count} mensagens
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar de mensagens */}
        <MessagesSidebar messages={messages} chips={chips} />
      </div>
    </SidebarProvider>
  );
};

export default Heating;