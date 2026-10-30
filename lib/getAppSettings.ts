import { getSupabaseServiceClient } from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { appSettingsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import {
  WhatsAppRenewalSequenceStep,
  DEFAULT_WHATSAPP_RENEWAL_SEQUENCE,
} from '@/lib/appSettingsConstants';
import { normalizeProPlanPrice, normalizeFlexPlanPrice } from '@/lib/pricing';

export { DEFAULT_WHATSAPP_RENEWAL_SEQUENCE, normalizeProPlanPrice, normalizeFlexPlanPrice };
export type { WhatsAppRenewalSequenceStep };

export interface AppSettings {
  id: number;
  payment_provider: string;
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  webhook_secret: string;
  stripe_secret_key?: string;
  stripe_publishable_key?: string;
  stripe_webhook_secret?: string;
  stripe_currency?: string;
  credit_card_enabled?: boolean;
  credit_card_recurring_enabled?: boolean;
  credit_card_max_installments?: number;
  credit_card_gateway?: string;
  pix_enabled?: boolean;
  pro_plan_price: number;
  flex_plan_price?: number;
  maintenance_interval_months: number;
  free_trial_days: number;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_instance_name: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_renewal_enabled?: boolean;
  smtp_renewal_days_before?: number;
  smtp_renewal_urgent_days_before?: number;
  smtp_renewal_expired_days_after?: number;
  smtp_renewal_send_time?: string;
  smtp_renewal_target_plans?: 'all' | 'pro' | 'flex';
  smtp_renewal_copy_admin?: boolean;
  smtp_renewal_subject_preventive?: string;
  smtp_renewal_body_preventive?: string;
  smtp_renewal_subject_urgent?: string;
  smtp_renewal_body_urgent?: string;
  smtp_renewal_subject_expired?: string;
  smtp_renewal_body_expired?: string;
  whatsapp_renewal_sequence_enabled?: boolean;
  whatsapp_renewal_send_time?: string;
  whatsapp_renewal_target_plans?: 'all' | 'pro' | 'flex';
  whatsapp_renewal_sequence?: WhatsAppRenewalSequenceStep[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  payment_provider: 'mercadopago',
  mercadopago_access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  mercadopago_public_key: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  webhook_secret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  stripe_secret_key: process.env.STRIPE_SECRET_KEY || '',
  stripe_publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripe_currency: process.env.STRIPE_CURRENCY || 'BRL',
  credit_card_enabled: true,
  credit_card_recurring_enabled: true,
  credit_card_max_installments: 12,
  credit_card_gateway: 'auto',
  pix_enabled: true,
  pro_plan_price: 39.9,
  flex_plan_price: 19.9,
  maintenance_interval_months: 6,
  free_trial_days: 7,
  whatsapp_api_url: process.env.WHATSAPP_API_URL || '',
  whatsapp_api_key: process.env.WHATSAPP_API_KEY || '',
  whatsapp_instance_name: process.env.WHATSAPP_INSTANCE_NAME || '',
  smtp_host: process.env.SMTP_HOST || '',
  smtp_port: process.env.SMTP_PORT || '587',
  smtp_user: process.env.SMTP_USER || '',
  smtp_pass: process.env.SMTP_PASS || '',
  smtp_from: process.env.SMTP_FROM || '',
  smtp_renewal_enabled: true,
  smtp_renewal_days_before: 7,
  smtp_renewal_urgent_days_before: 1,
  smtp_renewal_expired_days_after: 2,
  smtp_renewal_send_time: '09:00',
  smtp_renewal_target_plans: 'all',
  smtp_renewal_copy_admin: true,
  smtp_renewal_subject_preventive:
    '❄️ Lembrete: Sua assinatura {plano} vence em {dias_restantes} dias — Amigo Refrigerista Pro',
  smtp_renewal_body_preventive:
    'Olá, {nome}!\n\nSua assinatura do {plano} no Amigo Refrigerista Pro está programada para renovar em {data_vencimento} (faltam {dias_restantes} dias).\n\nValor da renovação: {valor}\n\nMantenha seu acesso ilimitado às Ordens de Serviço com QR Code PMOC, Calculadora de Superaquecimento e Diagnóstico por IA renovando pelo link abaixo:\n{link_renovacao}\n\nQualquer dúvida, nossa equipe está à disposição!',
  smtp_renewal_subject_urgent:
    '⚠️ Urgente: Sua assinatura {plano} vence amanhã ({data_vencimento})!',
  smtp_renewal_body_urgent:
    'Olá, {nome}!\n\nPassando para avisar que sua assinatura do {plano} vence amanhã ({data_vencimento}).\n\nPara evitar qualquer interrupção na emissão das suas Ordens de Serviço, laudos PMOC e consultas de IA em campo, garanta sua renovação agora por apenas {valor}:\n{link_renovacao}\n\nConte sempre com o Amigo Refrigerista Pro!',
  smtp_renewal_subject_expired:
    '🔄 Sentimos sua falta, {nome}! Reative seu {plano} no Amigo Refrigerista Pro',
  smtp_renewal_body_expired:
    'Olá, {nome}!\n\nNotamos que sua assinatura do {plano} venceu em {data_vencimento}. Seus clientes, histórico de manutenções e equipamentos continuam salvos com segurança na sua conta.\n\nReative agora mesmo seu acesso completo por {valor} clicando no link abaixo:\n{link_renovacao}\n\nBoas manutenções e ótimos negócios!',
  whatsapp_renewal_sequence_enabled: true,
  whatsapp_renewal_send_time: '10:00',
  whatsapp_renewal_target_plans: 'all',
  whatsapp_renewal_sequence: DEFAULT_WHATSAPP_RENEWAL_SEQUENCE,
};

/**
 * Busca as configurações globais cadastradas no Painel Admin Master (tabela app_settings).
 * IMPORTANTE: Utiliza exclusivamente o cliente Service Role no servidor para que a tabela
 * app_settings permaneça bloqueada para a chave anon no RLS, evitando vazamento de tokens.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const mem: Partial<AppSettings> = (global as any)._serverMasterSettings || {};
  try {
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      const { data, error } = await serviceSb
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        if (Math.abs(Number(data.pro_plan_price) - 49.9) < 0.05) {
          serviceSb
            .from('app_settings')
            .update({ pro_plan_price: 39.9, flex_plan_price: normalizeFlexPlanPrice(data.flex_plan_price) })
            .eq('id', 1)
            .then(() => {})
            .catch(() => {});
        }
        return {
          id: 1,
          payment_provider:
            data.payment_provider || mem.payment_provider || DEFAULT_APP_SETTINGS.payment_provider,
          mercadopago_access_token:
            data.mercadopago_access_token ||
            mem.mercadopago_access_token ||
            DEFAULT_APP_SETTINGS.mercadopago_access_token,
          mercadopago_public_key:
            data.mercadopago_public_key ||
            mem.mercadopago_public_key ||
            DEFAULT_APP_SETTINGS.mercadopago_public_key,
          webhook_secret:
            data.webhook_secret || mem.webhook_secret || DEFAULT_APP_SETTINGS.webhook_secret,
          stripe_secret_key:
            data.stripe_secret_key ||
            mem.stripe_secret_key ||
            DEFAULT_APP_SETTINGS.stripe_secret_key,
          stripe_publishable_key:
            data.stripe_publishable_key ||
            mem.stripe_publishable_key ||
            DEFAULT_APP_SETTINGS.stripe_publishable_key,
          stripe_webhook_secret:
            data.stripe_webhook_secret ||
            mem.stripe_webhook_secret ||
            DEFAULT_APP_SETTINGS.stripe_webhook_secret,
          stripe_currency:
            data.stripe_currency || mem.stripe_currency || DEFAULT_APP_SETTINGS.stripe_currency,
          credit_card_enabled:
            data.credit_card_enabled !== undefined
              ? Boolean(data.credit_card_enabled)
              : mem.credit_card_enabled !== undefined
                ? Boolean(mem.credit_card_enabled)
                : DEFAULT_APP_SETTINGS.credit_card_enabled,
          credit_card_recurring_enabled:
            data.credit_card_recurring_enabled !== undefined
              ? Boolean(data.credit_card_recurring_enabled)
              : mem.credit_card_recurring_enabled !== undefined
                ? Boolean(mem.credit_card_recurring_enabled)
                : DEFAULT_APP_SETTINGS.credit_card_recurring_enabled,
          credit_card_max_installments: data.credit_card_max_installments
            ? Number(data.credit_card_max_installments)
            : mem.credit_card_max_installments
              ? Number(mem.credit_card_max_installments)
              : DEFAULT_APP_SETTINGS.credit_card_max_installments,
          credit_card_gateway:
            data.credit_card_gateway ||
            mem.credit_card_gateway ||
            DEFAULT_APP_SETTINGS.credit_card_gateway,
          pix_enabled:
            data.pix_enabled !== undefined
              ? Boolean(data.pix_enabled)
              : mem.pix_enabled !== undefined
                ? Boolean(mem.pix_enabled)
                : DEFAULT_APP_SETTINGS.pix_enabled,
          pro_plan_price: normalizeProPlanPrice(
            data.pro_plan_price ?? mem.pro_plan_price ?? DEFAULT_APP_SETTINGS.pro_plan_price
          ),
          flex_plan_price: normalizeFlexPlanPrice(
            data.flex_plan_price ?? mem.flex_plan_price ?? DEFAULT_APP_SETTINGS.flex_plan_price
          ),
          maintenance_interval_months: data.maintenance_interval_months
            ? Number(data.maintenance_interval_months)
            : mem.maintenance_interval_months
              ? Number(mem.maintenance_interval_months)
              : DEFAULT_APP_SETTINGS.maintenance_interval_months,
          free_trial_days: data.free_trial_days
            ? Number(data.free_trial_days)
            : mem.free_trial_days
              ? Number(mem.free_trial_days)
              : DEFAULT_APP_SETTINGS.free_trial_days,
          whatsapp_api_url:
            data.whatsapp_api_url || mem.whatsapp_api_url || DEFAULT_APP_SETTINGS.whatsapp_api_url,
          whatsapp_api_key:
            data.whatsapp_api_key || mem.whatsapp_api_key || DEFAULT_APP_SETTINGS.whatsapp_api_key,
          whatsapp_instance_name:
            data?.whatsapp_instance_name ||
            mem.whatsapp_instance_name ||
            DEFAULT_APP_SETTINGS.whatsapp_instance_name,
          smtp_host: data?.smtp_host || mem.smtp_host || DEFAULT_APP_SETTINGS.smtp_host,
          smtp_port: data?.smtp_port || mem.smtp_port || DEFAULT_APP_SETTINGS.smtp_port,
          smtp_user: data?.smtp_user || mem.smtp_user || DEFAULT_APP_SETTINGS.smtp_user,
          smtp_pass: data?.smtp_pass || mem.smtp_pass || DEFAULT_APP_SETTINGS.smtp_pass,
          smtp_from: data?.smtp_from || mem.smtp_from || DEFAULT_APP_SETTINGS.smtp_from,
        };
      }
    }
    // 2. Fallback via PostgreSQL Cloud SQL
    if (isSqlAvailable()) {
      try {
        const rows = await db
          .select({
            id: appSettingsTable.id,
            payment_provider: appSettingsTable.payment_provider,
            mercadopago_access_token: appSettingsTable.mercadopago_access_token,
            mercadopago_public_key: appSettingsTable.mercadopago_public_key,
            webhook_secret: appSettingsTable.webhook_secret,
            pro_plan_price: appSettingsTable.pro_plan_price,
            flex_plan_price: appSettingsTable.flex_plan_price,
            maintenance_interval_months: appSettingsTable.maintenance_interval_months,
            free_trial_days: appSettingsTable.free_trial_days,
            whatsapp_api_url: appSettingsTable.whatsapp_api_url,
            whatsapp_api_key: appSettingsTable.whatsapp_api_key,
            whatsapp_instance_name: appSettingsTable.whatsapp_instance_name,
          })
          .from(appSettingsTable)
          .where(eq(appSettingsTable.id, 1))
          .limit(1);

        if (rows && rows[0]) {
          const row: any = rows[0];
          if (Math.abs(Number(row.pro_plan_price) - 49.9) < 0.05) {
            db.update(appSettingsTable)
              .set({ pro_plan_price: '39.90', updated_at: new Date() })
              .where(eq(appSettingsTable.id, 1))
              .catch(() => {});
          }
          return {
            id: 1,
            payment_provider:
              row.payment_provider || mem.payment_provider || DEFAULT_APP_SETTINGS.payment_provider,
            mercadopago_access_token:
              row.mercadopago_access_token ||
              mem.mercadopago_access_token ||
              DEFAULT_APP_SETTINGS.mercadopago_access_token,
            mercadopago_public_key:
              row.mercadopago_public_key ||
              mem.mercadopago_public_key ||
              DEFAULT_APP_SETTINGS.mercadopago_public_key,
            webhook_secret:
              row.webhook_secret || mem.webhook_secret || DEFAULT_APP_SETTINGS.webhook_secret,
            pro_plan_price: normalizeProPlanPrice(
              row.pro_plan_price ?? mem.pro_plan_price ?? DEFAULT_APP_SETTINGS.pro_plan_price
            ),
            flex_plan_price: normalizeFlexPlanPrice(
              row.flex_plan_price ?? mem.flex_plan_price ?? DEFAULT_APP_SETTINGS.flex_plan_price
            ),
            maintenance_interval_months: row.maintenance_interval_months
              ? Number(row.maintenance_interval_months)
              : mem.maintenance_interval_months
                ? Number(mem.maintenance_interval_months)
                : DEFAULT_APP_SETTINGS.maintenance_interval_months,
            free_trial_days: row.free_trial_days
              ? Number(row.free_trial_days)
              : mem.free_trial_days
                ? Number(mem.free_trial_days)
                : DEFAULT_APP_SETTINGS.free_trial_days,
            whatsapp_api_url:
              row.whatsapp_api_url || mem.whatsapp_api_url || DEFAULT_APP_SETTINGS.whatsapp_api_url,
            whatsapp_api_key:
              row.whatsapp_api_key || mem.whatsapp_api_key || DEFAULT_APP_SETTINGS.whatsapp_api_key,
            whatsapp_instance_name:
              row.whatsapp_instance_name ||
              mem.whatsapp_instance_name ||
              DEFAULT_APP_SETTINGS.whatsapp_instance_name,
            smtp_host: mem.smtp_host || DEFAULT_APP_SETTINGS.smtp_host,
            smtp_port: mem.smtp_port || DEFAULT_APP_SETTINGS.smtp_port,
            smtp_user: mem.smtp_user || DEFAULT_APP_SETTINGS.smtp_user,
            smtp_pass: mem.smtp_pass || DEFAULT_APP_SETTINGS.smtp_pass,
            smtp_from: mem.smtp_from || DEFAULT_APP_SETTINGS.smtp_from,
          };
        }
      } catch (sqlErr) {
        console.error('Erro ao buscar app_settings no PostgreSQL:', sqlErr);
      }
    }
  } catch (err) {
    console.error('Erro ao buscar app_settings:', err);
  }

  return {
    ...DEFAULT_APP_SETTINGS,
    ...mem,
    pro_plan_price: normalizeProPlanPrice(mem.pro_plan_price ?? DEFAULT_APP_SETTINGS.pro_plan_price),
    flex_plan_price: normalizeFlexPlanPrice(mem.flex_plan_price ?? DEFAULT_APP_SETTINGS.flex_plan_price),
  };
}
