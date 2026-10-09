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

export async function GET() {
  try {
    const settings = await getAppSettings();
    const stripeCreds = resolveStripeCredentials(settings);
    const hasMercadoPago = Boolean(
      settings.mercadopago_access_token &&
        settings.mercadopago_access_token.trim().startsWith('APP_USR')
    );

    return NextResponse.json({
      ok: true,
      plans: {
        flex: {
          id: 'flex',
          title: 'Plano Flex VIP',
          price: Number(settings.flex_plan_price) > 0 ? Number(settings.flex_plan_price) : 19.9,
          description: 'Ferramentas essenciais de campo, Calculadora SH/Sub e Gestão de OS',
        },
        pro: {
          id: 'pro',
          title: 'Plano Amigo PRO',
          price: Number(settings.pro_plan_price) > 0 ? Number(settings.pro_plan_price) : 39.9,
          description: 'IA ilimitada, PMOC, Leitor OCR de Placas, QR Code e Automação WhatsApp',
        },
      },
      paymentConfig: {
        provider: settings.payment_provider || 'mercadopago',
        creditCardEnabled: settings.credit_card_enabled ?? true,
        creditCardRecurringEnabled: settings.credit_card_recurring_enabled ?? true,
        creditCardMaxInstallments: settings.credit_card_max_installments || 12,
        creditCardGateway: settings.credit_card_gateway || 'auto',
        pixEnabled: settings.pix_enabled ?? true,
        stripeConfigured: stripeCreds.isConfigured,
        mercadopagoConfigured: hasMercadoPago,
        stripeCurrency: stripeCreds.currency || 'BRL',
      },
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      plans: {
        flex: { id: 'flex', title: 'Plano Flex VIP', price: 19.9 },
        pro: { id: 'pro', title: 'Plano Amigo PRO', price: 39.9 },
      },
      paymentConfig: {
        provider: 'mercadopago',
        creditCardEnabled: true,
        creditCardRecurringEnabled: true,
        creditCardMaxInstallments: 12,
        creditCardGateway: 'auto',
        pixEnabled: true,
      },
    });
  }
}

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
      paymentMethod = 'credit_card', // 'credit_card' | 'pix'
      installments = 1,
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
    const maxInstallments =
      Number(settings.credit_card_max_installments) > 0
        ? Math.min(12, Math.max(1, Number(settings.credit_card_max_installments)))
        : 12;
    const planTitle =
      normalizedPlan === 'flex'
        ? 'Plano Flex VIP - Ciclo 30 Dias'
        : 'Plano Amigo Refrigerista PRO - Ciclo 30 Dias';

    const externalReference = JSON.stringify({
      uid: payerUid,
      email: payerEmail,
      plan: normalizedPlan,
      paymentMethod,
      expectedAmount: planPrice,
      cycleDays: 30,
    });

    const stripeCreds = resolveStripeCredentials(settings);
    const isRecurringEnabled = settings.credit_card_recurring_enabled ?? true;
    const effectiveBillingCycle: 'recurring' | 'single_30d' =
      billingCycle === 'recurring' && isRecurringEnabled ? 'recurring' : 'single_30d';
    const activeProvider =
      requestedProvider ||
      (paymentMethod === 'credit_card' &&
      settings.credit_card_gateway &&
      settings.credit_card_gateway !== 'auto'
        ? settings.credit_card_gateway
        : settings.payment_provider) ||
      'mercadopago';

    // Se o usuário escolheu PIX Direto explícito e não há gateway forçado, ou se pediu paymentMethod === 'pix' sem token MP
    if (paymentMethod === 'pix' && activeProvider === 'manual') {
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
        message: 'QR Code PIX gerado com sucesso para o ' + (normalizedPlan === 'flex' ? 'Plano Flex' : 'Plano PRO'),
        amount: planPrice,
        plan: normalizedPlan,
        payment_method: 'pix',
        billing_model: 'cycle_30_days',
        pix: {
          copy_paste: pixCopyAndPaste,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            pixCopyAndPaste
          )}`,
          receiver_name: 'Amigo Refrigerista PRO',
          key_email: 'amigorefrigerista@gmail.com',
        },
        provider: 'manual',
      });
    }

    // 0. Gateway Cartão de Crédito / Internacional Stripe
    if (
      (activeProvider === 'stripe' ||
        (paymentMethod === 'credit_card' && stripeCreds.isConfigured && !accessToken?.startsWith('APP_USR'))) &&
      stripeCreds.isConfigured
    ) {
      try {
        const stripeResult = await createStripeCheckoutSession(
          {
            payerUid,
            payerEmail,
            payerName,
            plan: normalizedPlan,
            planTitle,
            amount: planPrice,
            currency: requestedCurrency || stripeCreds.currency || 'BRL',
            billingCycle: effectiveBillingCycle,
            successUrl: `${safeReturnSuccess}${safeReturnSuccess.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: safeReturnFailure,
            externalReference,
          },
          stripeCreds.secretKey,
          requestedCurrency || stripeCreds.currency || 'BRL'
        );

        if (stripeResult.success && stripeResult.init_point) {
          return NextResponse.json({
            ...stripeResult,
            plan: normalizedPlan,
            payment_method: 'credit_card',
          });
        } else if (requestedProvider === 'stripe') {
          return NextResponse.json(
            {
              success: false,
              error: stripeResult.error || 'Falha ao iniciar checkout com cartão via Stripe.',
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
        // 1. Tenta criar Assinatura Recorrente Mensal Real no Mercado Pago (/preapproval) quando effectiveBillingCycle === 'recurring' e método for cartão
        if (effectiveBillingCycle === 'recurring' && paymentMethod === 'credit_card') {
          const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken.trim()}`,
            },
            body: JSON.stringify({
              reason: `Assinatura Mensal no Cartão - ${
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
                plan: normalizedPlan,
                payment_method: 'credit_card',
                billing_model: 'recurring_subscription',
                provider: 'mercadopago',
              });
            }
          }
        }

        // 2. Checkout de Ciclo de 30 Dias no Mercado Pago (configurado para Cartão de Crédito ou PIX)
        const paymentMethodsConfig =
          paymentMethod === 'credit_card'
            ? {
                installments: Math.min(maxInstallments, Math.max(1, Number(installments) || maxInstallments)),
                default_payment_method_id: null,
                excluded_payment_types: [{ id: 'ticket' }],
              }
            : {
                installments: maxInstallments,
              };

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
            payment_methods: paymentMethodsConfig,
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
            plan: normalizedPlan,
            payment_method: paymentMethod,
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
      message:
        paymentMethod === 'credit_card'
          ? 'Para checkout automático no cartão de crédito, configure as chaves do Mercado Pago ou Stripe em Configurações Master. Você também pode concluir via PIX abaixo:'
          : 'Checkout de ciclo de 30 dias gerado com CRC16-CCITT dinâmico validado',
      amount: planPrice,
      plan: normalizedPlan,
      payment_method: paymentMethod,
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
