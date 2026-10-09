import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import {
  resolveStripeCredentials,
  verifyStripeWebhookSignature,
} from '@/lib/paymentGateway';
import {
  getSupabaseServiceClient,
  checkRateLimitAsync,
  getClientIp,
} from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { users, processedPayments } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    provider: 'stripe',
    message: 'Webhook Stripe (Cartão de Crédito Recorrente & Ciclo 30D) do Amigo Refrigerista Pro operando.',
    timestamp: new Date().toISOString(),
  });
}

function extractStripeMetadata(obj: any): {
  targetUid: string;
  targetEmail: string;
  plan: 'flex' | 'pro';
  cycleDays: number;
} {
  const meta =
    obj?.metadata ||
    obj?.subscription_details?.metadata ||
    obj?.lines?.data?.[0]?.metadata ||
    {};

  let targetUid = String(meta.uid || obj?.client_reference_id || '').trim();
  let targetEmail = String(
    meta.email || obj?.customer_email || obj?.customer_details?.email || ''
  )
    .trim()
    .toLowerCase();
  let plan: 'flex' | 'pro' = meta.plan === 'flex' ? 'flex' : 'pro';
  let cycleDays = Number(meta.cycle_days) > 0 ? Number(meta.cycle_days) : 30;

  if (meta.external_reference) {
    try {
      const parsedRef = JSON.parse(meta.external_reference);
      if (!targetUid && parsedRef.uid) targetUid = String(parsedRef.uid).trim();
      if (!targetEmail && parsedRef.email) {
        targetEmail = String(parsedRef.email).trim().toLowerCase();
      }
      if (parsedRef.plan === 'flex') plan = 'flex';
      if (Number(parsedRef.cycleDays) > 0) cycleDays = Number(parsedRef.cycleDays);
    } catch {
      // ignore invalid JSON
    }
  }

  return { targetUid, targetEmail, plan, cycleDays };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`webhook_stripe:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Payload vazio.' }, { status: 400 });
    }

    const settings = await getAppSettings();
    const stripeCreds = resolveStripeCredentials(settings);
    const sigHeader = req.headers.get('stripe-signature') || '';

    if (!stripeCreds.webhookSecret) {
      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET não configurado no servidor.' },
        { status: 401 }
      );
    }

    const isSignatureValid = verifyStripeWebhookSignature({
      rawBody,
      signatureHeader: sigHeader,
      webhookSecret: stripeCreds.webhookSecret,
    });

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Assinatura Stripe-Signature inválida.' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = String(event?.type || '');
    const obj = event?.data?.object || {};

    // 1. Pagamento Aprovado no Stripe Checkout, PaymentIntent ou Renovação Recorrente de Assinatura (Invoice)
    if (
      eventType === 'checkout.session.completed' ||
      eventType === 'invoice.payment_succeeded' ||
      eventType === 'invoice.paid' ||
      eventType === 'payment_intent.succeeded'
    ) {
      const isPaid =
        eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid'
          ? obj.status === 'paid' || obj.paid === true
          : eventType === 'payment_intent.succeeded'
          ? obj.status === 'succeeded'
          : obj.payment_status === 'paid' || obj.status === 'complete';

      if (!isPaid) {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: 'Pagamento ainda não consta como pago (paid).',
        });
      }

      const paymentId = String(obj.payment_intent || obj.id || event.id).trim();
      const subscriptionId =
        typeof obj.subscription === 'string' && obj.subscription.trim()
          ? obj.subscription.trim()
          : null;

      let { targetUid, targetEmail, plan, cycleDays } = extractStripeMetadata(obj);

      // Se for uma fatura de assinatura recorrente sem UID direto nos metadados, busca pelo active_preapproval_id
      const serviceSb = getSupabaseServiceClient();
      if (!targetUid && subscriptionId) {
        if (serviceSb) {
          const { data: subProfile } = await serviceSb
            .from('profiles')
            .select('id, email, plano')
            .eq('active_preapproval_id', subscriptionId)
            .maybeSingle();

          if (subProfile?.id) {
            targetUid = String(subProfile.id).trim();
            if (!targetEmail && subProfile.email) {
              targetEmail = String(subProfile.email).trim().toLowerCase();
            }
            if (subProfile.plano === 'flex' || subProfile.plano === 'pro') {
              plan = subProfile.plano;
            }
          }
        }

        if (!targetUid && isSqlAvailable()) {
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.activePreapprovalId, subscriptionId))
            .limit(1);

          if (rows[0]?.uid) {
            targetUid = rows[0].uid.trim();
            if (!targetEmail && rows[0].email) {
              targetEmail = rows[0].email.trim().toLowerCase();
            }
            if (rows[0].plan === 'flex' || rows[0].plan === 'pro') {
              plan = rows[0].plan as 'flex' | 'pro';
            }
          }
        }
      }

      if (!targetUid) {
        return NextResponse.json(
          { error: 'UID do usuário ausente nos metadados do evento Stripe.' },
          { status: 400 }
        );
      }

      const amountPaid =
        typeof obj.amount_total === 'number'
          ? obj.amount_total / 100
          : typeof obj.amount_paid === 'number'
          ? obj.amount_paid / 100
          : typeof obj.amount_received === 'number'
          ? obj.amount_received / 100
          : plan === 'flex'
          ? 19.9
          : 39.9;
      const amountCents = Math.round(Number(amountPaid) * 100);

      const approvedAt = new Date();
      // Se o Stripe informou o period_end da fatura/assinatura, respeita-o; caso contrário aplica +cycleDays
      const periodEndSeconds =
        Number(obj?.lines?.data?.[0]?.period?.end || obj?. current_period_end || 0);
      const expiresAtDate =
        periodEndSeconds > Math.floor(approvedAt.getTime() / 1000)
          ? new Date(periodEndSeconds * 1000)
          : new Date(approvedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);
      const expiresAtIso = expiresAtDate.toISOString();

      if (serviceSb) {
        // Verifica idempotência no Supabase
        const { data: existing } = await serviceSb
          .from('processed_payments')
          .select('payment_id, status')
          .eq('payment_id', paymentId)
          .maybeSingle();

        if (existing?.status === 'approved') {
          return NextResponse.json({
            received: true,
            idempotent: true,
            payment_id: paymentId,
          });
        }

        await serviceSb.from('processed_payments').upsert(
          {
            payment_id: paymentId,
            user_id: targetUid,
            user_email: targetEmail || null,
            plan,
            status: 'approved',
            amount: amountPaid,
            approved_at: approvedAt.toISOString(),
            expires_at: expiresAtIso,
            processed_at: new Date().toISOString(),
          },
          { onConflict: 'payment_id' }
        );

        const profileUpdate: Record<string, any> = {
          plano: plan,
          subscription_status: 'active',
          plan_expires_at: expiresAtIso,
          active_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        };
        if (subscriptionId) {
          profileUpdate.active_preapproval_id = subscriptionId;
        }

        await serviceSb.from('profiles').update(profileUpdate).eq('id', targetUid);
      }

      if (isSqlAvailable()) {
        const existingRows = await db
          .select()
          .from(processedPayments)
          .where(eq(processedPayments.paymentId, paymentId))
          .limit(1);

        if (existingRows[0]?.status === 'approved') {
          return NextResponse.json({
            received: true,
            idempotent: true,
            payment_id: paymentId,
          });
        }

        await db
          .insert(processedPayments)
          .values({
            paymentId,
            userUid: targetUid,
            userEmail: targetEmail || null,
            plan,
            status: 'approved',
            amount: amountCents,
            approvedAt,
            expiresAt: expiresAtDate,
            processedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: processedPayments.paymentId,
            set: {
              status: 'approved',
              amount: amountCents,
              expiresAt: expiresAtDate,
              processedAt: new Date(),
            },
          });

        const sqlUpdate: Record<string, any> = {
          plan,
          subscriptionStatus: 'active',
          planExpiresAt: expiresAtDate,
          activePaymentId: paymentId,
        };
        if (subscriptionId) {
          sqlUpdate.activePreapprovalId = subscriptionId;
        }

        await db.update(users).set(sqlUpdate).where(eq(users.uid, targetUid));
      }

      return NextResponse.json({
        received: true,
        status: 'approved',
        provider: 'stripe',
        payment_id: paymentId,
        subscription_id: subscriptionId,
        plan,
        expires_at: expiresAtIso,
      });
    }

    // 2. Atualização de Assinatura Recorrente no Stripe (ex: cancel_at_period_end, reativação ou mudança de status)
    if (eventType === 'customer.subscription.updated') {
      const subscriptionId = String(obj.id || '').trim();
      const subStatus = String(obj.status || '').toLowerCase();
      const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
      const { targetUid } = extractStripeMetadata(obj);

      const newSubStatus =
        subStatus === 'canceled' || subStatus === 'unpaid' || cancelAtPeriodEnd
          ? 'cancelled'
          : subStatus === 'active' || subStatus === 'trialing'
          ? 'active'
          : 'past_due';

      const serviceSb = getSupabaseServiceClient();
      if (serviceSb && (subscriptionId || targetUid)) {
        const query = serviceSb.from('profiles').update({
          subscription_status: newSubStatus,
          ...(subStatus === 'canceled' ? { active_preapproval_id: null } : {}),
          updated_at: new Date().toISOString(),
        });
        if (subscriptionId) {
          await query.eq('active_preapproval_id', subscriptionId);
        } else if (targetUid) {
          await query.eq('id', targetUid);
        }
      }

      if (isSqlAvailable() && (subscriptionId || targetUid)) {
        const sqlSet: Record<string, any> = {
          subscriptionStatus: newSubStatus,
        };
        if (subStatus === 'canceled') {
          sqlSet.activePreapprovalId = null;
        }
        if (subscriptionId) {
          await db.update(users).set(sqlSet).where(eq(users.activePreapprovalId, subscriptionId));
        } else if (targetUid) {
          await db.update(users).set(sqlSet).where(eq(users.uid, targetUid));
        }
      }

      return NextResponse.json({
        received: true,
        status: newSubStatus,
        subscription_id: subscriptionId,
        event: eventType,
      });
    }

    // 3. Falha de Cobrança Recorrente no Cartão (invoice.payment_failed)
    if (eventType === 'invoice.payment_failed') {
      const subscriptionId =
        typeof obj.subscription === 'string' ? obj.subscription.trim() : '';
      const { targetUid } = extractStripeMetadata(obj);

      const serviceSb = getSupabaseServiceClient();
      if (serviceSb) {
        if (subscriptionId) {
          await serviceSb
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('active_preapproval_id', subscriptionId);
        } else if (targetUid) {
          await serviceSb
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUid);
        }
      }

      if (isSqlAvailable()) {
        if (subscriptionId) {
          await db
            .update(users)
            .set({ subscriptionStatus: 'past_due' })
            .where(eq(users.activePreapprovalId, subscriptionId));
        } else if (targetUid) {
          await db
            .update(users)
            .set({ subscriptionStatus: 'past_due' })
            .where(eq(users.uid, targetUid));
        }
      }

      return NextResponse.json({
        received: true,
        status: 'past_due',
        event: eventType,
      });
    }

    // 4. Estorno, Chargeback ou Cancelamento Definitivo de Assinatura no Stripe
    if (
      eventType === 'charge.refunded' ||
      eventType === 'charge.dispute.created' ||
      eventType === 'customer.subscription.deleted'
    ) {
      const { targetUid } = extractStripeMetadata(obj);
      const subscriptionId =
        eventType === 'customer.subscription.deleted' ? String(obj.id || '').trim() : '';
      const refundedPaymentId = String(obj.payment_intent || obj.id || '').trim();
      const revokeStatus =
        eventType === 'charge.dispute.created' ? 'charged_back' : 'refunded';

      const serviceSb = getSupabaseServiceClient();
      if (serviceSb) {
        if (eventType === 'customer.subscription.deleted' && subscriptionId) {
          await serviceSb
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
              active_preapproval_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('active_preapproval_id', subscriptionId);
        } else {
          if (refundedPaymentId) {
            await serviceSb
              .from('processed_payments')
              .update({
                status: revokeStatus,
                processed_at: new Date().toISOString(),
              })
              .eq('payment_id', refundedPaymentId);
          }

          if (targetUid) {
            await serviceSb
              .from('profiles')
              .update({
                plano: 'free',
                subscription_status: revokeStatus,
                plan_expires_at: new Date().toISOString(),
                active_payment_id: null,
                active_preapproval_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetUid);
          } else if (refundedPaymentId) {
            await serviceSb
              .from('profiles')
              .update({
                plano: 'free',
                subscription_status: revokeStatus,
                plan_expires_at: new Date().toISOString(),
                active_payment_id: null,
                active_preapproval_id: null,
                updated_at: new Date().toISOString(),
              })
              .eq('active_payment_id', refundedPaymentId);
          }
        }
      }

      if (isSqlAvailable()) {
        if (eventType === 'customer.subscription.deleted' && subscriptionId) {
          await db
            .update(users)
            .set({
              subscriptionStatus: 'cancelled',
              activePreapprovalId: null,
            })
            .where(eq(users.activePreapprovalId, subscriptionId));
        } else {
          if (refundedPaymentId) {
            await db
              .update(processedPayments)
              .set({ status: revokeStatus, processedAt: new Date() })
              .where(eq(processedPayments.paymentId, refundedPaymentId));
          }

          if (targetUid) {
            await db
              .update(users)
              .set({
                plan: 'free',
                subscriptionStatus: revokeStatus,
                planExpiresAt: new Date(),
                activePaymentId: null,
                activePreapprovalId: null,
              })
              .where(
                refundedPaymentId
                  ? and(eq(users.uid, targetUid), eq(users.activePaymentId, refundedPaymentId))
                  : eq(users.uid, targetUid)
              );
          } else if (refundedPaymentId) {
            await db
              .update(users)
              .set({
                plan: 'free',
                subscriptionStatus: revokeStatus,
                planExpiresAt: new Date(),
                activePaymentId: null,
                activePreapprovalId: null,
              })
              .where(eq(users.activePaymentId, refundedPaymentId));
          }
        }
      }

      return NextResponse.json({
        received: true,
        status: 'reverted_or_cancelled',
        event: eventType,
      });
    }

    return NextResponse.json({ received: true, ignored: true, type: eventType });
  } catch (err: any) {
    console.error('Erro no processamento do webhook Stripe:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno no webhook Stripe.' },
      { status: 500 }
    );
  }
}
