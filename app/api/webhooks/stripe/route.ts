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
import { eq } from 'drizzle-orm';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Webhook Stripe International do Amigo Refrigerista Pro operando.',
    timestamp: new Date().toISOString(),
  });
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

    // 1. Pagamento Aprovado no Stripe Checkout ou Renovação de Fatura de Assinatura
    if (
      eventType === 'checkout.session.completed' ||
      eventType === 'invoice.payment_succeeded'
    ) {
      const isPaid =
        eventType === 'invoice.payment_succeeded'
          ? obj.status === 'paid' || obj.paid === true
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
        typeof obj.subscription === 'string' ? obj.subscription.trim() : null;

      const meta = obj.metadata || obj.subscription_details?.metadata || {};
      let targetUid = String(meta.uid || obj.client_reference_id || '').trim();
      let targetEmail = String(
        meta.email || obj.customer_email || obj.customer_details?.email || ''
      )
        .trim()
        .toLowerCase();
      let plan: 'flex' | 'pro' = meta.plan === 'flex' ? 'flex' : 'pro';

      if (meta.external_reference) {
        try {
          const parsedRef = JSON.parse(meta.external_reference);
          if (!targetUid && parsedRef.uid) targetUid = String(parsedRef.uid).trim();
          if (!targetEmail && parsedRef.email) {
            targetEmail = String(parsedRef.email).trim().toLowerCase();
          }
          if (parsedRef.plan === 'flex') plan = 'flex';
        } catch {
          // ignore
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
          : plan === 'flex'
          ? 19.9
          : 39.9;
      const amountCents = Math.round(Number(amountPaid) * 100);

      const cycleDays = Number(meta.cycle_days) > 0 ? Number(meta.cycle_days) : 30;
      const approvedAt = new Date();
      const expiresAtIso = new Date(
        approvedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const serviceSb = getSupabaseServiceClient();
      if (serviceSb) {
        // Verifica idempotência
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
            expiresAt: new Date(expiresAtIso),
            processedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: processedPayments.paymentId,
            set: {
              status: 'approved',
              amount: amountCents,
              expiresAt: new Date(expiresAtIso),
              processedAt: new Date(),
            },
          });

        const sqlUpdate: Record<string, any> = {
          plan,
          subscriptionStatus: 'active',
          planExpiresAt: new Date(expiresAtIso),
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

    // 2. Estorno, Chargeback ou Cancelamento de Assinatura no Stripe
    if (
      eventType === 'charge.refunded' ||
      eventType === 'charge.dispute.created' ||
      eventType === 'customer.subscription.deleted'
    ) {
      const meta = obj.metadata || {};
      const targetUid = String(meta.uid || '').trim();
      const subscriptionId =
        eventType === 'customer.subscription.deleted' ? String(obj.id || '').trim() : '';

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
        } else if (targetUid) {
          await serviceSb
            .from('profiles')
            .update({
              plano: 'free',
              subscription_status: 'refunded',
              plan_expires_at: new Date().toISOString(),
              active_payment_id: null,
              active_preapproval_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUid);
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
        } else if (targetUid) {
          await db
            .update(users)
            .set({
              plan: 'free',
              subscriptionStatus: 'refunded',
              planExpiresAt: new Date(),
              activePaymentId: null,
              activePreapprovalId: null,
            })
            .where(eq(users.uid, targetUid));
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
