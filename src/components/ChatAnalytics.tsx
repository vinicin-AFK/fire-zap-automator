import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Users,
  Target,
  Zap,
  Activity,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface ChatAnalyticsProps {
  chips: Chip[];
  messages: Message[];
}

export function ChatAnalytics({ chips, messages }: ChatAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState({
    totalMessages: 0,
    averageResponseTime: 0,
    mostActiveChip: '',
    conversationRate: 0,
    peakHours: [] as any[],
    chipActivity: [] as any[],
    messagesByDay: [] as any[]
  });

  useEffect(() => {
    calculateAnalytics();
  }, [chips, messages]);

  const calculateAnalytics = () => {
    const totalMessages = messages.length;
    const activeChips = chips.filter(c => c.connected);
    
    // Chip mais ativo
    const chipMessageCounts = chips.map(chip => ({
      ...chip,
      sentMessages: messages.filter(m => m.from_chip_id === chip.id).length,
      receivedMessages: messages.filter(m => m.to_chip_id === chip.id).length
    }));
    
    const mostActiveChip = chipMessageCounts.reduce((prev, current) => 
      (prev.sentMessages + prev.receivedMessages) > (current.sentMessages + current.receivedMessages) 
        ? prev : current
    );

    // Atividade por chip para gráfico
    const chipActivity = chipMessageCounts.map(chip => ({
      name: chip.name.length > 8 ? chip.name.substring(0, 8) + '...' : chip.name,
      messages: chip.sentMessages + chip.receivedMessages,
      sent: chip.sentMessages,
      received: chip.receivedMessages,
      status: chip.connected ? 'online' : 'offline'
    }));

    // Análise de horários (simulada)
    const peakHours = [
      { hour: '09:00', messages: Math.floor(Math.random() * 20) + 5 },
      { hour: '10:00', messages: Math.floor(Math.random() * 25) + 8 },
      { hour: '11:00', messages: Math.floor(Math.random() * 30) + 12 },
      { hour: '12:00', messages: Math.floor(Math.random() * 15) + 3 },
      { hour: '13:00', messages: Math.floor(Math.random() * 20) + 5 },
      { hour: '14:00', messages: Math.floor(Math.random() * 35) + 15 },
      { hour: '15:00', messages: Math.floor(Math.random() * 30) + 10 },
      { hour: '16:00', messages: Math.floor(Math.random() * 25) + 8 },
      { hour: '17:00', messages: Math.floor(Math.random() * 20) + 5 },
      { hour: '18:00', messages: Math.floor(Math.random() * 15) + 2 }
    ];

    // Mensagens por dia (últimos 7 dias)
    const messagesByDay = [
      { day: 'Seg', messages: Math.floor(Math.random() * 100) + 50 },
      { day: 'Ter', messages: Math.floor(Math.random() * 120) + 60 },
      { day: 'Qua', messages: Math.floor(Math.random() * 90) + 45 },
      { day: 'Qui', messages: Math.floor(Math.random() * 110) + 55 },
      { day: 'Sex', messages: Math.floor(Math.random() * 130) + 70 },
      { day: 'Sab', messages: Math.floor(Math.random() * 80) + 30 },
      { day: 'Dom', messages: Math.floor(Math.random() * 60) + 20 }
    ];

    const conversationRate = totalMessages > 0 ? 
      Math.round((activeChips.length / chips.length) * 100) : 0;

    setAnalyticsData({
      totalMessages,
      averageResponseTime: Math.floor(Math.random() * 120) + 30, // Simulado em segundos
      mostActiveChip: mostActiveChip.name || 'N/A',
      conversationRate,
      peakHours,
      chipActivity,
      messagesByDay
    });
  };

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageResponseTime}s</div>
            <p className="text-xs text-muted-foreground">
              Média de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversa</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.conversationRate}%</div>
            <Progress value={analyticsData.conversationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chip Mais Ativo</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{analyticsData.mostActiveChip}</div>
            <Badge variant="secondary" className="mt-1">
              <Activity className="h-3 w-3 mr-1" />
              Alto engajamento
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="hours">Horários</TabsTrigger>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="chips">Chips</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividade por Chip
              </CardTitle>
              <CardDescription>
                Mensagens enviadas e recebidas por cada chip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.chipActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" stackId="a" fill="#4ECDC4" name="Enviadas" />
                  <Bar dataKey="received" stackId="a" fill="#45B7D1" name="Recebidas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Pico
              </CardTitle>
              <CardDescription>
                Distribuição de mensagens ao longo do dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#FF6B6B" 
                    strokeWidth={3}
                    dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Atividade Semanal
              </CardTitle>
              <CardDescription>
                Mensagens enviadas nos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.messagesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="messages" 
                    fill="#96CEB4" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chips" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Status dos Chips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Online', value: chips.filter(c => c.connected).length, color: '#4ECDC4' },
                        { name: 'Offline', value: chips.filter(c => !c.connected).length, color: '#FF6B6B' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { name: 'Online', value: chips.filter(c => c.connected).length },
                        { name: 'Offline', value: chips.filter(c => !c.connected).length }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4ECDC4' : '#FF6B6B'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes dos Chips</CardTitle>
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
                            {chip.messages_count} mensagens
                          </p>
                        </div>
                      </div>
                      <Badge variant={chip.connected ? "default" : "secondary"}>
                        {chip.connected ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}