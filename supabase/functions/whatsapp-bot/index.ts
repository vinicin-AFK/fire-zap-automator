import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const whatsappAccessToken = Deno.env.get('WHATSAPP_API_KEY');
const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== WhatsApp Bot Function Called ===');
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { message, chipName, isInitiatedByBot, phoneNumber, sendMessage } = body;

    // Validate required parameters
    if (!message) {
      console.error('Missing required parameter: message');
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!chipName) {
      console.error('Missing required parameter: chipName');
      return new Response(JSON.stringify({ error: 'Chip name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate OpenAI API key
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ All validations passed');

    let systemPrompt = `Você é um assistente virtual amigável conversando via WhatsApp. Responda de forma natural e casual, como se fosse uma pessoa real. Use emojis ocasionalmente. Mantenha as respostas curtas e naturais, típicas de WhatsApp. O nome do chip que está conversando com você é ${chipName}.`;

    if (isInitiatedByBot) {
      systemPrompt += ` Você está iniciando uma conversa casual. Seja amigável e perguntador, como se fosse um amigo checando como a pessoa está.`;
    }

    console.log('🤖 Calling OpenAI API...');
    console.log('System prompt:', systemPrompt);
    console.log('User message:', message);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status} - ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response data:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid OpenAI response structure:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from OpenAI - no choices found' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const botResponse = data.choices[0].message.content;
    console.log('✅ Bot response generated:', botResponse);

    // Se sendMessage for true, enviar a mensagem via WhatsApp Business API oficial
    if (sendMessage && phoneNumber && phoneNumberId) {
      try {
        // Endpoint oficial da API do WhatsApp Business v19.0
        const whatsappApiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        
        console.log(`Enviando mensagem via WhatsApp Business API para ${phoneNumber}`);
        console.log('URL:', whatsappApiUrl);
        
        const whatsappResponse = await fetch(whatsappApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { 
              body: botResponse 
            }
          }),
        });

        const whatsappData = await whatsappResponse.json();
        console.log('Resposta da API WhatsApp:', whatsappData);

        if (!whatsappResponse.ok) {
          console.error('WhatsApp Business API error:', whatsappData);
          throw new Error(`WhatsApp API error: ${whatsappData.error?.message || 'Unknown error'}`);
        }

        console.log(`✅ Mensagem enviada com sucesso via WhatsApp Business API para ${phoneNumber}`);
        console.log('Message ID:', whatsappData.messages?.[0]?.id);
        
      } catch (whatsappError) {
        console.error('❌ Erro ao enviar mensagem WhatsApp:', whatsappError);
        return new Response(JSON.stringify({ 
          error: `Failed to send WhatsApp message: ${whatsappError.message}`,
          response: botResponse 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ 
      response: botResponse,
      timestamp: new Date().toISOString(),
      sent_via_whatsapp: sendMessage && phoneNumber ? true : false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in whatsapp-bot function:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback response para não quebrar o aquecimento
    const fallbackResponse = "Olá! Como você está? 😊";
    
    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      sent_via_whatsapp: false,
      error: "Bot temporarily unavailable, using fallback response"
    }), {
      status: 200, // Status 200 para não quebrar o fluxo
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});