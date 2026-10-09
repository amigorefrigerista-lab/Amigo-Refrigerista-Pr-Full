import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import {
  resolveStripeCredentials,
  createStripeCheckoutSession,
} from '@/lib/paymentGateway';
import {
  authenticateRequest,
  getSupabaseServiceClient,
  checkRateLimitAsync,
  getClientIp,
  sanitizeReturnUrl,
  buildValidPixBrCode,
} from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`checkout:${clientIp}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas de checkout. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    // CORREÇÃO DE SEGURANÇA CRÍTICA: Exige sessão autenticada e usa exclusivamente auth.uid e auth.email (ignora userEmail do body)
    const auth = await authenticateRequest(req);
    if (!auth.authenticated || !auth.uid || !auth.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sessão não autenticada. Faça login na sua conta para iniciar o checkout.',
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      userName,
      planType = 'pro',
      billingCycle = 'recurring', // 'recurring' (preapproval mensal) ou 'single_30d' (ciclo de 30 dias)
      provider: requestedProvider,
      currency: requestedCurrency,
      returnUrl,
    } = body || {};

    const payerEmail = auth.email.trim().toLowerCase();
    const payerUid = auth.uid.trim();
    const payerName = String(userName || 'Técnico Refrigerista').trim().slice(0, 100);

    const normalizedPlan = planType === 'flex' ? 'flex' : 'pro';

    const safeOrigin = req.nextUrl.origin;
    const safeReturnSuccess = sanitizeReturnUrl(returnUrl, safeOrigin);
    const safeReturnFailure = `${safeOrigin}/?payment=failure`;
    const safeReturnPending = `${safeOrigin}/?payment=pending`;

    const settings = await getAppSettings();

    const accessToken = settings.mercadopago_access_token;
    const proPrice = Number(settings.pro_plan_price) > 0 ? Number(settings.pro_plan_price) : 39.9;
    const flexPrice = Number(settings.flex_plan_price) > 0 ? Number(settings.flex_plan_price) : 19.9;
    const planPrice = normalizedPlan === 'flex' ? flexPrice : proPrice;
    const planTitle =
      normalizedPlan === 'flex'
        ? 'Plano Flex VIP - Ciclo 30 Dias'
        : 'Plano Amigo Refrigerista PRO - Ciclo 30 Dias';

    const externalReference = JSON.stringify({
      uid: payerUid,
      email: payerEmail,
      plan: normalizedPlan,
      expectedAmount: planPrice,
      cycleDays: 30,
    });

    const activeProvider = requestedProvider || settings.payment_provider || 'mercadopago';
    const stripeCreds = resolveStripeCredentials(settings);

    // 0. Gateway Internacional Stripe
    if (activeProvider === 'stripe' && stripeCreds.isConfigured) {
      try {
        const stripeResult = await createStripeCheckoutSession(
          {
            payerUid,
            payerEmail,
            payerName,
            plan: normalizedPlan,
            planTitle,
            amount: planPrice,
            currency: requestedCurrency || stripeCreds.currency || 'USD',
            billingCycle: billingCycle === 'single_30d' ? 'single_30d' : 'recurring',
            successUrl: `${safeReturnSuccess}${safeReturnSuccess.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: safeReturnFailure,
            externalReference,
          },
          stripeCreds.secretKey,
          requestedCurrency || stripeCreds.currency || 'USD'
        );

        if (stripeResult.success && stripeResult.init_point) {
          return NextResponse.json(stripeResult);
        } else if (requestedProvider === 'stripe') {
          return NextResponse.json(
            {
              success: false,
              error: stripeResult.error || 'Falha ao iniciar checkout internacional via Stripe.',
            },
            { status: 502 }
          );
        }
      } catch (stripeErr) {
        console.error('Erro na API Stripe:', stripeErr);
      }
    }

    if (accessToken && accessToken.startsWith('APP_USR')) {
      try {
        // 1. Tenta criar Assinatura Recorrente Mensal Real no Mercado Pago (/preapproval) quando billingCycle === 'recurring'
        if (billingCycle === 'recurring') {
          const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken.trim()}`,
            },
            body: JSON.stringify({
              reason: `Assinatura Mensal Recorrente - ${
                normalizedPlan === 'flex' ? 'Plano Flex VIP' : 'Plano Amigo Refrigerista PRO'
              }`,
              external_reference: externalReference,
              payer_email: payerEmail,
              auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: Number(planPrice),
                currency_id: 'BRL',
              },
              back_url: safeReturnSuccess,
              status: 'pending',
            }),
          });

          if (preapprovalRes.ok) {
            const preapprovalData = await preapprovalRes.json();
            if (preapprovalData.init_point || preapprovalData.sandbox_init_point) {
              const preapprovalId = preapprovalData.id ? String(preapprovalData.id).trim() : null;
              if (!preapprovalId) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'O Mercado Pago não retornou o identificador da assinatura (preapproval_id).',
                  },
                  { status: 502 }
                );
              }

              const serviceSb = getSupabaseServiceClient();
              let persisted = false;
              let persistErrorMsg = '';

              if (serviceSb) {
                const { data: updatedProfile, error: updateErr } = await serviceSb
                  .from('profiles')
                  .update({
                    active_preapproval_id: preapprovalId,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', payerUid)
                  .select('id')
                  .maybeSingle();

                if (updateErr || !updatedProfile) {
                  persistErrorMsg = updateErr?.message || 'Perfil do usuário não encontrado para vincular a assinatura.';
                } else {
                  persisted = true;
                }
              }

              if (isSqlAvailable()) {
                try {
                  const updatedRows = await db
                    .update(users)
                    .set({ activePreapprovalId: preapprovalId })
                    .where(eq(users.uid, payerUid))
                    .returning({ uid: users.uid });
                  if (updatedRows && updatedRows.length > 0) {
                    persisted = true;
                  } else if (!serviceSb) {
                    persistErrorMsg = 'Registro do usuário não encontrado no banco SQL.';
                  }
                } catch (sqlErr: any) {
                  if (!serviceSb) {
                    persistErrorMsg = sqlErr?.message || 'Erro ao gravar active_preapproval_id no SQL.';
                  }
                }
              }

              if (!persisted) {
                // Cancela imediatamente a assinatura pendente criada no Mercado Pago para não deixar assinatura órfã sem ID no perfil
                await fetch(
                  `https://api.mercadopago.com/preapproval/${encodeURIComponent(preapprovalId)}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${accessToken.trim()}`,
                    },
                    body: JSON.stringify({ status: 'cancelled' }),
                  }
                ).catch(() => {});

                return NextResponse.json(
                  {
                    success: false,
                    error: `Não foi possível vincular a assinatura ao seu perfil (${persistErrorMsg || 'banco indisponível'}). Nenhuma cobrança foi gerada.`,
                  },
                  { status: 500 }
                );
              }

              return NextResponse.json({
                success: true,
                init_point: preapprovalData.init_point || preapprovalData.sandbox_init_point,
                preapproval_id: preapprovalId,
                amount: planPrice,
                billing_model: 'recurring_subscription',
                provider: 'mercadopago',
              });
            }
          }
        }

        // 2. Fallback para Checkout de Ciclo de 30 Dias (com expiração server-side plan_expires_at = +30 dias)
        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken.trim()}`,
          },
          body: JSON.stringify({
            items: [
              {
                id: `plan-${normalizedPlan}-30d`,
                title: planTitle,
                description:
                  'Acesso por 30 dias (renovável) - Ferramenta de Refrigeração e PMOC Pro',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: Number(planPrice),
              },
            ],
            payer: {
              email: payerEmail,
              name: payerName,
            },
            back_urls: {
              success: safeReturnSuccess,
              failure: safeReturnFailure,
              pending: safeReturnPending,
            },
            auto_return: 'approved',
            notification_url: `${safeOrigin}/api/webhooks/mercadopago`,
            external_reference: externalReference,
          }),
        });

        if (mpResponse.ok) {
          const preferenceData = await mpResponse.json();
          return NextResponse.json({
            success: true,
            init_point: preferenceData.init_point || preferenceData.sandbox_init_point,
            preference_id: preferenceData.id,
            amount: planPrice,
            billing_model: 'cycle_30_days',
            provider: 'mercadopago',
          });
        }
      } catch (mpErr) {
        console.error('Erro na API Mercado Pago:', mpErr);
      }
    }

    // 3. Fallback Pix Direto (Ciclo de 30 dias) com CRC16-CCITT dinâmico
    const pixCopyAndPaste = buildValidPixBrCode({
      pixKey: 'amigorefrigerista@gmail.com',
      merchantName: 'AMIGO REFRIGERISTA PRO',
      merchantCity: 'SAO PAULO',
      amount: planPrice,
      txid: `ARP${normalizedPlan.toUpperCase()}30D`,
    });

    return NextResponse.json({
      success: true,
      init_point: null,
      message: 'Checkout de ciclo de 30 dias gerado com CRC16-CCITT dinâmico validado',
      amount: planPrice,
      billing_model: 'cycle_30_days',
      pix: {
        copy_paste: pixCopyAndPaste,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
          pixCopyAndPaste
        )}`,
        receiver_name: 'Amigo Refrigerista PRO',
        key_email: 'amigorefrigerista@gmail.com',
      },
      provider: settings.payment_provider || 'manual',
    });
  } catch (error) {
    console.error('Erro ao processar checkout:', error);
    return NextResponse.json(
      { success: false, error: 'Não foi possível processar o checkout no momento.' },
      { status: 500 }
    );
  }
}
