-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) NO SUPABASE
-- Projeto: Amigo Refrigerista Pro
-- Isolamento estrito de dados por usuário, proteção contra escalação de privilégio
-- e blindagem da tabela app_settings.
-- ==============================================================================

-- 1. Cria uma função segura para verificar se o usuário é Admin sem causar erro de recursão no RLS
-- Segurança: Exige is_admin = true marcado na tabela profiles E e-mail confirmado em auth.users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = auth.uid() 
      AND p.is_admin = true
      AND p.role = 'admin'
      AND u.email_confirmed_at IS NOT NULL
  );
END;
$$;

-- 2. Trigger de Segurança para impedir auto-escalação de privilégio em public.profiles
-- Impede que usuários comuns alterem suas próprias colunas is_admin, role ou plano via API client-side
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.role := OLD.role;
    NEW.plano := OLD.plano;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_profile_privilege_escalation();

-- 3. Tabela app_settings (Configurações sensíveis do Mercado Pago e WhatsApp)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  payment_provider TEXT DEFAULT 'mercadopago',
  mercadopago_access_token TEXT DEFAULT '',
  mercadopago_public_key TEXT DEFAULT '',
  webhook_secret TEXT DEFAULT '',
  pro_plan_price NUMERIC(10,2) DEFAULT 39.90,
  flex_plan_price NUMERIC(10,2) DEFAULT 19.90,
  maintenance_interval_months INTEGER DEFAULT 6,
  free_trial_days INTEGER DEFAULT 7,
  whatsapp_api_url TEXT DEFAULT '',
  whatsapp_api_key TEXT DEFAULT '',
  whatsapp_instance_name TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS estrito em app_settings: bloqueia chave anon e usuários comuns; somente Admin Master ou service_role
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Somente Admin Master acessa app_settings" ON public.app_settings;
CREATE POLICY "Somente Admin Master acessa app_settings"
ON public.app_settings
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Promoção de Admin Master (executada manualmente por ID/UUID confirmado, sem depender de e-mail fixo em código)
-- Exemplo manual no SQL Editor do Supabase após criar e confirmar sua conta:
-- UPDATE public.profiles SET is_admin = true, role = 'admin', plano = 'pro', updated_at = NOW()
-- WHERE id = '<UUID_DO_ADMIN_CONFIRMADO>';

-- 5. Habilitar RLS em todas as tabelas principais
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnostic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pmoc_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quick_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS PARA A TABELA 'profiles' (Perfil do Usuário com WITH CHECK anti-escalação)
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
)
WITH CHECK (
  public.is_admin() OR (
    auth.uid() = id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND plano = (SELECT p.plano FROM public.profiles p WHERE p.id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Permitir inserção de perfis" ON public.profiles;
CREATE POLICY "Permitir inserção de perfis"
ON public.profiles
FOR INSERT
WITH CHECK (
  public.is_admin() OR (
    auth.uid() = id
    AND is_admin = false
    AND role = 'user'
    AND plano IN ('free', 'trial')
  )
);

-- ==============================================================================
-- 7. POLÍTICAS PARA A TABELA 'work_orders' (Ordens de Serviço)
-- ==============================================================================
DROP POLICY IF EXISTS "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders;
CREATE POLICY "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders
    FOR ALL 
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 8. POLÍTICAS PARA DEMAIS TABELAS (Clientes, Diagnósticos, PMOC, Orçamentos, Suporte)
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
