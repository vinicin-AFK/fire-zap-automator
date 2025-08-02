-- Desabilitar confirmação de email no Supabase
-- Nota: Esta migração configura as políticas para permitir usuários não confirmados

-- Permitir que usuários não confirmados façam login
UPDATE auth.config 
SET value = 'false' 
WHERE parameter = 'enable_signup';

-- Como alternativa, você pode desabilitar a confirmação de email nas configurações do Supabase:
-- 1. Vá para Authentication > Settings
-- 2. Desmarque "Enable email confirmations"
-- 3. Salve as alterações

-- Esta migração é informativa - as configurações de email devem ser feitas no painel do Supabase