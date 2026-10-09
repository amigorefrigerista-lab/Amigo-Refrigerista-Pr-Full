import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getSupabaseServiceClient } from '@/lib/security';
import { getAppSettings, DEFAULT_APP_SETTINGS } from '@/lib/getAppSettings';
import { db, isSqlAvailable } from '@/src/db';
import { appSettingsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

declare global {
  var _serverMasterSettings: any | undefined;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Acesso restrito ao Administrador Master.' },
      { status: 403 }
    );
  }

  const current = global._serverMasterSettings || (await getAppSettings());
  return NextResponse.json({
    ok: true,
    settings: current,
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const currentSettings = global._serverMasterSettings || (await getAppSettings());

    const updated = {
      ...DEFAULT_APP_SETTINGS,
      ...currentSettings,
      ...body,
      id: 1,
      pro_plan_price:
        body.pro_plan_price !== undefined
          ? Number(body.pro_plan_price) > 0
            ? Number(body.pro_plan_price)
            : 39.9
          : currentSettings.pro_plan_price ?? 39.9,
      flex_plan_price:
        body.flex_plan_price !== undefined
          ? Number(body.flex_plan_price) > 0
            ? Number(body.flex_plan_price)
            : 19.9
          : currentSettings.flex_plan_price ?? 19.9,
      maintenance_interval_months:
        body.maintenance_interval_months !== undefined
          ? Number(body.maintenance_interval_months) || 6
          : currentSettings.maintenance_interval_months ?? 6,
      free_trial_days:
        body.free_trial_days !== undefined
          ? Number(body.free_trial_days) || 0
          : currentSettings.free_trial_days ?? 7,
      updated_at: new Date().toISOString(),
    };

    global._serverMasterSettings = updated;

    // 1. Grava no PostgreSQL Cloud SQL
    if (isSqlAvailable()) {
      try {
        const sqlAccessToken =
          updated.payment_provider === 'stripe' && updated.stripe_secret_key
            ? updated.stripe_secret_key
            : updated.mercadopago_access_token;
        const sqlPublicKey =
          updated.payment_provider === 'stripe' && updated.stripe_publishable_key
            ? updated.stripe_publishable_key
            : updated.mercadopago_public_key;
        const sqlWebhookSecret =
          updated.payment_provider === 'stripe' && updated.stripe_webhook_secret
            ? updated.stripe_webhook_secret
            : updated.webhook_secret;

        await db
          .insert(appSettingsTable)
          .values({
            id: 1,
            payment_provider: updated.payment_provider,
            mercadopago_access_token: sqlAccessToken,
            mercadopago_public_key: sqlPublicKey,
            webhook_secret: sqlWebhookSecret,
            pro_plan_price: String(updated.pro_plan_price),
            flex_plan_price: String(updated.flex_plan_price),
            maintenance_interval_months: updated.maintenance_interval_months,
            free_trial_days: updated.free_trial_days,
            whatsapp_api_url: updated.whatsapp_api_url,
            whatsapp_api_key: updated.whatsapp_api_key,
            whatsapp_instance_name: updated.whatsapp_instance_name,
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: appSettingsTable.id,
            set: {
              payment_provider: updated.payment_provider,
              mercadopago_access_token: sqlAccessToken,
              mercadopago_public_key: sqlPublicKey,
              webhook_secret: sqlWebhookSecret,
              pro_plan_price: String(updated.pro_plan_price),
              flex_plan_price: String(updated.flex_plan_price),
              maintenance_interval_months: updated.maintenance_interval_months,
              free_trial_days: updated.free_trial_days,
              whatsapp_api_url: updated.whatsapp_api_url,
              whatsapp_api_key: updated.whatsapp_api_key,
              whatsapp_instance_name: updated.whatsapp_instance_name,
              updated_at: new Date(),
            },
          });
      } catch (sqlErr) {
        console.error('Erro ao salvar app_settings no PostgreSQL:', sqlErr);
      }
    }

    // 2. Grava no Supabase se configurado
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      try {
        await serviceSb.from('app_settings').upsert(updated);
      } catch (sbErr) {
        console.warn('Aviso ao sincronizar app_settings no Supabase:', sbErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Configurações salvas com segurança no servidor!',
      settings: updated,
    });
  } catch (err: any) {
    console.error('Erro ao salvar settings:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Falha ao salvar as configurações.' },
      { status: 500 }
    );
  }
}
