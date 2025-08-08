import { MessageCircle, Bot, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  from_chip_id: string;
  to_chip_id: string;
  content: string;
  status: string;
  sent_at: string;
}

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  connected: boolean;
  messages_count: number;
}

interface MessagesSidebarProps {
  messages: Message[];
  chips: Chip[];
}

export function MessagesSidebar({ messages, chips }: MessagesSidebarProps) {
  return (
    <Sidebar side="right" className="w-80 border-l">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Mensagens</h3>
          </div>
          <SidebarTrigger />
        </div>
        <p className="text-sm text-muted-foreground">
          Mensagens em tempo real
        </p>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full p-4">
          <div className="space-y-3">
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
                const toChip = chips.find(c => c.id === message.to_chip_id);
                const isFromBot = message.from_chip_id === "bot";
                const isToBot = message.to_chip_id === "bot";
                const isFromExternal = message.from_chip_id === "external";
                const isToExternal = message.to_chip_id === "external";
                
                return (
                  <div key={message.id} className="border rounded-lg p-3 space-y-2">
                    {/* Header da mensagem */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        {/* Remetente */}
                        {isFromBot ? (
                          <Badge variant="secondary" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            Bot IA
                          </Badge>
                        ) : isFromExternal ? (
                          <Badge variant="default" className="text-xs">
                            📱 WhatsApp
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {fromChip?.name || "Chip"}
                          </Badge>
                        )}
                        
                        <span className="text-muted-foreground">→</span>
                        
                        {/* Destinatário */}
                        {isToBot ? (
                          <Badge variant="secondary" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            Bot IA
                          </Badge>
                        ) : isToExternal ? (
                          <Badge variant="default" className="text-xs">
                            📱 WhatsApp
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {toChip?.name || "Chip"}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Status */}
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          message.status === "sent" ? "bg-green-500" :
                          message.status === "received" ? "bg-blue-500" :
                          message.status === "failed" ? "bg-red-500" :
                          "bg-yellow-500"
                        }`} />
                      </div>
                    </div>
                    
                    {/* Conteúdo da mensagem */}
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(message.sent_at), {
                        addSuffix: true
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}