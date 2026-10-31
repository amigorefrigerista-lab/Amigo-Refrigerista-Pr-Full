-- ==============================================================================
-- SCHEMA DRIZZLE / SERVIDOR (SCHEMA "app") — Amigo Refrigerista Pro
-- Gerado a partir de src/db/schema.ts
-- Pode ser executado várias vezes com segurança (idempotente).
-- ==============================================================================

create schema if not exists app;

-- 1. Tabela de Usuários / Técnicos (app.users)
create table if not exists app.users (
  id serial primary key,
  uid text not null unique,
  email text not null,
  name text,
  photo_url text,
  role text default 'tecnico',
  plan text default 'free',
  subscription_status text default 'active',
  plan_expires_at timestamp without time zone,
  active_payment_id text,
  active_preapproval_id text,
  created_at timestamp without time zone default now()
);

-- 2. Tabela de Clientes (app.clients)
create table if not exists app.clients (
  id serial primary key,
  user_uid text not null,
  name text not null,
  phone text,
  email text,
  address text,
  document text,
  notes text,
  created_at timestamp without time zone default now()
);

create index if not exists idx_app_clients_user_uid on app.clients (user_uid);

-- 3. Tabela de Orçamentos Frigoríficos (app.quotes)
create table if not exists app.quotes (
  id serial primary key,
  user_uid text not null,
  client_name text not null,
  client_phone text,
  equipment text,
  description text,
  total_amount integer not null default 0,
  status text not null default 'pendente',
  validity_days integer default 15,
  items text,
  notes text,
  created_at timestamp without time zone default now()
);

create index if not exists idx_app_quotes_user_uid on app.quotes (user_uid);

-- 4. Tabela de Ordens de Serviço / Instalações & Manutenções (app.installations)
create table if not exists app.installations (
  id serial primary key,
  user_uid text not null,
  client_name text not null,
  client_phone text,
  equipment text not null,
  brand text,
  btus text,
  type text default 'instalacao',
  status text default 'agendado',
  date text not null,
  address text,
  value integer default 0,
  notes text,
  customer_notes text,
  customer_signature text,
  warranty_months integer default 12,
  qr_code text,
  created_at timestamp without time zone default now()
);

create index if not exists idx_app_installations_user_uid on app.installations (user_uid);

-- 5. Tabela de Histórico de Diagnósticos de Erros HVAC (app.error_diagnoses)
create table if not exists app.error_diagnoses (
  id serial primary key,
  user_uid text not null,
  brand text not null,
  code text not null,
  equipment_type text,
  result text not null,
  created_at timestamp without time zone default now()
);

create index if not exists idx_app_error_diagnoses_user_uid on app.error_diagnoses (user_uid);

-- 6. Tabela de Estoque de Materiais & Ferramentas (app.materials_stock)
create table if not exists app.materials_stock (
  id serial primary key,
  user_uid text not null,
  name text not null,
  category text default 'fluido',
  quantity integer not null default 0,
  unit text default 'un',
  min_quantity integer default 2,
  unit_cost integer default 0,
  created_at timestamp without time zone default now()
);

create index if not exists idx_app_materials_stock_user_uid on app.materials_stock (user_uid);

-- 7. Tabela de Rate Limiting Persistente (app.rate_limits)
create table if not exists app.rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamp without time zone not null,
  updated_at timestamp without time zone default now()
);

-- 8. Tabela de Controle de Cota Mensal Persistente (app.monthly_quotas)
create table if not exists app.monthly_quotas (
  id serial primary key,
  user_key text not null,
  month_key text not null,
  orders_used integer not null default 0,
  ai_queries_used integer not null default 0,
  updated_at timestamp without time zone default now()
);

create unique index if not exists monthly_quotas_user_key_month_key_idx
  on app.monthly_quotas (user_key, month_key);

-- 9. Tabela de Pagamentos Processados / Idempotência (app.processed_payments)
create table if not exists app.processed_payments (
  payment_id text primary key,
  user_uid text not null,
  user_email text,
  plan text not null,
  status text not null,
  amount integer default 0,
  approved_at timestamp without time zone,
  expires_at timestamp without time zone,
  processed_at timestamp without time zone default now()
);

create index if not exists idx_app_processed_payments_user_uid on app.processed_payments (user_uid);

-- 10. Tabela de Confirmações de Clientes via WhatsApp (app.whatsapp_confirmations)
create table if not exists app.whatsapp_confirmations (
  id serial primary key,
  sender_phone text not null,
  message_text text not null,
  confirmation_status text not null,
  installation_id integer,
  processed_at timestamp without time zone default now()
);

-- 11. Tabela de Resgates de Licenças por Usuário (app.license_redemptions)
create table if not exists app.license_redemptions (
  id serial primary key,
  license_code text not null,
  user_uid text not null,
  redeemed_at timestamp without time zone default now(),
  expires_at timestamp without time zone not null
);

create index if not exists idx_app_license_redemptions_user_uid on app.license_redemptions (user_uid);

-- 12. Tabela de Configurações Globais do Sistema Master (app.app_settings)
create table if not exists app.app_settings (
  id integer primary key default 1,
  payment_provider text default 'mercadopago',
  mercadopago_access_token text default '',
  mercadopago_public_key text default '',
  mercadopago_token_permanently_masked boolean default false,
  mercadopago_connection_verified boolean default false,
  webhook_secret text default '',
  pro_plan_price text default '39.90',
  flex_plan_price text default '19.90',
  maintenance_interval_months integer default 6,
  free_trial_days integer default 7,
  whatsapp_api_url text default '',
  whatsapp_api_key text default '',
  whatsapp_instance_name text default '',
  whatsapp_renewal_sequence_enabled boolean default true,
  whatsapp_renewal_send_time text default '10:00',
  whatsapp_renewal_target_plans text default 'all',
  whatsapp_renewal_sequence text default '[]',
  stripe_connect_client_id text default '',
  stripe_connect_secret_key text default '',
  stripe_webhook_url text default '',
  updated_at timestamp without time zone default now()
);

alter table app.app_settings
  add column if not exists mercadopago_token_permanently_masked boolean default false;
alter table app.app_settings
  add column if not exists mercadopago_connection_verified boolean default false;
alter table app.app_settings
  add column if not exists whatsapp_renewal_sequence_enabled boolean default true;
alter table app.app_settings
  add column if not exists whatsapp_renewal_send_time text default '10:00';
alter table app.app_settings
  add column if not exists whatsapp_renewal_target_plans text default 'all';
alter table app.app_settings
  add column if not exists whatsapp_renewal_sequence text default '[]';

-- ==============================================================================
-- ATIVAR ROW LEVEL SECURITY (RLS) E REVOGAR ACESSO DE ANON / AUTHENTICATED
-- (Apenas o servidor / service_role / conexão direta PostgreSQL acessa app.*)
-- ==============================================================================
alter table app.users enable row level security;
alter table app.clients enable row level security;
alter table app.quotes enable row level security;
alter table app.installations enable row level security;
alter table app.error_diagnoses enable row level security;
alter table app.materials_stock enable row level security;
alter table app.rate_limits enable row level security;
alter table app.monthly_quotas enable row level security;
alter table app.processed_payments enable row level security;
alter table app.whatsapp_confirmations enable row level security;
alter table app.license_redemptions enable row level security;
alter table app.app_settings enable row level security;

revoke all on schema app from public, anon, authenticated;
revoke all on all tables in schema app from public, anon, authenticated;
revoke all on all sequences in schema app from public, anon, authenticated;
alter default privileges in schema app revoke all on tables from public, anon, authenticated;
alter default privileges in schema app revoke all on sequences from public, anon, authenticated;
