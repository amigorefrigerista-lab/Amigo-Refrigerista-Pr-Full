-- ==============================================================================
-- TABELA DE CONFIGURAÇÕES DE API DO WHATSAPP (Supabase)
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
    template_orcamento TEXT DEFAULT 'Olá {nome_cliente}! Segue o seu orçamento para {equipamento} no valor de R$ {valor}. Acesse o laudo completo aqui: {link_pdf}',
    template_agendamento TEXT DEFAULT 'Olá {nome_cliente}! Confirmamos o agendamento da manutenção no seu {equipamento} para {data_servico}. Dúvidas? Fale conosco!',
    template_lembrete TEXT DEFAULT 'Olá {nome_cliente}! Passando para lembrar que está na hora da higienização/manutenção preventiva do seu {equipamento}. Vamos agendar?',
    template_pos_venda TEXT DEFAULT 'Olá {nome_cliente}! Como está o funcionamento do seu {equipamento}? Agradecemos a preferência e conte conosco para a garantia!',
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
