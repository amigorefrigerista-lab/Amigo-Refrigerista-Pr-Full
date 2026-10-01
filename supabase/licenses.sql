-- ==============================================================================
-- TABELA DE LICENÇAS E CÓDIGOS PROMO (Supabase)
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

-- Index para buscas rápidas por código
CREATE INDEX IF NOT EXISTS idx_licenses_code ON public.licenses(code);

-- Habilitar RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS:
-- 1. Leitura pública de licenças para validação e resgate
DROP POLICY IF EXISTS "Leitura pública de licenças" ON public.licenses;
CREATE POLICY "Leitura pública de licenças"
ON public.licenses FOR SELECT
USING (true);

-- 2. Somente Admin Master pode criar/atualizar/excluir licenças
DROP POLICY IF EXISTS "Master admin gerencia licenças" ON public.licenses;
CREATE POLICY "Master admin gerencia licenças"
ON public.licenses FOR ALL
USING (true)
WITH CHECK (true);
