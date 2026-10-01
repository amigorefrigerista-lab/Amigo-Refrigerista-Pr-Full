-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) NO SUPABASE
-- Projeto: Amigo Refrigerista Pro
-- Isolamento estrito de dados por usuário utilizando auth.uid() e função is_admin()
-- ==============================================================================

-- 1. Cria uma função segura para verificar se o usuário é Admin sem causar erro de recursão no RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
      AND (is_admin = true OR lower(email) = 'amigorefrigerista@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garante que seu perfil existe e define permissões totais no 'public.profiles'
INSERT INTO public.profiles (id, email, is_admin, plano)
SELECT id, email, true, 'pro'
FROM auth.users
WHERE lower(email) = 'amigorefrigerista@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET is_admin = true,
    plano = 'pro',
    updated_at = NOW();

-- 3. Atualiza os metadados dentro da tabela de autenticação do Supabase (para Middlewares/JWT)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true, "role": "admin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true, "role": "admin"}'::jsonb
WHERE lower(email) = 'amigorefrigerista@gmail.com';

-- 4. Habilitar RLS em todas as tabelas principais
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnostic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pmoc_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quick_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS PARA A TABELA 'profiles' (Perfil do Usuário)
DROP POLICY IF EXISTS "Permitir leitura de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura de perfis"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR public.is_admin()
);

DROP POLICY IF EXISTS "Permitir atualização de perfis" ON public.profiles;
CREATE POLICY "Permitir atualização de perfis"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id OR public.is_admin()
);

DROP POLICY IF EXISTS "Permitir inserção de perfis" ON public.profiles;
CREATE POLICY "Permitir inserção de perfis"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id OR public.is_admin()
);

-- ==============================================================================
-- 6. POLÍTICAS PARA A TABELA 'work_orders' (Ordens de Serviço)
-- ==============================================================================
DROP POLICY IF EXISTS "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders;
CREATE POLICY "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 7. POLÍTICAS PARA DEMAIS TABELAS (Clientes, Diagnósticos, PMOC, Orçamentos, Suporte)
-- ==============================================================================

-- Clientes
DROP POLICY IF EXISTS "Isolamento de Clientes por Usuário" ON public.clients;
CREATE POLICY "Isolamento de Clientes por Usuário" ON public.clients
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Histórico de Diagnósticos
DROP POLICY IF EXISTS "Isolamento de Diagnósticos por Usuário" ON public.diagnostic_history;
CREATE POLICY "Isolamento de Diagnósticos por Usuário" ON public.diagnostic_history
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Planos PMOC
DROP POLICY IF EXISTS "Isolamento de PMOC por Usuário" ON public.pmoc_plans;
CREATE POLICY "Isolamento de PMOC por Usuário" ON public.pmoc_plans
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Orçamentos Rápidos
DROP POLICY IF EXISTS "Isolamento de Orçamentos por Usuário" ON public.quick_quotes;
CREATE POLICY "Isolamento de Orçamentos por Usuário" ON public.quick_quotes
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Chamados de Suporte
DROP POLICY IF EXISTS "Usuários veem seus próprios chamados" ON public.support_tickets;
CREATE POLICY "Usuários veem seus próprios chamados" ON public.support_tickets
    FOR SELECT 
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Usuários criam seus próprios chamados" ON public.support_tickets;
CREATE POLICY "Usuários criam seus próprios chamados" ON public.support_tickets
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

