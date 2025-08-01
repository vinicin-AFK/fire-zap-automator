# 🔥 FIRE ZAP - Projeto Completo

## 📋 Descrição do Projeto
Fire Zap é uma plataforma de automação e gerenciamento do WhatsApp Business API. Permite conectar números, enviar mensagens automatizadas, usar IA para respostas, e fazer aquecimento de contas.

## 🏗️ Arquitetura
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Integrações**: WhatsApp Business API + OpenAI API
- **Autenticação**: Supabase Auth

## 📁 Estrutura do Projeto

```
fire-zap/
├── src/
│   ├── components/
│   │   ├── ui/ (shadcn/ui components)
│   │   └── MessagesSidebar.tsx
│   ├── pages/
│   │   ├── Index.tsx (landing page)
│   │   ├── Auth.tsx (login/signup)
│   │   ├── Dashboard.tsx (painel principal)
│   │   ├── ConnectNumber.tsx (conectar WhatsApp)
│   │   ├── Heating.tsx (aquecimento de contas)
│   │   └── VerifyCredentials.tsx (testar credenciais)
│   ├── integrations/supabase/
│   │   ├── client.ts
│   │   └── types.ts
│   └── lib/utils.ts
├── supabase/
│   ├── functions/
│   │   ├── whatsapp-webhook/
│   │   ├── whatsapp-bot/
│   │   ├── whatsapp-qr/
│   │   └── verify-whatsapp-credentials/
│   └── config.toml
└── package.json
```

## 🗄️ Schema do Banco (Supabase)

```sql
-- Tabela de perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de chips/números do WhatsApp
CREATE TABLE chips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'connecting',
  connected BOOLEAN DEFAULT false,
  messages_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id UUID REFERENCES chips(id),
  sender_phone TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  direction TEXT NOT NULL, -- 'incoming' ou 'outgoing'
  is_bot_message BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Políticas RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para chips
CREATE POLICY "Users can view own chips" ON chips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chips" ON chips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chips" ON chips FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para messages
CREATE POLICY "Users can view messages from own chips" ON messages FOR SELECT 
USING (chip_id IN (SELECT id FROM chips WHERE user_id = auth.uid()));
```

## 🚀 Principais Funcionalidades

### 1. **Autenticação** (src/pages/Auth.tsx)
```typescript
// Sistema de login/registro com Supabase Auth
// Redirecionamento automático após login
// Validação de formulários
```

### 2. **Dashboard** (src/pages/Dashboard.tsx)
```typescript
// Listagem de chips conectados
// Estatísticas em tempo real
// Navegação para outras funcionalidades
// Sidebar com mensagens recentes
```

### 3. **Conectar Número** (src/pages/ConnectNumber.tsx)
```typescript
// Cadastro de novos números WhatsApp
// Geração de QR Code (real via API ou demo)
// Integração com WhatsApp Business API
// Simulação de conexão
```

### 4. **Aquecimento** (src/pages/Heating.tsx)
```typescript
// Sistema de aquecimento de contas WhatsApp
// Envio automatizado de mensagens
// Integração com OpenAI para respostas variadas
// Controle de velocidade e quantidade
```

### 5. **Verificação de Credenciais** (src/pages/VerifyCredentials.tsx)
```typescript
// Teste de conectividade com WhatsApp API
// Validação de tokens e permissões
// Diagnóstico completo de problemas
// Interface visual de resultados
```

## ⚡ Edge Functions (Supabase)

### 1. **whatsapp-webhook** (Webhook do WhatsApp)
```typescript
// Recebe mensagens do WhatsApp Business API
// Processa mensagens incoming
// Chama o bot para gerar respostas
// Atualiza banco de dados
```

### 2. **whatsapp-bot** (Bot com IA)
```typescript
// Integração com OpenAI GPT-4o-mini
// Geração de respostas contextuais
// Envio de mensagens via WhatsApp API
// Sistema de fallback para erros
```

### 3. **whatsapp-qr** (Geração de QR Code)
```typescript
// Gera QR codes reais via WhatsApp Business API
// Fallback para QR codes de demonstração
// Integração com Facebook Graph API
```

### 4. **verify-whatsapp-credentials** (Verificação)
```typescript
// Testa credenciais do WhatsApp Business API
// Verifica conectividade e permissões
// Retorna diagnóstico detalhado
// Recomendações de correção
```

## 🔧 Configurações Necessárias

### Secrets do Supabase:
```
WHATSAPP_API_KEY=seu_token_da_meta
WHATSAPP_PHONE_NUMBER_ID=id_do_numero
OPENAI_API_KEY=sua_chave_openai
SUPABASE_URL=url_do_projeto
SUPABASE_ANON_KEY=chave_anonima
SUPABASE_SERVICE_ROLE_KEY=chave_service_role
```

### URLs importantes:
```
- WhatsApp Business API: https://graph.facebook.com/v18.0/
- OpenAI API: https://api.openai.com/v1/
- Webhook URL: https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-webhook
```

## 📱 Fluxo Principal da Aplicação

1. **Usuário faz login** → Auth.tsx
2. **Vai para Dashboard** → Dashboard.tsx 
3. **Conecta um número** → ConnectNumber.tsx
4. **Testa credenciais** → VerifyCredentials.tsx
5. **Inicia aquecimento** → Heating.tsx
6. **Recebe mensagens** → whatsapp-webhook
7. **Bot responde** → whatsapp-bot
8. **Visualiza no Dashboard** → MessagesSidebar.tsx

## 🎨 Design System
- **Cores**: Sistema semântico com variáveis CSS (--primary, --secondary, etc.)
- **Componentes**: shadcn/ui customizados
- **Responsivo**: Mobile-first com Tailwind CSS
- **Tema**: Suporte a dark/light mode

## 🔄 Estado Atual do Projeto

✅ **Implementado:**
- Sistema de autenticação completo
- Dashboard funcional com listagem de chips
- Conexão de números (com QR code demo)
- Sistema de aquecimento robusto
- Bot com IA integrado
- Webhook para receber mensagens
- Verificação de credenciais

🚧 **Em desenvolvimento:**
- QR code real da API do WhatsApp
- Conexão real via webhook
- Painel de estatísticas avançadas
- Sistema de templates de mensagens

## 💡 Próximos Passos Sugeridos

1. **Finalizar integração real** com WhatsApp Business API
2. **Implementar webhook de status** de mensagens
3. **Adicionar sistema de templates** de mensagens
4. **Criar dashboard de analytics** avançado
5. **Implementar sistema de agendamento** de mensagens
6. **Adicionar suporte a mídias** (imagens, áudios, vídeos)

---

**Tecnologias:** React, TypeScript, Tailwind CSS, Supabase, WhatsApp Business API, OpenAI API

**Status:** Em desenvolvimento ativo, funcionalidades core implementadas