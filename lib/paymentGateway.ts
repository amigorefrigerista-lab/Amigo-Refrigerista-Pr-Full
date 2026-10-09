import crypto from 'crypto';
import { AppSettings } from '@/lib/getAppSettings';

export type PaymentProviderType = 'mercadopago' | 'stripe' | 'asaas' | 'manual';

export interface GatewayCheckoutParams {
  payerUid: string;
  payerEmail: string;
  payerName: string;
  plan: 'flex' | 'pro';
  planTitle: string;
  amount: number;
  currency?: string;
  billingCycle: 'recurring' | 'single_30d';
  successUrl: string;
  cancelUrl: string;
  externalReference: string;
}

export interface GatewayCheckoutResult {
  success: boolean;
  provider: PaymentProviderType;
  init_point?: string;
  session_id?: string;
  subscription_id?: string;
  preapproval_id?: string;
  preference_id?: string;
  amount: number;
  currency: string;
  billing_model: 'recurring_subscription' | 'cycle_30_days';
  error?: string;
}

/**
 * Resolve as credenciais do Stripe a partir do AppSettings ou variáveis de ambiente.
 * Também aceita fallback se o admin tiver salvo a chave sk_... no campo de token principal quando payment_provider === 'stripe'.
 */
export function resolveStripeCredentials(settings: AppSettings) {
  const candidateSecret =
    settings.stripe_secret_key?.trim() ||
    (settings.mercadopago_access_token?.trim().startsWith('sk_')
      ? settings.mercadopago_access_token.trim()
      : '') ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    '';

  const candidatePublic =
    settings.stripe_publishable_key?.trim() ||
    (settings.mercadopago_public_key?.trim().startsWith('pk_')
      ? settings.mercadopago_public_key.trim()
      : '') ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    '';

  const candidateWebhookSecret =
    settings.stripe_webhook_secret?.trim() ||
    (settings.payment_provider === 'stripe' && settings.webhook_secret?.trim()
      ? settings.webhook_secret.trim()
      : '') ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    '';

  const currency = (
    settings.stripe_currency?.trim() ||
    process.env.STRIPE_CURRENCY?.trim() ||
    'USD'
  ).toUpperCase();

  return {
    secretKey: candidateSecret,
    publishableKey: candidatePublic,
    webhookSecret: candidateWebhookSecret,
    currency,
    isConfigured: candidateSecret.startsWith('sk_'),
  };
}

/**
 * Cria uma sessão de Checkout Internacional no Stripe (suporta assinatura recorrente mensal ou pagamento avulso de 30 dias).
 */
export async function createStripeCheckoutSession(
  params: GatewayCheckoutParams,
  stripeSecretKey: string,
  currency = 'USD'
): Promise<GatewayCheckoutResult> {
  const normalizedCurrency = currency.toLowerCase();
  const unitAmountCents = Math.round(Number(params.amount) * 100);
  const isRecurring = params.billingCycle === 'recurring';

  const formBody = new URLSearchParams();
  formBody.append('mode', isRecurring ? 'subscription' : 'payment');
  formBody.append('customer_email', params.payerEmail);
  formBody.append('client_reference_id', params.payerUid);
  formBody.append('success_url', params.successUrl);
  formBody.append('cancel_url', params.cancelUrl);

  // Metadados na sessão para identificação segura no webhook
  formBody.append('metadata[uid]', params.payerUid);
  formBody.append('metadata[email]', params.payerEmail);
  formBody.append('metadata[plan]', params.plan);
  formBody.append('metadata[expected_amount]', String(params.amount));
  formBody.append('metadata[currency]', currency.toUpperCase());
  formBody.append('metadata[cycle_days]', '30');
  formBody.append('metadata[external_reference]', params.externalReference);

  if (isRecurring) {
    formBody.append('subscription_data[metadata][uid]', params.payerUid);
    formBody.append('subscription_data[metadata][email]', params.payerEmail);
    formBody.append('subscription_data[metadata][plan]', params.plan);
    formBody.append('subscription_data[metadata][expected_amount]', String(params.amount));
    formBody.append('subscription_data[metadata][external_reference]', params.externalReference);
  }

  // Item de linha (Line Item)
  formBody.append('line_items[0][quantity]', '1');
  formBody.append('line_items[0][price_data][currency]', normalizedCurrency);
  formBody.append('line_items[0][price_data][unit_amount]', String(unitAmountCents));
  formBody.append(
    'line_items[0][price_data][product_data][name]',
    params.planTitle ||
      (params.plan === 'flex'
        ? 'Amigo Refrigerista Pro - Flex VIP Plan'
        : 'Amigo Refrigerista Pro - PRO Plan')
  );
  formBody.append(
    'line_items[0][price_data][product_data][description]',
    'International HVAC-R & PMOC Management Platform Subscription'
  );

  if (isRecurring) {
    formBody.append('line_items[0][price_data][recurring][interval]', 'month');
    formBody.append('line_items[0][price_data][recurring][interval_count]', '1');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey.trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    return {
      success: false,
      provider: 'stripe',
      amount: params.amount,
      currency: currency.toUpperCase(),
      billing_model: isRecurring ? 'recurring_subscription' : 'cycle_30_days',
      error:
        data?.error?.message ||
        `Erro ao criar sessão de checkout no Stripe (HTTP ${res.status}).`,
    };
  }

  return {
    success: true,
    provider: 'stripe',
    init_point: data.url,
    session_id: data.id,
    subscription_id: typeof data.subscription === 'string' ? data.subscription : undefined,
    amount: params.amount,
    currency: currency.toUpperCase(),
    billing_model: isRecurring ? 'recurring_subscription' : 'cycle_30_days',
  };
}

/**
 * Cancela uma assinatura ativa no Stripe (`sub_...`) e verifica se pertence ao usuário esperado.
 */
export async function cancelStripeSubscription(params: {
  subscriptionId: string;
  stripeSecretKey: string;
  expectedUid: string;
  expectedEmail?: string;
}): Promise<{ ok: boolean; status?: string; error?: string; forbidden?: boolean }> {
  const { subscriptionId, stripeSecretKey, expectedUid, expectedEmail } = params;

  // 1. Consulta a assinatura no Stripe para validar o proprietário (metadata.uid / metadata.email)
  const getRes = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${stripeSecretKey.trim()}`,
      },
    }
  );

  if (!getRes.ok) {
    return {
      ok: false,
      error: `Não foi possível consultar a assinatura no Stripe (HTTP ${getRes.status}).`,
    };
  }

  const subData = await getRes.json().catch(() => null);
  if (!subData || typeof subData !== 'object') {
    return {
      ok: false,
      error: 'Resposta inválida ao consultar assinatura no Stripe.',
    };
  }

  const metaUid = subData.metadata?.uid ? String(subData.metadata.uid).trim() : '';
  const metaEmail = subData.metadata?.email
    ? String(subData.metadata.email).trim().toLowerCase()
    : '';

  if (metaUid && metaUid !== expectedUid) {
    return {
      ok: false,
      forbidden: true,
      error: 'Recusa de segurança: a assinatura no Stripe não pertence ao usuário solicitado.',
    };
  }

  if (!metaUid && metaEmail && expectedEmail && metaEmail !== expectedEmail.toLowerCase()) {
    return {
      ok: false,
      forbidden: true,
      error: 'Recusa de segurança: o e-mail da assinatura no Stripe não corresponde ao usuário.',
    };
  }

  if (subData.status === 'canceled') {
    return { ok: true, status: 'canceled' };
  }

  // 2. Cancela a assinatura no Stripe
  const delRes = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${stripeSecretKey.trim()}`,
      },
    }
  );

  const delData = await delRes.json().catch(() => null);
  if (!delRes.ok || (delData?.status !== 'canceled' && delData?.cancel_at_period_end !== true)) {
    return {
      ok: false,
      error:
        delData?.error?.message ||
        `Não foi possível confirmar o cancelamento no Stripe (HTTP ${delRes.status}).`,
    };
  }

  return { ok: true, status: 'canceled' };
}

/**
 * Valida a assinatura criptográfica do Webhook do Stripe (header `Stripe-Signature: t=...,v1=...`).
 */
export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceSeconds?: number;
}): boolean {
  const { rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300 } = params;
  if (!signatureHeader || !webhookSecret) return false;

  const cleanSecret = webhookSecret.trim();
  const parts = signatureHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 't' && value) {
      timestamp = value;
    } else if (key === 'v1' && value) {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (toleranceSeconds > 0 && Math.abs(nowSeconds - tsNum) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', cleanSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSig, 'hex');

  for (const candidate of signatures) {
    try {
      const candidateBuf = Buffer.from(candidate, 'hex');
      if (
        candidateBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(candidateBuf, expectedBuf)
      ) {
        return true;
      }
    } catch {
      // continue checking other v1 signatures if present
    }
  }

  return false;
}
