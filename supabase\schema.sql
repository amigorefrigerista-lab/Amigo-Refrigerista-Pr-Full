-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- Projeto: Amigo Refrigerista Pro
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUIDs (caso ainda não esteja ativa)
create extension if not exists "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (Profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nome text default '',
  telefone text default '',
  empresa text default '',
  cnpj_cpf text default '',
  is_admin boolean default false,
  role text default 'user',
  plano text default 'free',
  subscription_status text default 'active',
  plan_expires_at timestamp with time zone,
  active_payment_id text,
  active_preapproval_id text,
  license_key_used text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Clientes (Clientes cadastrados pelos técnicos)
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nome text not null,
  telefone text,
  whatsapp text,
  email text,
  documento text,
  endereco text,
  cidade text,
  bairro text,
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Ordens de Serviço (Work Orders / OS)
create table if not exists public.work_orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  client_id uuid references public.clients on delete set null,
  cliente_nome text not null,
  cliente_telefone text,
  cliente_endereco text,
  equipamento text not null,
  marca text,
  modelo text,
  capacidade text,
  defeito_reclamado text,
  diagnostico_tecnico text,
  solucao_aplicada text,
  pecas_utilizadas text,
  valor_mao_obra numeric(10,2) default 0.00,
  valor_pecas numeric(10,2) default 0.00,
  valor_total numeric(10,2) default 0.00,
  status text default 'aberto', -- aberto, aprovado, em_andamento, concluido, cancelado
  data_agendamento timestamp with time zone,
  data_conclusao timestamp with time zone,
  fotos text[],
  garantia_dias integer default 90,
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Histórico de Diagnósticos por IA e Erros
create table if not exists public.diagnostic_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tipo text not null, -- 'error_code', 'symptom_ai', 'board_vision', 'superheat'
  marca text,
  codigo_erro text,
  descricao text,
  resultado_ia jsonb,
  parametros jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela de Planos PMOC (Plano de Manutenção, Operação e Controle)
create table if not exists public.pmoc_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  client_id uuid references public.clients on delete cascade,
  cliente_nome text not null,
  edificio text,
  responsavel_tecnico text,
  registro_crea_cft text,
  quantidade_ambientes integer default 1,
  capacidade_total_btu integer default 0,
  status text default 'ativo',
  detalhes jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Tabela de Orçamentos Rápidos (Quotes)
create table if not exists public.quick_quotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  cliente_nome text not null,
  servicos jsonb default '[]'::jsonb,
  valor_total numeric(10,2) default 0.00,
  validade_dias integer default 15,
  status text default 'pendente', -- pendente, aprovado, recusado
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tabela de Suporte & Chamados Técnicos
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  user_email text not null,
  assunto text not null,
  mensagem text not null,
  status text default 'aberto', -- aberto, em_atendimento, resolvido
  resposta_admin text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- TRIGGER AUTOMÁTICO PARA CRIAR PERFIL AO CADASTRAR NOVO USUÁRIO
-- Segurança: Nunca concede privilégio de admin automaticamente pelo e-mail no cadastro.
-- O papel admin (is_admin = true, role = 'admin') só pode ser atribuído manualmente no banco pelo DBA/service_role.
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, role, is_admin, plano)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    false,
    'free'
  );
  return new;
end;
$$;

-- Trigger disparado no evento de criação de usuário do auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) PARA TODAS AS TABELAS
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.work_orders enable row level security;
alter table public.diagnostic_history enable row level security;
alter table public.pmoc_plans enable row level security;
alter table public.quick_quotes enable row level security;
alter table public.support_tickets enable row level security;

-- POLÍTICAS RLS (Segurança estrita: cada usuário acessa apenas os seus dados)

-- Profiles
create policy "Usuários podem ver seu próprio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Usuários podem atualizar seu próprio perfil sem escalar privilégio" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and plano = (select p.plano from public.profiles p where p.id = auth.uid())
  );

-- Clients
create policy "Usuários gerenciam seus clientes" on public.clients
  for all using (auth.uid() = user_id);

-- Work Orders
create policy "Usuários gerenciam suas ordens de serviço" on public.work_orders
  for all using (auth.uid() = user_id);

-- Diagnostic History
create policy "Usuários gerenciam seu histórico de diagnósticos" on public.diagnostic_history
  for all using (auth.uid() = user_id);

-- PMOC Plans
create policy "Usuários gerenciam seus planos PMOC" on public.pmoc_plans
  for all using (auth.uid() = user_id);

-- Quick Quotes
create policy "Usuários gerenciam seus orçamentos" on public.quick_quotes
  for all using (auth.uid() = user_id);

-- Support Tickets
create policy "Usuários veem seus chamados" on public.support_tickets
  for select using (auth.uid() = user_id);

create policy "Usuários criam chamados" on public.support_tickets
  for insert with check (auth.uid() = user_id);

-- 9. Tabela de Confirmações de Clientes via Webhook do WhatsApp
create table if not exists public.whatsapp_confirmations (
  id uuid default gen_random_uuid() primary key,
  sender_phone text not null,
  message_text text not null,
  confirmation_status text not null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Tabela de Rate Limiting Persistente
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamp with time zone not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Tabela de Cota Mensal Persistente (OS e Consultas de IA)
create table if not exists public.monthly_quotas (
  id uuid default gen_random_uuid() primary key,
  user_key text not null,
  month_key text not null,
  orders_used integer not null default 0,
  ai_queries_used integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_key, month_key)
);

alter table public.whatsapp_confirmations enable row level security;
alter table public.rate_limits enable row level security;
alter table public.monthly_quotas enable row level security;

-- 12. Tabela de Pagamentos Processados (Idempotência de Webhook + Vínculo de Revogação por payment_id)
create table if not exists public.processed_payments (
  payment_id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text,
  plan text not null,
  status text not null, -- 'approved', 'refunded', 'charged_back'
  amount numeric(10,2) default 0.00,
  approved_at timestamp with time zone,
  expires_at timestamp with time zone,
  processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.processed_payments enable row level security;

-- 13. Função SQL Atômica para Rate Limit (INSERT ... ON CONFLICT DO UPDATE RETURNING)
create or replace function public.increment_rate_limit_atomic(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_next_reset timestamp with time zone := v_now + (p_window_ms || ' milliseconds')::interval;
  v_row public.rate_limits%rowtype;
  v_retry_seconds integer;
begin
  insert into public.rate_limits (key, count, reset_at, updated_at)
  values (p_key, 1, v_next_reset, v_now)
  on conflict (key) do update
  set count = case
      when public.rate_limits.reset_at <= v_now then 1
      else public.rate_limits.count + 1
    end,
    reset_at = case
      when public.rate_limits.reset_at <= v_now then v_next_reset
      else public.rate_limits.reset_at
    end,
    updated_at = v_now
  returning * into v_row;

  v_retry_seconds := greatest(1, ceil(extract(epoch from (v_row.reset_at - v_now)))::integer);

  if v_row.count > p_max_requests then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retryAfterSeconds', v_retry_seconds
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, p_max_requests - v_row.count),
    'retryAfterSeconds', 0
  );
end;
$$;

revoke all on function public.increment_rate_limit_atomic(text, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_rate_limit_atomic(text, integer, integer) to service_role;

-- 14. Função SQL Atômica para Cota Mensal (INSERT ON CONFLICT DO NOTHING + UPDATE condicional WHERE uso < p_max_limit)
create or replace function public.increment_monthly_quota_atomic(
  p_user_key text,
  p_month_key text,
  p_feature text,
  p_max_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamp with time zone := timezone('utc'::text, now());
  v_row public.monthly_quotas%rowtype;
  v_used integer;
begin
  -- 1. Garante que a linha do usuário/mês existe com contadores zerados sem sobrescrever se já existir
  insert into public.monthly_quotas (user_key, month_key, orders_used, ai_queries_used, updated_at)
  values (p_user_key, p_month_key, 0, 0, v_now)
  on conflict (user_key, month_key) do nothing;

  -- 2. Incrementa atomicamente SOMENTE se o contador atual estiver estritamente abaixo do limite (uso < p_max_limit)
  if p_feature = 'orders' then
    update public.monthly_quotas
    set orders_used = orders_used + 1,
        updated_at = v_now
    where user_key = p_user_key
      and month_key = p_month_key
      and orders_used < p_max_limit
    returning * into v_row;
  else
    update public.monthly_quotas
    set ai_queries_used = ai_queries_used + 1,
        updated_at = v_now
    where user_key = p_user_key
      and month_key = p_month_key
      and ai_queries_used < p_max_limit
    returning * into v_row;
  end if;

  -- 3. Se nenhuma linha foi atualizada (NOT FOUND), o limite mensal já foi atingido: bloqueia (allowed: false)
  if not found then
    select * into v_row
    from public.monthly_quotas
    where user_key = p_user_key
      and month_key = p_month_key;

    v_used := case
      when p_feature = 'orders' then coalesce(v_row.orders_used, p_max_limit)
      else coalesce(v_row.ai_queries_used, p_max_limit)
    end;

    return jsonb_build_object(
      'allowed', false,
      'used', v_used,
      'limit', p_max_limit
    );
  end if;

  v_used := case when p_feature = 'orders' then v_row.orders_used else v_row.ai_queries_used end;

  return jsonb_build_object(
    'allowed', true,
    'used', v_used,
    'limit', p_max_limit
  );
end;
$$;

revoke all on function public.increment_monthly_quota_atomic(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.increment_monthly_quota_atomic(text, text, text, integer) to service_role;

