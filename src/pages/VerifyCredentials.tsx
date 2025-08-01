import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

const VerifyCredentials = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const verifyCredentials = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-credentials');

      if (error) {
        throw error;
      }

      setResults(data);
      
      toast({
        title: data.success ? "✅ Sucesso" : "⚠️ Problema encontrado",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
      toast({
        title: "Erro",
        description: "Falha ao verificar credenciais: " + error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Verificação de Credenciais WhatsApp</h1>
          <p className="text-muted-foreground">
            Teste se as credenciais do WhatsApp Business API estão configuradas corretamente
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Testar Credenciais</CardTitle>
            <CardDescription>
              Clique no botão abaixo para verificar se as credenciais estão funcionando
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={verifyCredentials} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Credenciais'
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6">
            {/* Status Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(results.success)}
                  Status Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className={`font-medium ${results.success ? 'text-green-600' : 'text-red-600'}`}>
                    {results.message}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Todos os testes: {results.all_tests_passed ? '✅ Passou' : '❌ Falhou'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Credenciais */}
            <Card>
              <CardHeader>
                <CardTitle>Credenciais Configuradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.results.credentials_exist.api_key)}
                    <span>API Key: {results.results.api_key_preview || 'Não configurado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(results.results.credentials_exist.phone_number_id)}
                    <span>Phone Number ID: {results.results.phone_number_id || 'Não configurado'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testes Detalhados */}
            <Card>
              <CardHeader>
                <CardTitle>Resultados dos Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  {/* Teste 1: Phone Info */}
                  {results.results.tests.phone_info && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(results.results.tests.phone_info.success)}
                        <h4 className="font-medium">Informações do Número</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Status: {results.results.tests.phone_info.status}
                      </p>
                      {results.results.tests.phone_info.data && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(results.results.tests.phone_info.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Teste 2: Messages API */}
                  {results.results.tests.messages_api && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(results.results.tests.messages_api.success)}
                        <h4 className="font-medium">API de Mensagens</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Status: {results.results.tests.messages_api.status}
                      </p>
                      <p className="text-xs text-blue-600 mb-2">
                        {results.results.tests.messages_api.note}
                      </p>
                      {results.results.tests.messages_api.data && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(results.results.tests.messages_api.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Teste 3: Account Limits */}
                  {results.results.tests.account_limits && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(results.results.tests.account_limits.success)}
                        <h4 className="font-medium">Limites da Conta</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Status: {results.results.tests.account_limits.status}
                      </p>
                      {results.results.tests.account_limits.data && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(results.results.tests.account_limits.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Recomendações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {results.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCredentials;