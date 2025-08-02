-- Adicionar coluna para identificar tipo de mensagem (chip ou bot)
ALTER TABLE public.messages 
ADD COLUMN message_type text DEFAULT 'chip' CHECK (message_type IN ('chip', 'bot'));

-- Adicionar coluna para identificar se é do bot
ALTER TABLE public.messages 
ADD COLUMN from_bot boolean DEFAULT false;

-- Adicionar coluna para identificar se é para o bot  
ALTER TABLE public.messages 
ADD COLUMN to_bot boolean DEFAULT false;

-- Tornar os campos from_chip_id e to_chip_id opcionais (nullable)
ALTER TABLE public.messages 
ALTER COLUMN from_chip_id DROP NOT NULL;

ALTER TABLE public.messages 
ALTER COLUMN to_chip_id DROP NOT NULL;