import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client for database operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// WhatsApp verification token (configure this secret)
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'fire_zap_webhook_token';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  try {
    // GET request for webhook verification
    if (req.method === 'GET') {
      console.log('GET request received for webhook verification');
      
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Verification params:', { mode, token, challenge });

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully');
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      } else {
        console.log('❌ Webhook verification failed');
        return new Response('Verification failed', {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }
    }

    // POST request for receiving messages
    if (req.method === 'POST') {
      console.log('POST request received - processing webhook');
      
      const body = await req.json();
      console.log('Webhook payload:', JSON.stringify(body, null, 2));

      // Process WhatsApp webhook
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;
              
              // Process incoming messages
              if (value.messages) {
                for (const message of value.messages) {
                  await processIncomingMessage(message, value.metadata);
                }
              }
              
              // Process message status updates
              if (value.statuses) {
                for (const status of value.statuses) {
                  await processMessageStatus(status);
                }
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processIncomingMessage(message: any, metadata: any) {
  try {
    console.log('Processing incoming message:', message);
    
    const fromPhone = message.from;
    const text = message.text?.body || '';
    const messageType = message.type;
    const phoneNumberId = metadata.phone_number_id;

    // Find the chip that corresponds to this phone number
    const { data: chip, error: chipError } = await supabase
      .from('chips')
      .select('*')
      .eq('phone_number', `+${fromPhone}`)
      .single();

    if (chipError || !chip) {
      console.log('No chip found for phone number:', fromPhone);
      return;
    }

    // Save the incoming message to the database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: chip.user_id,
        from_chip_id: 'external', // From external WhatsApp user
        to_chip_id: chip.id,
        content: text,
        status: 'received'
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return;
    }

    console.log('✅ Message saved successfully');

    // Generate bot response using the whatsapp-bot function
    try {
      const { data: botResponse, error: botError } = await supabase.functions.invoke('whatsapp-bot', {
        body: {
          message: text,
          chipName: chip.name,
          isInitiatedByBot: false,
          phoneNumber: fromPhone,
          sendMessage: true
        }
      });

      if (botError) {
        console.error('Error calling bot function:', botError);
      } else {
        console.log('✅ Bot response sent:', botResponse);
        
        // Save bot response to database
        await supabase
          .from('messages')
          .insert({
            user_id: chip.user_id,
            from_chip_id: chip.id,
            to_chip_id: 'external',
            content: botResponse.response,
            status: 'sent'
          });
      }
    } catch (botError) {
      console.error('Error with bot response:', botError);
    }

    // Update chip's last activity and message count
    await supabase
      .from('chips')
      .update({
        last_activity: new Date().toISOString(),
        messages_count: chip.messages_count + 1
      })
      .eq('id', chip.id);

  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

async function processMessageStatus(status: any) {
  try {
    console.log('Processing message status:', status);
    
    const messageId = status.id;
    const statusValue = status.status; // sent, delivered, read, failed
    
    // Update message status in database if we have the message ID stored
    // Note: You'd need to modify the messages table to store WhatsApp message IDs
    console.log(`Message ${messageId} status: ${statusValue}`);
    
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}