-- Verificar constraint atual e corrigir valores permitidos para status
ALTER TABLE public.chips DROP CONSTRAINT IF EXISTS chips_status_check;

-- Adicionar constraint com valores corretos incluindo 'connecting'
ALTER TABLE public.chips 
ADD CONSTRAINT chips_status_check 
CHECK (status IN ('inactive', 'connecting', 'active', 'disconnected', 'error'));