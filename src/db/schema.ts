import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Tabela de Usuários / Técnicos
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  photoURL: text('photo_url'),
  role: text('role').default('tecnico'), // 'tecnico' | 'admin'
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
