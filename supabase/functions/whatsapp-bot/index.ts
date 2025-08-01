import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chipName, isInitiatedByBot, phoneNumber, sendMessage } = await req.json();

    // Validate WhatsApp API key format
    if (!whatsappApiKey) {
      return new Response(JSON.stringify({ error: 'WhatsApp API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyPattern = /^HX[0-9a-fA-F]{32}$/;
    if (!keyPattern.test(whatsappApiKey)) {
      return new Response(JSON.stringify({ error: 'Invalid WhatsApp API key format' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = `Você é um assistente virtual amigável conversando via WhatsApp. Responda de forma natural e casual, como se fosse uma pessoa real. Use emojis ocasionalmente. Mantenha as respostas curtas e naturais, típicas de WhatsApp. O nome do chip que está conversando com você é ${chipName}.`;

    if (isInitiatedByBot) {
      systemPrompt += ` Você está iniciando uma conversa casual. Seja amigável e perguntador, como se fosse um amigo checando como a pessoa está.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    const botResponse = data.choices[0].message.content;

    // Se sendMessage for true, enviar a mensagem via WhatsApp API
    if (sendMessage && phoneNumber) {
      try {
        const whatsappResponse = await fetch('https://api.whatsapp.com/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            text: { body: botResponse }
          }),
        });

        if (!whatsappResponse.ok) {
          console.error('WhatsApp API error:', await whatsappResponse.text());
        }

        console.log(`Message sent via WhatsApp to ${phoneNumber}: ${botResponse}`);
      } catch (whatsappError) {
        console.error('Error sending WhatsApp message:', whatsappError);
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
    console.error('Error in whatsapp-bot function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});