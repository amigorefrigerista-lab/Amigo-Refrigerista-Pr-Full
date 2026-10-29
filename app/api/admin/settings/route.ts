import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authenticateRequest, getSupabaseServiceClient, isMasterAdminEmail } from '@/lib/security';
import { getAppSettings, DEFAULT_APP_SETTINGS } from '@/lib/getAppSettings';
import { isMaskedMpToken, maskMpAccessToken } from '@/lib/appSettingsConstants';
import { db, isSqlAvailable } from '@/src/db';
import { appSettingsTable } from '@/src/db/schema';

const SETTINGS_CACHE_FILE = path.join('/tmp', 'amigo_master_settings.json');

declare global {
  var _serverMasterSettings: any | undefined;
}

function readCachedSettings(): Record<string, any> | null {
  if (global._serverMasterSettings) return global._serverMasterSettings;
  try {
    if (fs.existsSync(SETTINGS_CACHE_FILE)) {
      const raw = fs.readFileSync(SETTINGS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        global._serverMasterSettings = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore file cache read errors
  }
  return null;
}

function writeCachedSettings(settings: Record<string, any>) {
  global._serverMasterSettings = settings;
  try {
    fs.writeFileSync(SETTINGS_CACHE_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch {
    // ignore file cache write errors
  }
}

async function isAuthorizedAdmin(req: NextRequest): Promise<boolean> {
  const auth = await authenticateRequest(req);
  if (auth.role === 'admin') return true;
  const headerEmail = req.headers.get('x-amigo-email')?.trim().toLowerCase() || '';
  if (headerEmail && isMasterAdminEmail(headerEmail)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorizedAdmin(req))) {
    return NextResponse.json(
      { ok: false, error: 'Acesso restrito ao Administrador Master.' },
      { status: 403 }
    );
  }

  const dbSettings = await getAppSettings();
  const cached = readCachedSettings();

  const realMpToken =
    cached?.mercadopago_access_token ||
    dbSettings.mercadopago_access_token ||
    DEFAULT_APP_SETTINGS.mercadopago_access_token ||
    '';

  const isPermanentlyMasked = Boolean(cached?.mercadopago_token_permanently_masked && realMpToken);

  const merged = {
    ...DEFAULT_APP_SETTINGS,
    ...dbSettings,
    ...(cached || {}),
    mercadopago_access_token: isPermanentlyMasked
      ? maskMpAccessToken(realMpToken)
      : realMpToken,
    mercadopago_access_token_raw: realMpToken,
    mercadopago_access_token_masked: realMpToken ? maskMpAccessToken(realMpToken) : '',
    mercadopago_token_permanently_masked: isPermanentlyMasked,
    mercadopago_connection_verified: Boolean(cached?.mercadopago_connection_verified && realMpToken),
    mercadopago_public_key:
      cached?.mercadopago_public_key ||
      dbSettings.mercadopago_public_key ||
      DEFAULT_APP_SETTINGS.mercadopago_public_key,
    webhook_secret:
      cached?.webhook_secret ||
      dbSettings.webhook_secret ||
      DEFAULT_APP_SETTINGS.webhook_secret,
  };

  return NextResponse.json({
    ok: true,
    settings: merged,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dbSettings = await getAppSettings();
    const cached = readCachedSettings() || {};
    const currentSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...dbSettings,
      ...cached,
    };

    const incomingMpToken =
      body.mercadopago_access_token !== undefined
        ? String(body.mercadopago_access_token).trim()
        : undefined;

    // Se o cliente enviou o valor mascarado (••••), preserva o token real salvo no servidor
    const nextMpAccessToken =
      incomingMpToken !== undefined
        ? isMaskedMpToken(incomingMpToken)
          ? currentSettings.mercadopago_access_token || ''
          : incomingMpToken
        : currentSettings.mercadopago_access_token || '';

    const nextMpPublicKey =
      body.mercadopago_public_key !== undefined
        ? String(body.mercadopago_public_key).trim()
        : currentSettings.mercadopago_public_key || '';

    const nextWebhookSecret =
      body.webhook_secret !== undefined
        ? String(body.webhook_secret).trim()
        : currentSettings.webhook_secret || '';

    const nextPermanentlyMasked =
      body.mercadopago_token_permanently_masked !== undefined
        ? Boolean(body.mercadopago_token_permanently_masked && nextMpAccessToken)
        : Boolean(currentSettings.mercadopago_token_permanently_masked && nextMpAccessToken);

    const nextConnectionVerified =
      body.mercadopago_connection_verified !== undefined
        ? Boolean(body.mercadopago_connection_verified && nextMpAccessToken)
        : Boolean(currentSettings.mercadopago_connection_verified && nextMpAccessToken);

    const updated = {
      ...DEFAULT_APP_SETTINGS,
      ...currentSettings,
      ...body,
      id: 1,
      mercadopago_access_token: nextMpAccessToken,
      mercadopago_access_token_masked: nextMpAccessToken
        ? maskMpAccessToken(nextMpAccessToken)
        : '',
      mercadopago_token_permanently_masked: nextPermanentlyMasked,
      mercadopago_connection_verified: nextConnectionVerified,
      mercadopago_public_key: nextMpPublicKey,
      webhook_secret: nextWebhookSecret,
      credit_card_enabled:
        body.credit_card_enabled !== undefined
          ? Boolean(body.credit_card_enabled)
          : currentSettings.credit_card_enabled ?? true,
      credit_card_recurring_enabled:
        body.credit_card_recurring_enabled !== undefined
          ? Boolean(body.credit_card_recurring_enabled)
          : currentSettings.credit_card_recurring_enabled ?? true,
      pix_enabled:
        body.pix_enabled !== undefined
          ? Boolean(body.pix_enabled)
          : currentSettings.pix_enabled ?? true,
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

    writeCachedSettings(updated);

    // 1. Grava no PostgreSQL Cloud SQL
    if (isSqlAvailable()) {
      try {
        const sqlAccessToken =
          updated.mercadopago_access_token ||
          (updated.payment_provider === 'stripe' ? updated.stripe_secret_key : '');
        const sqlPublicKey =
          updated.mercadopago_public_key ||
          (updated.payment_provider === 'stripe' ? updated.stripe_publishable_key : '');
        const sqlWebhookSecret =
          updated.webhook_secret ||
          (updated.payment_provider === 'stripe' ? updated.stripe_webhook_secret : '');

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
              stripe_connect_client_id: updated.stripe_connect_client_id,
              stripe_connect_secret_key: updated.stripe_connect_secret_key,
              stripe_webhook_url: updated.stripe_webhook_url,
              updated_at: new Date(),
            },
          });
      } catch (sqlErr) {
        console.error('Erro ao salvar app_settings no PostgreSQL:', sqlErr);
      }
    }

    // 2. Grava no Supabase se configurado (com fallback seguro para as colunas nativas de app_settings)
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      try {
        const { error: fullUpsertErr } = await serviceSb.from('app_settings').upsert(updated);
        if (fullUpsertErr) {
          // Caso a tabela app_settings no Supabase não possua colunas estendidas, salva as colunas principais garantindo Mercado Pago e WhatsApp
          const coreRow = {
            id: 1,
            payment_provider: updated.payment_provider,
            mercadopago_access_token: updated.mercadopago_access_token,
            mercadopago_public_key: updated.mercadopago_public_key,
            webhook_secret: updated.webhook_secret,
            pro_plan_price: updated.pro_plan_price,
            flex_plan_price: updated.flex_plan_price,
            maintenance_interval_months: updated.maintenance_interval_months,
            free_trial_days: updated.free_trial_days,
            whatsapp_api_url: updated.whatsapp_api_url,
            whatsapp_api_key: updated.whatsapp_api_key,
            whatsapp_instance_name: updated.whatsapp_instance_name,
            updated_at: updated.updated_at,
          };
          await serviceSb.from('app_settings').upsert(coreRow);
        }
      } catch (sbErr) {
        console.warn('Aviso ao sincronizar app_settings no Supabase:', sbErr);
      }
    }

    const clientSafeSettings = {
      ...updated,
      mercadopago_access_token: nextPermanentlyMasked
        ? maskMpAccessToken(nextMpAccessToken)
        : nextMpAccessToken,
      mercadopago_access_token_raw: nextMpAccessToken,
    };

    return NextResponse.json({
      ok: true,
      message: 'Configurações salvas com segurança no servidor!',
      settings: clientSafeSettings,
    });
  } catch (err: any) {
    console.error('Erro ao salvar settings:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Falha ao salvar as configurações.' },
      { status: 500 }
    );
  }
}

