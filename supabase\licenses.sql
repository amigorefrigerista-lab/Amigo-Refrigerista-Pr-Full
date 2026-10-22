-- ==============================================================================
-- TABELA DE LICENÇAS, RESGATES POR USUÁRIO E FUNÇÃO ATÔMICA (Supabase)
-- Projeto: Amigo Refrigerista Pro
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.licenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'promotional',
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_uses INTEGER NOT NULL DEFAULT 50,
    used_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_licenses_code ON public.licenses(code);

-- Tabela de controle de resgates por usuário (impede que o mesmo usuário resgate o mesmo código mais de uma vez)
CREATE TABLE IF NOT EXISTS public.license_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id TEXT NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    license_code TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (license_id, user_id),
    UNIQUE (license_code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_license_redemptions_user ON public.license_redemptions(user_id);

-- Habilitar RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_redemptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS:
-- CORREÇÃO CRÍTICA: Remove políticas de leitura pública/autenticada em public.licenses para impedir enumeração de códigos promocionais e de parceiros.
-- A rota /api/licenses opera via service_role e apenas o Admin Master pode gerenciar licenças.
DROP POLICY IF EXISTS "Leitura pública de licenças" ON public.licenses;
DROP POLICY IF EXISTS "Leitura autenticada de licenças ativas" ON public.licenses;

DROP POLICY IF EXISTS "Master admin gerencia licenças" ON public.licenses;
CREATE POLICY "Master admin gerencia licenças"
ON public.licenses FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Usuários leem seus próprios resgates" ON public.license_redemptions;
CREATE POLICY "Usuários leem seus próprios resgates"
ON public.license_redemptions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- FUNÇÃO SQL ATÔMICA PARA RESGATE DE LICENÇA (redeem_license_atomic)
-- - SECURITY DEFINER com SET search_path = public
-- - Restrita exclusivamente à role service_role (REVOKE ALL FROM PUBLIC, anon, authenticated)
-- - Faz lock da linha da licença (FOR UPDATE) para evitar condição de corrida em used_count
-- - Impede que o mesmo usuário resgate a mesma licença mais de uma vez
-- - Impede que um assinante pago ativo ('pro', 'pro_paid', 'flex') seja rebaixado para 'pro_trial'
-- - Incrementa used_count atomicamente e grava plan_expires_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.redeem_license_atomic(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_code TEXT := upper(trim(p_code));
    v_license RECORD;
    v_profile RECORD;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    IF p_user_id IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Código ou usuário inválido.');
    END IF;

    -- 1. Lock exclusivo na linha da licença (FOR UPDATE) para atomicidade sob concorrência
    SELECT *
    INTO v_license
    FROM public.licenses
    WHERE code = v_clean_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Código de licença não encontrado ou inválido.');
    END IF;

    IF NOT v_license.active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta licença foi desativada pelo administrador.');
    END IF;

    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este código de licença já expirou.');
    END IF;

    IF v_license.used_count >= v_license.max_uses THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta licença atingiu o limite máximo de usuários.');
    END IF;

    -- 2. Verifica se este usuário já resgatou este código anteriormente
    IF EXISTS (
        SELECT 1
        FROM public.license_redemptions
        WHERE (license_id = v_license.id OR license_code = v_clean_code)
          AND user_id = p_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você já utilizou este código promocional anteriormente.');
    END IF;

    -- 3. Verifica se o usuário já possui assinatura paga ativa para não rebaixá-lo para pro_trial
    SELECT *
    INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_profile.plano IN ('pro', 'pro_paid', 'flex')
           AND COALESCE(v_profile.subscription_status, 'active') = 'active'
           AND (v_profile.plan_expires_at IS NULL OR v_profile.plan_expires_at > NOW()) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Você já possui uma assinatura paga ativa. Não é necessário aplicar licença de avaliação.'
            );
        END IF;
    END IF;

    v_expires_at := NOW() + (COALESCE(v_license.duration_days, 30) || ' days')::INTERVAL;

    -- 4. Registra o resgate único por usuário
    INSERT INTO public.license_redemptions (license_id, license_code, user_id, redeemed_at, expires_at)
    VALUES (v_license.id, v_clean_code, p_user_id, NOW(), v_expires_at);

    -- 5. Incrementa used_count atomicamente
    UPDATE public.licenses
    SET used_count = used_count + 1
    WHERE id = v_license.id;

    -- 6. Atualiza o perfil do usuário com pro_trial e data de expiração
    UPDATE public.profiles
    SET plano = 'pro_trial',
        subscription_status = 'active',
        plan_expires_at = v_expires_at,
        license_key_used = v_clean_code,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'duration_days', COALESCE(v_license.duration_days, 30),
        'end_date', to_char(v_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
        'expires_at', v_expires_at,
        'plan', 'pro_trial'
    );
END;
$$;

-- Restringe execução da RPC exclusivamente ao service_role (impede chamada direta via cliente anon/authenticated)
REVOKE ALL ON FUNCTION public.redeem_license_atomic(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_license_atomic(uuid, text) TO service_role;
