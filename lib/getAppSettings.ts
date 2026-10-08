import { getSupabaseServiceClient } from '@/lib/security';

export interface AppSettings {
  id: number;
  payment_provider: string;
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  webhook_secret: string;
  pro_plan_price: number;
  flex_plan_price?: number;
  maintenance_interval_months: number;
  free_trial_days: number;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_instance_name: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  payment_provider: 'mercadopago',
  mercadopago_access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  mercadopago_public_key: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  webhook_secret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  pro_plan_price: 39.9,
  flex_plan_price: 19.9,
  maintenance_interval_months: 6,
  free_trial_days: 7,
  whatsapp_api_url: process.env.WHATSAPP_API_URL || '',
  whatsapp_api_key: process.env.WHATSAPP_API_KEY || '',
  whatsapp_instance_name: process.env.WHATSAPP_INSTANCE_NAME || '',
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
            data.whatsapp_instance_name || DEFAULT_APP_SETTINGS.whatsapp_instance_name,
        };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar app_settings:', err);
  }

  return DEFAULT_APP_SETTINGS;
}
