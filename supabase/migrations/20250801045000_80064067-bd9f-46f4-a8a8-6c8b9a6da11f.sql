-- Adicionar suporte para mensagens externas e habilitar realtime
ALTER TABLE public.messages 
  ALTER COLUMN from_chip_id DROP NOT NULL,
  ALTER COLUMN to_chip_id DROP NOT NULL;

-- Permitir valores especiais para chips externos
COMMENT ON COLUMN public.messages.from_chip_id IS 'UUID do chip remetente ou "external" para usuários externos do WhatsApp';
COMMENT ON COLUMN public.messages.to_chip_id IS 'UUID do chip destinatário ou "external" para usuários externos do WhatsApp';

-- Adicionar campo para ID da mensagem do WhatsApp (opcional)
ALTER TABLE public.messages 
  ADD COLUMN whatsapp_message_id TEXT;

-- Habilitar realtime para a tabela messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id_sent_at ON public.messages(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON public.messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;