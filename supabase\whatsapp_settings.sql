-- ==============================================================================
-- TABELA DE CONFIGURAÇÕES DE API DO WHATSAPP E WEBHOOKS (Supabase)
-- Projeto: Amigo Refrigerista Pro
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_provider TEXT NOT NULL DEFAULT 'evolution_api',
    api_url TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    instance_name TEXT DEFAULT '',
    phone_number TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    
    -- Webhook Settings
    webhook_url TEXT DEFAULT '',
    webhook_secret TEXT DEFAULT '',
    webhook_events JSONB DEFAULT '["CONFIRMACOES_OS", "ORCAMENTOS", "LEMBRETES"]'::jsonb,
    listen_confirmations BOOLEAN DEFAULT true,

    -- Templates
    template_orcamento TEXT DEFAULT 'Olá {{nome}}! Segue o seu orçamento para {{servico}} no valor de R$ {{valor}}. Acesse a proposta completa no link!',
    template_agendamento TEXT DEFAULT 'Olá {{nome}}! Confirmamos o agendamento do serviço de {{servico}} para a data {{data}}. Qualquer dúvida, fale conosco!',
    template_lembrete TEXT DEFAULT 'Olá {{nome}}! Passando para lembrar que está no prazo para a manutenção preventiva de {{servico}}. Vamos agendar para {{data}}?',
    template_pos_venda TEXT DEFAULT 'Olá {{nome}}! Como está o funcionamento do seu equipamento após o serviço de {{servico}}? Agradecemos a preferência!',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_whatsapp_settings UNIQUE (user_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias configurações de WhatsApp" ON public.whatsapp_settings;
CREATE POLICY "Usuários gerenciam suas próprias configurações de WhatsApp"
ON public.whatsapp_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
