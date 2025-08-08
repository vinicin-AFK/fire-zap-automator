import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Smartphone, Zap, Shield } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        navigate("/dashboard");
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-fire">
        <Flame className="h-12 w-12 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-fire">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Flame className="h-16 w-16" />
            <h1 className="text-6xl font-bold">Fire Zap</h1>
          </div>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            A plataforma definitiva para aquecer e gerenciar seus números do WhatsApp.
            Conecte, aqueça e otimize suas conversas automaticamente.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-fire text-lg px-8"
                onClick={() => navigate("/auth")}
              >
                Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 text-lg px-8"
                onClick={() => navigate("/auth")}
              >
                Fazer Login
              </Button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <Smartphone className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Conexão Rápida</h3>
            <p className="opacity-90">
              Conecte seus números do WhatsApp facilmente com QR Code em segundos.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <Zap className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aquecimento Automático</h3>
            <p className="opacity-90">
              Sistema inteligente de aquecimento com conversas simuladas e fluxos personalizados.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <Shield className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">100% Seguro</h3>
            <p className="opacity-90">
              Suas conversas e dados são protegidos com criptografia de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
