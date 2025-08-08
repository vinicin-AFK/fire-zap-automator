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
    const { phone_number } = await req.json();
    
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp API credentials not configured');
    }

    console.log(`Generating QR code for phone number: ${phone_number}`);

    // Gerar QR code através da API do WhatsApp Business
    const qrResponse = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/qr_codes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefilled_message: `Conectando número ${phone_number} ao Fire Zap`,
        generate_qr_image: "PNG"
      }),
    });

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error('WhatsApp API error:', errorText);
      throw new Error(`WhatsApp API error: ${qrResponse.status}`);
    }

    const qrData = await qrResponse.json();
    console.log('QR code generated successfully:', qrData);

    return new Response(JSON.stringify({
      success: true,
      qr_code_url: qrData.qr_image_url,
      qr_code: qrData.code,
      prefilled_message: qrData.prefilled_message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-qr function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});