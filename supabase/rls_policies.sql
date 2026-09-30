-- ==============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) NO SUPABASE
-- Projeto: Amigo Refrigerista Pro
-- Isolamento estrito de dados por usuário utilizando auth.uid()
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas principais
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diagnostic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pmoc_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quick_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. POLÍTICAS PARA A TABELA 'profiles' (Perfil do Usuário)
-- Garante que cada usuário só pode ler, inserir ou atualizar o seu próprio registro.
-- ==============================================================================
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
    FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem inserir seu próprio perfil" ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 3. POLÍTICAS PARA A TABELA 'work_orders' (Ordens de Serviço)
-- Garante que usuários apenas leiam, criem, atualizem ou excluam suas próprias OS.
-- ==============================================================================
DROP POLICY IF EXISTS "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders;
CREATE POLICY "Isolamento completo de Ordens de Serviço por Usuário" ON public.work_orders
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 4. POLÍTICAS PARA DEMAIS TABELAS (Clientes, Diagnósticos, PMOC, Orçamentos, Suporte)
-- ==============================================================================

-- Clientes
DROP POLICY IF EXISTS "Isolamento de Clientes por Usuário" ON public.clients;
CREATE POLICY "Isolamento de Clientes por Usuário" ON public.clients
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Histórico de Diagnósticos
DROP POLICY IF EXISTS "Isolamento de Diagnósticos por Usuário" ON public.diagnostic_history;
CREATE POLICY "Isolamento de Diagnósticos por Usuário" ON public.diagnostic_history
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Planos PMOC
DROP POLICY IF EXISTS "Isolamento de PMOC por Usuário" ON public.pmoc_plans;
CREATE POLICY "Isolamento de PMOC por Usuário" ON public.pmoc_plans
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Orçamentos Rápidos
DROP POLICY IF EXISTS "Isolamento de Orçamentos por Usuário" ON public.quick_quotes;
CREATE POLICY "Isolamento de Orçamentos por Usuário" ON public.quick_quotes
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chamados de Suporte
DROP POLICY IF EXISTS "Usuários veem seus próprios chamados" ON public.support_tickets;
CREATE POLICY "Usuários veem seus próprios chamados" ON public.support_tickets
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam seus próprios chamados" ON public.support_tickets;
CREATE POLICY "Usuários criam seus próprios chamados" ON public.support_tickets
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
