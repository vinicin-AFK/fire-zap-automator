import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWppSession } from "@/hooks/useWppSession";
import { QrCode, Link2, Power, PowerOff, Shield } from "lucide-react";

interface WhatsAppConnectCardProps {
  backendUrl?: string;
  sessionId?: string;
  apiKey?: string;
}

export const WhatsAppConnectCard = ({ backendUrl = "", sessionId = "", apiKey = "" }: WhatsAppConnectCardProps) => {
  const { toast } = useToast();

  const [url, setUrl] = useState<string>(() => localStorage.getItem("wpp.backendUrl") || backendUrl);
  const [sid, setSid] = useState<string>(() => localStorage.getItem("wpp.sessionId") || sessionId || "default");
  const [key, setKey] = useState<string>(() => localStorage.getItem("wpp.apiKey") || apiKey);
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => (key ? { "x-api-key": key } : {}), [key]);

  const { status, qr } = useWppSession(sid, url);

  useEffect(() => {
    localStorage.setItem("wpp.backendUrl", url || "");
  }, [url]);
  useEffect(() => {
    localStorage.setItem("wpp.sessionId", sid || "");
  }, [sid]);
  useEffect(() => {
    localStorage.setItem("wpp.apiKey", key || "");
  }, [key]);

  const startSession = async () => {
    if (!url || !sid) {
      toast({ title: "Dados faltando", description: "Informe URL do backend e Session ID", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${url}/wpp/session/${encodeURIComponent(sid)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar sessão");
      toast({ title: "Sessão criada", description: `Status: ${data.status}` });
    } catch (e: any) {
      toast({ title: "Erro ao criar sessão", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const stopSession = async () => {
    if (!url || !sid) return;
    setBusy(true);
    try {
      const res = await fetch(`${url}/wpp/session/${encodeURIComponent(sid)}`, {
        method: "DELETE",
        headers: { ...headers },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao parar sessão");
      toast({ title: "Sessão parada", description: `Status: ${data.status}` });
    } catch (e: any) {
      toast({ title: "Erro ao parar sessão", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = () => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      starting: { label: "Iniciando", variant: "secondary" },
      qr: { label: "QR pronto", variant: "outline" },
      authenticated: { label: "Autenticado", variant: "default" },
      ready: { label: "Pronto", variant: "default" },
      disconnected: { label: "Desconectado", variant: "secondary" },
      error: { label: "Erro", variant: "secondary" },
      exited: { label: "Finalizado", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "secondary" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔌 Conexão WhatsApp (server.js + robo.js)
          </CardTitle>
          <CardDescription>
            Aponte para seu backend Node (server.js) que gerencia o robo.js. Suporte a Socket.IO namespace /wpp e rotas REST.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="backend">Backend URL</Label>
              <Input id="backend" placeholder="https://seu-backend.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sid">Session ID</Label>
              <Input id="sid" placeholder="default" value={sid} onChange={(e) => setSid(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="apikey" className="flex items-center gap-2"><Shield className="w-4 h-4" /> API Key (opcional)</Label>
              <Input id="apikey" type="password" placeholder="se precisar, do seu backend" value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statusBadge()}
            <Button size="sm" onClick={startSession} disabled={busy || !url || !sid}>
              <Link2 className="w-4 h-4 mr-2" /> Criar/Conectar Sessão
            </Button>
            <Button size="sm" variant="outline" onClick={stopSession} disabled={busy || !url || !sid}>
              <PowerOff className="w-4 h-4 mr-2" /> Parar Sessão
            </Button>
          </div>

          {status === "qr" && qr && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">Escaneie o QR abaixo no WhatsApp</p>
              </div>
              <div className="p-3 bg-white rounded-lg border inline-block">
                <img src={qr} alt="QR WhatsApp" className="w-64 h-64" />
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="flex items-center gap-2 text-green-600">
              <Power className="w-5 h-5" />
              <span>Dispositivo conectado e pronto.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
