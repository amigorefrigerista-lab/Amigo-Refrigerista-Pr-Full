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
  plano text default 'trial',
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
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome, role, is_admin, plano)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.email = 'amigorefrigerista@gmail.com' then 'admin' else 'user' end,
    case when new.email = 'amigorefrigerista@gmail.com' then true else false end,
    'trial'
  );
  return new;
end;
$$ language plpgsql security definer;

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

create policy "Usuários podem atualizar seu próprio perfil" on public.profiles
  for update using (auth.uid() = id);

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
