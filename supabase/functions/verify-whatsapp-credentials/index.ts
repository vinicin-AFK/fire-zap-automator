import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    console.log('=== VERIFICAÇÃO DE CREDENCIAIS ===');
    console.log('API Key existe:', !!WHATSAPP_API_KEY);
    console.log('Phone Number ID existe:', !!WHATSAPP_PHONE_NUMBER_ID);
    console.log('API Key primeiros chars:', WHATSAPP_API_KEY?.substring(0, 10) + '...');
    console.log('Phone Number ID:', WHATSAPP_PHONE_NUMBER_ID);

    const results = {
      credentials_exist: {
        api_key: !!WHATSAPP_API_KEY,
        phone_number_id: !!WHATSAPP_PHONE_NUMBER_ID
      },
      api_key_preview: WHATSAPP_API_KEY ? WHATSAPP_API_KEY.substring(0, 10) + '...' : null,
      phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
      tests: {}
    };

    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais não configuradas',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Teste 1: Verificar informações do número
    console.log('--- TESTE 1: Verificando informações do número ---');
    try {
      const phoneInfoResponse = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        },
      });

      const phoneInfoData = await phoneInfoResponse.json();
      console.log('Phone info response status:', phoneInfoResponse.status);
      console.log('Phone info data:', phoneInfoData);

      results.tests.phone_info = {
        success: phoneInfoResponse.ok,
        status: phoneInfoResponse.status,
        data: phoneInfoData
      };
    } catch (error) {
      console.error('Erro no teste phone info:', error);
      results.tests.phone_info = {
        success: false,
        error: error.message
      };
    }

    // Teste 2: Verificar se consegue acessar a API de mensagens
    console.log('--- TESTE 2: Testando acesso à API de mensagens ---');
    try {
      const messagesTestResponse = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "5511999999999", // número fake para teste
          type: "text",
          text: {
            body: "teste"
          }
        }),
      });

      const messagesTestData = await messagesTestResponse.json();
      console.log('Messages test response status:', messagesTestResponse.status);
      console.log('Messages test data:', messagesTestData);

      results.tests.messages_api = {
        success: messagesTestResponse.status !== 401 && messagesTestResponse.status !== 403,
        status: messagesTestResponse.status,
        data: messagesTestData,
        note: 'Status 400 é esperado (número inválido), 401/403 indica problema de credenciais'
      };
    } catch (error) {
      console.error('Erro no teste messages API:', error);
      results.tests.messages_api = {
        success: false,
        error: error.message
      };
    }

    // Teste 3: Verificar limites e quota
    console.log('--- TESTE 3: Verificando limites da conta ---');
    try {
      const quotaResponse = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=messaging_limit_tier,account_mode`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        },
      });

      const quotaData = await quotaResponse.json();
      console.log('Quota response status:', quotaResponse.status);
      console.log('Quota data:', quotaData);

      results.tests.account_limits = {
        success: quotaResponse.ok,
        status: quotaResponse.status,
        data: quotaData
      };
    } catch (error) {
      console.error('Erro no teste quota:', error);
      results.tests.account_limits = {
        success: false,
        error: error.message
      };
    }

    // Análise final
    const allTestsPassed = Object.values(results.tests).every(test => test.success);
    const criticalTestsPassed = results.tests.phone_info?.success && results.tests.messages_api?.success;

    console.log('=== RESULTADO FINAL ===');
    console.log('Todos os testes passaram:', allTestsPassed);
    console.log('Testes críticos passaram:', criticalTestsPassed);

    return new Response(JSON.stringify({
      success: criticalTestsPassed,
      all_tests_passed: allTestsPassed,
      message: criticalTestsPassed ? 'Credenciais válidas!' : 'Problema com as credenciais',
      results,
      recommendations: criticalTestsPassed ? [
        'Credenciais estão corretas e funcionando',
        'API do WhatsApp Business está acessível',
        'Pronto para enviar mensagens'
      ] : [
        'Verifique se o WHATSAPP_API_KEY está correto',
        'Verifique se o WHATSAPP_PHONE_NUMBER_ID está correto',
        'Confirme se o token tem as permissões necessárias',
        'Verifique se a conta está ativa no WhatsApp Business'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro geral na verificação:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});