import { integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Tabela de Usuários / Técnicos
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique('users_uid_key'), // Supabase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  photoURL: text('photo_url'),
  role: text('role').default('tecnico'), // 'tecnico' | 'support' | 'admin'
  plan: text('plan').default('free'), // 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid'
  subscriptionStatus: text('subscription_status').default('active'), // 'active' | 'cancelled' | 'expired' | 'refunded' | 'charged_back'
  planExpiresAt: timestamp('plan_expires_at'),
  activePaymentId: text('active_payment_id'),
  activePreapprovalId: text('active_preapproval_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Clientes
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  document: text('document'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Orçamentos Frigoríficos
export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),
  equipment: text('equipment'),
  description: text('description'),
  totalAmount: integer('total_amount').notNull().default(0), // em centavos ou valor inteiro
  status: text('status').notNull().default('pendente'), // 'pendente' | 'aprovado' | 'rejeitado' | 'concluido'
  validityDays: integer('validity_days').default(15),
  items: text('items'), // JSON stringificado
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Ordens de Serviço / Instalações & Manutenções
export const installations = pgTable('installations', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),
  equipment: text('equipment').notNull(),
  brand: text('brand'),
  btus: text('btus'),
  type: text('type').default('instalacao'), // 'instalacao' | 'manutencao_preventiva' | 'manutencao_corretiva' | 'higienizacao'
  status: text('status').default('agendado'), // 'agendado' | 'em_andamento' | 'concluido' | 'cancelado'
  date: text('date').notNull(),
  address: text('address'),
  value: integer('value').default(0),
  notes: text('notes'),
  customerNotes: text('customer_notes'),
  customerSignature: text('customer_signature'),
  warrantyMonths: integer('warranty_months').default(12),
  qrCode: text('qr_code'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Histórico de Diagnósticos de Erros HVAC
export const errorDiagnoses = pgTable('error_diagnoses', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  brand: text('brand').notNull(),
  code: text('code').notNull(),
  equipmentType: text('equipment_type'),
  result: text('result').notNull(), // JSON stringificado com diagnóstico completo
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Estoque de Materiais & Ferramentas
export const materialsStock = pgTable('materials_stock', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  category: text('category').default('fluido'), // 'fluido' | 'cobre' | 'eletrico' | 'quimico' | 'peca' | 'ferramenta'
  quantity: integer('quantity').notNull().default(0),
  unit: text('unit').default('un'),
  minQuantity: integer('min_quantity').default(2),
  unitCost: integer('unit_cost').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabela de Rate Limiting Persistente no Banco de Dados
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  resetAt: timestamp('reset_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tabela de Controle de Cota Mensal Persistente no Banco de Dados
export const monthlyQuotas = pgTable(
  'monthly_quotas',
  {
    id: serial('id').primaryKey(),
    userKey: text('user_key').notNull(),
    monthKey: text('month_key').notNull(), // YYYY-MM
    ordersUsed: integer('orders_used').notNull().default(0),
    aiQueriesUsed: integer('ai_queries_used').notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userMonthUniqueIdx: uniqueIndex('monthly_quotas_user_key_month_key_idx').on(
      table.userKey,
      table.monthKey
    ),
  })
);

// Tabela de Pagamentos Processados (Idempotência de Webhook + Vínculo de Revogação por payment_id)
export const processedPayments = pgTable('processed_payments', {
  paymentId: text('payment_id').primaryKey(),
  userUid: text('user_uid').notNull(),
  userEmail: text('user_email'),
  plan: text('plan').notNull(),
  status: text('status').notNull(), // 'approved' | 'refunded' | 'charged_back'
  amount: integer('amount').default(0), // em centavos
  approvedAt: timestamp('approved_at'),
  expiresAt: timestamp('expires_at'),
  processedAt: timestamp('processed_at').defaultNow(),
});

// Tabela de Confirmações de Clientes recebidas via Webhook do WhatsApp
export const whatsappConfirmations = pgTable('whatsapp_confirmations', {
  id: serial('id').primaryKey(),
  senderPhone: text('sender_phone').notNull(),
  messageText: text('message_text').notNull(),
  confirmationStatus: text('confirmation_status').notNull(), // 'CONFIRMADO' | 'CANCELADO' | 'REMARCADO' | 'OUTROS'
  installationId: integer('installation_id'),
  processedAt: timestamp('processed_at').defaultNow(),
});

// Tabela de Resgates de Licenças por Usuário (impede resgate duplicado e condição de corrida)
export const licenseRedemptions = pgTable('license_redemptions', {
  id: serial('id').primaryKey(),
  licenseCode: text('license_code').notNull(),
  userUid: text('user_uid').notNull(),
  redeemedAt: timestamp('redeemed_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});


