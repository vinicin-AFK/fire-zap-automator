import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flame, Plus, Phone, Activity, LogOut, Smartphone } from "lucide-react";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadChips();
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadChips = async () => {
    try {
      const { data, error } = await supabase
        .from("chips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao carregar chips.",
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Flame className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-fire bg-clip-text text-transparent">
              Fire Zap
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {user?.user_metadata?.name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Chips
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chips.length}</div>
              <p className="text-xs text-muted-foreground">
                números cadastrados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conectados
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chips.filter(chip => chip.connected).length}
              </div>
              <p className="text-xs text-muted-foreground">
                chips ativos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mensagens Enviadas
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chips.reduce((total, chip) => total + chip.messages_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                total de mensagens
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button onClick={() => navigate("/connect-number")} className="shadow-fire">
            <Plus className="h-4 w-4 mr-2" />
            Conectar Novo Número
          </Button>
          <Button variant="secondary" onClick={() => navigate("/heating")}>
            <Flame className="h-4 w-4 mr-2" />
            Iniciar Aquecimento
          </Button>
        </div>

        {/* Chips List */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Números</CardTitle>
            <CardDescription>
              Gerencie todos os seus números do WhatsApp conectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chips.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum número conectado</h3>
                <p className="text-muted-foreground mb-4">
                  Conecte seu primeiro número do WhatsApp para começar
                </p>
                <Button onClick={() => navigate("/connect-number")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar Primeiro Número
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {chips.map((chip) => (
                  <div
                    key={chip.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{chip.name}</h4>
                      <p className="text-sm text-muted-foreground">{chip.phone_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {chip.messages_count} mensagens enviadas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={chip.connected ? "default" : "secondary"}>
                        {chip.connected ? "Conectado" : "Desconectado"}
                      </Badge>
                      <Badge variant="outline">
                        {chip.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;