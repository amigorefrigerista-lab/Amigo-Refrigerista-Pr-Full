-- ==============================================================================
-- TABELA DE PERMISSÕES DE SUPORTE ADMIN (Supabase)
-- ==============================================================================

-- 1. Cria a tabela de permissões de acesso ao Canal Suporte Admin
CREATE TABLE IF NOT EXISTS public.support_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    granted_by TEXT NOT NULL DEFAULT 'amigorefrigerista@gmail.com',
    role TEXT NOT NULL DEFAULT 'atendente', -- 'admin' ou 'atendente'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insere o administrador master padrão amigorefrigerista@gmail.com
INSERT INTO public.support_permissions (user_email, granted_by, role, is_active)
VALUES ('amigorefrigerista@gmail.com', 'system', 'admin', true)
ON CONFLICT (user_email) DO UPDATE 
SET role = 'admin', is_active = true, updated_at = NOW();

-- 3. Habilita RLS
ALTER TABLE public.support_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Função auxiliar para verificar permissão no suporte admin
CREATE OR REPLACE FUNCTION public.has_support_permission()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.support_permissions
    WHERE lower(user_email) = lower(auth.jwt()->>'email')
      AND is_active = true
  ) OR (lower(auth.jwt()->>'email') = 'amigorefrigerista@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Políticas de RLS para support_permissions
DROP POLICY IF EXISTS "Leitura de permissões de suporte" ON public.support_permissions;
CREATE POLICY "Leitura de permissões de suporte"
ON public.support_permissions
FOR SELECT
USING (public.has_support_permission());

DROP POLICY IF EXISTS "Apenas Master Admin gerencia permissões" ON public.support_permissions;
CREATE POLICY "Apenas Master Admin gerencia permissões"
ON public.support_permissions
FOR ALL
USING (lower(auth.jwt()->>'email') = 'amigorefrigerista@gmail.com')
WITH CHECK (lower(auth.jwt()->>'email') = 'amigorefrigerista@gmail.com');

-- 6. Tabela de Mensagens do Chat de Suporte Admin
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_room_id TEXT NOT NULL DEFAULT 'geral',
    sender_email TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'usuario', -- 'usuario', 'admin', 'atendente'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso às mensagens de suporte" ON public.support_messages;
CREATE POLICY "Acesso às mensagens de suporte"
ON public.support_messages
FOR ALL
USING (
  lower(sender_email) = lower(auth.jwt()->>'email') OR public.has_support_permission()
)
WITH CHECK (
  lower(sender_email) = lower(auth.jwt()->>'email') OR public.has_support_permission()
);
