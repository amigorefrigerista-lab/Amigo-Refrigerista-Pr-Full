import { getSupabaseServiceClient } from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { appSettingsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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
  stripe_currency: process.env.STRIPE_CURRENCY || 'USD',
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
};

/**
 * Busca as configurações globais cadastradas no Painel Admin Master (tabela app_settings).
 * IMPORTANTE: Utiliza exclusivamente o cliente Service Role no servidor para que a tabela
 * app_settings permaneça bloqueada para a chave anon no RLS, evitando vazamento de tokens.
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      const { data, error } = await serviceSb
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        return {
          id: 1,
          payment_provider: data.payment_provider || DEFAULT_APP_SETTINGS.payment_provider,
          mercadopago_access_token:
            data.mercadopago_access_token || DEFAULT_APP_SETTINGS.mercadopago_access_token,
          mercadopago_public_key:
            data.mercadopago_public_key || DEFAULT_APP_SETTINGS.mercadopago_public_key,
          webhook_secret: data.webhook_secret || DEFAULT_APP_SETTINGS.webhook_secret,
          pro_plan_price: data.pro_plan_price
            ? Number(data.pro_plan_price)
            : DEFAULT_APP_SETTINGS.pro_plan_price,
          flex_plan_price: data.flex_plan_price
            ? Number(data.flex_plan_price)
            : DEFAULT_APP_SETTINGS.flex_plan_price,
          maintenance_interval_months: data.maintenance_interval_months
            ? Number(data.maintenance_interval_months)
            : DEFAULT_APP_SETTINGS.maintenance_interval_months,
          free_trial_days: data.free_trial_days
            ? Number(data.free_trial_days)
            : DEFAULT_APP_SETTINGS.free_trial_days,
          whatsapp_api_url: data.whatsapp_api_url || DEFAULT_APP_SETTINGS.whatsapp_api_url,
          whatsapp_api_key: data.whatsapp_api_key || DEFAULT_APP_SETTINGS.whatsapp_api_key,
          whatsapp_instance_name:
            data?.whatsapp_instance_name || DEFAULT_APP_SETTINGS.whatsapp_instance_name,
          smtp_host: data?.smtp_host || DEFAULT_APP_SETTINGS.smtp_host,
          smtp_port: data?.smtp_port || DEFAULT_APP_SETTINGS.smtp_port,
          smtp_user: data?.smtp_user || DEFAULT_APP_SETTINGS.smtp_user,
          smtp_pass: data?.smtp_pass || DEFAULT_APP_SETTINGS.smtp_pass,
          smtp_from: data?.smtp_from || DEFAULT_APP_SETTINGS.smtp_from,
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
          return {
            id: 1,
            payment_provider: row.payment_provider || DEFAULT_APP_SETTINGS.payment_provider,
            mercadopago_access_token:
              row.mercadopago_access_token || DEFAULT_APP_SETTINGS.mercadopago_access_token,
            mercadopago_public_key:
              row.mercadopago_public_key || DEFAULT_APP_SETTINGS.mercadopago_public_key,
            webhook_secret: row.webhook_secret || DEFAULT_APP_SETTINGS.webhook_secret,
            pro_plan_price: row.pro_plan_price
              ? Number(row.pro_plan_price)
              : DEFAULT_APP_SETTINGS.pro_plan_price,
            flex_plan_price: row.flex_plan_price
              ? Number(row.flex_plan_price)
              : DEFAULT_APP_SETTINGS.flex_plan_price,
            maintenance_interval_months: row.maintenance_interval_months
              ? Number(row.maintenance_interval_months)
              : DEFAULT_APP_SETTINGS.maintenance_interval_months,
            free_trial_days: row.free_trial_days
              ? Number(row.free_trial_days)
              : DEFAULT_APP_SETTINGS.free_trial_days,
            whatsapp_api_url: row.whatsapp_api_url || DEFAULT_APP_SETTINGS.whatsapp_api_url,
            whatsapp_api_key: row.whatsapp_api_key || DEFAULT_APP_SETTINGS.whatsapp_api_key,
            whatsapp_instance_name:
              row.whatsapp_instance_name || DEFAULT_APP_SETTINGS.whatsapp_instance_name,
            smtp_host: DEFAULT_APP_SETTINGS.smtp_host,
            smtp_port: DEFAULT_APP_SETTINGS.smtp_port,
            smtp_user: DEFAULT_APP_SETTINGS.smtp_user,
            smtp_pass: DEFAULT_APP_SETTINGS.smtp_pass,
            smtp_from: DEFAULT_APP_SETTINGS.smtp_from,
          };
        }
      } catch (sqlErr) {
        console.error('Erro ao buscar app_settings no PostgreSQL:', sqlErr);
      }
    }
  } catch (err) {
    console.error('Erro ao buscar app_settings:', err);
  }

  return DEFAULT_APP_SETTINGS;
}
