import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Bot, 
  Smartphone, 
  Clock, 
  Check, 
  CheckCheck,
  MoreVertical,
  Smile,
  Paperclip,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  from_chip_id: string;
  to_chip_id: string;
  sent_at: string;
  status: string;
}

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  connected: boolean;
  messages_count: number;
  last_activity: string | null;
}

interface ChatInterfaceProps {
  chips: Chip[];
  userId?: string;
  onChipSelect?: (chipId: string) => void;
}

export function ChatInterface({ chips, userId, onChipSelect }: ChatInterfaceProps) {
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    
    // Simular usuários online
    const connectedChipIds = chips.filter(c => c.connected).map(c => c.id);
    setOnlineUsers(new Set(connectedChipIds));
    
    // Real-time subscription for messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(prev => [payload.new as Message, ...prev]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chips]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setIsTyping(true);
      
      const [fromChipId, toChipId] = selectedChat.split("-");
      
      await supabase.from("messages").insert({
        user_id: userId,
        from_chip_id: fromChipId,
        to_chip_id: toChipId,
        content: newMessage.trim(),
        status: "sent"
      });

      setNewMessage("");
      
      // Simular resposta automática após delay
      setTimeout(() => {
        simulateResponse(toChipId, fromChipId);
      }, Math.random() * 3000 + 1000);

    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const simulateResponse = async (fromChipId: string, toChipId: string) => {
    const responses = [
      "Entendi! Obrigado pela informação 😊",
      "Perfeito! Vamos seguir com isso",
      "Ótima ideia! Concordo totalmente",
      "Sim, faz sentido! 👍",
      "Vou verificar isso agora mesmo",
      "Boa! Já estava pensando nisso também",
      "Certo! Qualquer coisa me avisa",
      "Tranquilo! Já anotei aqui",
      "Show! Vamos nessa! 🚀",
      "Fechado! Obrigado!"
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    try {
      await supabase.from("messages").insert({
        user_id: userId,
        from_chip_id: fromChipId,
        to_chip_id: toChipId,
        content: response,
        status: "sent"
      });
    } catch (error) {
      console.error("Erro ao simular resposta:", error);
    }
  };

  const getChipInitials = (chip: Chip) => {
    return chip.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getLastMessage = (chipId: string) => {
    const lastMsg = messages.find(m => 
      m.from_chip_id === chipId || m.to_chip_id === chipId
    );
    return lastMsg?.content.substring(0, 50) + (lastMsg?.content.length > 50 ? '...' : '') || 
           "Nenhuma mensagem ainda";
  };

  const getFilteredMessages = () => {
    if (!selectedChat) return [];
    
    const [chip1, chip2] = selectedChat.split("-");
    return messages.filter(m => 
      (m.from_chip_id === chip1 && m.to_chip_id === chip2) ||
      (m.from_chip_id === chip2 && m.to_chip_id === chip1)
    ).reverse();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
      {/* Lista de Chips/Conversas */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conversas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[700px]">
            {chips.map((chip) => (
              <div key={chip.id} className="space-y-2 p-4">
                <div
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    selectedChat.includes(chip.id) && "bg-primary/10 border border-primary/20"
                  )}
                  onClick={() => {
                    const otherChip = chips.find(c => c.id !== chip.id && c.connected);
                    if (otherChip) {
                      setSelectedChat(`${chip.id}-${otherChip.id}`);
                      onChipSelect?.(chip.id);
                    }
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getChipInitials(chip)}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(chip.id) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{chip.name}</h4>
                      <Badge variant={chip.connected ? "default" : "secondary"} className="text-xs">
                        {chip.connected ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPhoneNumber(chip.phone_number)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {getLastMessage(chip.id)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-muted-foreground">
                        {chip.messages_count} msgs
                      </div>
                      {chip.last_activity && (
                        <div className="text-xs text-muted-foreground">
                          • {formatDistanceToNow(new Date(chip.last_activity), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {chip.id !== chips[chips.length - 1].id && <Separator />}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área de Chat */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header do Chat */}
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    {selectedChat.split("-").map((chipId, index) => {
                      const chip = chips.find(c => c.id === chipId);
                      if (!chip) return null;
                      return (
                        <Avatar key={chipId} className="h-10 w-10 border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getChipInitials(chip)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {selectedChat.split("-").map(chipId => {
                        const chip = chips.find(c => c.id === chipId);
                        return chip?.name;
                      }).join(" • ")}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Ambos online
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Mensagens */}
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[500px] p-4">
                <div className="space-y-4">
                  {getFilteredMessages().map((message) => {
                    const isFromFirst = message.from_chip_id === selectedChat.split("-")[0];
                    const senderChip = chips.find(c => c.id === message.from_chip_id);
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isFromFirst ? "justify-start" : "justify-end"
                        )}
                      >
                        {isFromFirst && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-xs">
                              {senderChip ? getChipInitials(senderChip) : "??"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 break-words",
                            isFromFirst 
                              ? "bg-muted text-foreground rounded-tl-sm" 
                              : "bg-primary text-primary-foreground rounded-tr-sm"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            isFromFirst ? "text-muted-foreground" : "text-primary-foreground/70"
                          )}>
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(message.sent_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                            {!isFromFirst && (
                              <CheckCheck className="h-3 w-3 text-green-400" />
                            )}
                          </div>
                        </div>
                        
                        {!isFromFirst && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs">
                              {senderChip ? getChipInitials(senderChip) : "??"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  
                  {isTyping && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      digitando...
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input de Mensagem */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isTyping}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Selecione uma conversa</h3>
                <p className="text-muted-foreground">
                  Escolha um chip da lista para começar a conversar
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}