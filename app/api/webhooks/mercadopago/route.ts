import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import { getSupabaseServiceClient, checkRateLimitAsync, getClientIp } from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { users, processedPayments } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

declare global {
  var _processedPaymentsStore:
    | Map<
        string,
        {
          userUid: string;
          userEmail: string;
          plan: 'flex' | 'pro';
          status: 'approved' | 'refunded' | 'charged_back';
          expiresAtIso: string;
        }
      >
    | undefined;
}

function getMemoryProcessedPayments() {
  if (!global._processedPaymentsStore) {
    global._processedPaymentsStore = new Map();
  }
  return global._processedPaymentsStore;
}

/**
 * Valida a assinatura HMAC-SHA256 oficial do Mercado Pago (header x-signature e x-request-id)
 */
export function verifyMercadoPagoSignature(
  req: NextRequest,
  resourceId: string,
  webhookSecret: string
): boolean {
  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';

  if (!xSignature || !webhookSecret) {
    return false;
  }

  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) return false;

  const manifest = `id:${resourceId};request-id:${xRequestId};ts:${ts};`;
  const computedHmac = crypto
    .createHmac('sha256', webhookSecret.trim())
    .update(manifest)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(v1, 'hex');
    const expBuf = Buffer.from(computedHmac, 'hex');
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Verifica se o payment_id já foi processado com status 'approved' (Idempotência contra reenvios do Mercado Pago)
 */
async function isPaymentAlreadyApproved(paymentId: string): Promise<boolean> {
  if (getMemoryProcessedPayments().get(paymentId)?.status === 'approved') {
    return true;
  }

  const serviceSb = getSupabaseServiceClient();
  if (serviceSb) {
    const { data, error } = await serviceSb
      .from('processed_payments')
      .select('payment_id, status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao consultar idempotência no Supabase: ${error.message}`);
    }

    if (data && data.status === 'approved') {
      return true;
    }
  }

  if (isSqlAvailable()) {
    const rows = await db
      .select()
      .from(processedPayments)
      .where(eq(processedPayments.paymentId, paymentId))
      .limit(1);
    if (rows[0] && rows[0].status === 'approved') {
      return true;
    }
  }

  return false;
}

/**
 * Registra a aprovação idempotente do pagamento e vincula active_payment_id (e active_preapproval_id quando aplicável) ao usuário.
 * - Confere o `error` de CADA operação de escrita no Supabase/SQL e propaga exceção para que a rota retorne HTTP 500 se o banco falhar.
 * - Marca no mapa em memória SOMENTE DEPOIS de todas as escritas no banco concluírem com sucesso.
 */
async function applyApprovedPaymentIdempotent(params: {
  paymentId: string;
  preapprovalId?: string | null;
  targetUid: string;
  targetEmail: string;
  plan: 'flex' | 'pro';
  amount: number;
  approvedAt: Date;
  cycleDays?: number;
}): Promise<{ applied: boolean; alreadyProcessed: boolean; expiresAtIso: string }> {
  const {
    paymentId,
    preapprovalId = null,
    targetUid,
    targetEmail,
    plan,
    amount,
    approvedAt,
    cycleDays = 30,
  } = params;
  const expiresAt = new Date(approvedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();

  if (await isPaymentAlreadyApproved(paymentId)) {
    return { applied: false, alreadyProcessed: true, expiresAtIso };
  }

  const serviceSb = getSupabaseServiceClient();
  if (serviceSb && targetUid) {
    const { error: upsertErr } = await serviceSb.from('processed_payments').upsert(
      {
        payment_id: paymentId,
        user_id: targetUid,
        user_email: targetEmail || null,
        plan,
        status: 'approved',
        amount,
        approved_at: approvedAt.toISOString(),
        expires_at: expiresAtIso,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'payment_id' }
    );

    if (upsertErr) {
      throw new Error(`Falha ao gravar processed_payments no Supabase: ${upsertErr.message}`);
    }

    const profileUpdatePayload: Record<string, any> = {
      plano: plan,
      subscription_status: 'active',
      plan_expires_at: expiresAtIso,
      active_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    };
    if (preapprovalId) {
      profileUpdatePayload.active_preapproval_id = preapprovalId;
    }

    const { data: updatedProfiles, error: profileErr } = await serviceSb
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', targetUid)
      .select('id');

    if (profileErr) {
      throw new Error(`Falha ao atualizar perfil do assinante no Supabase: ${profileErr.message}`);
    }

    if (!updatedProfiles || updatedProfiles.length === 0) {
      throw new Error(
        `Nenhum perfil encontrado em public.profiles para o UID ${targetUid} ao aprovar pagamento ${paymentId}.`
      );
    }
  }

  if (isSqlAvailable() && targetUid) {
    await db
      .insert(processedPayments)
      .values({
        paymentId,
        userUid: targetUid,
        userEmail: targetEmail || null,
        plan,
        status: 'approved',
        amount: Math.round(amount * 100),
        approvedAt,
        expiresAt,
        processedAt: new Date(),
      })
      .onConflictDoNothing();

    const sqlUpdatePayload: Record<string, any> = {
      plan,
      subscriptionStatus: 'active',
      planExpiresAt: expiresAt,
      activePaymentId: paymentId,
    };
    if (preapprovalId) {
      sqlUpdatePayload.activePreapprovalId = preapprovalId;
    }

    await db.update(users).set(sqlUpdatePayload).where(eq(users.uid, targetUid));
  }

  // CORREÇÃO CRÍTICA: Só registra no cache em memória DEPOIS de todas as gravações no banco terem sucesso
  getMemoryProcessedPayments().set(paymentId, {
    userUid: targetUid,
    userEmail: targetEmail,
    plan,
    status: 'approved',
    expiresAtIso,
  });

  return { applied: true, alreadyProcessed: false, expiresAtIso };
}

/**
 * Revoga o plano SOMENTE se:
 * 1) O evento for reembolso ('refunded') ou chargeback ('charged_back') — NUNCA por 'rejected' ou 'cancelled' de checkout avulso;
 * 2) O payment_id corresponder exatamente ao active_payment_id que concedeu o acesso atual do assinante (impede que reembolso de pagamento antigo derrube renovação ativa).
 * - Confere erros de escrita no banco e propaga exceção para responder 500 se o banco falhar.
 */
async function revokePlanForRefundedOrChargedBackPayment(params: {
  paymentId: string;
  targetUid: string;
  revokeStatus: 'refunded' | 'charged_back';
}): Promise<boolean> {
  const { paymentId, targetUid, revokeStatus } = params;
  if (!paymentId || !targetUid) return false;

  let revoked = false;

  const serviceSb = getSupabaseServiceClient();
  if (serviceSb) {
    const { error: ppErr } = await serviceSb
      .from('processed_payments')
      .update({ status: revokeStatus, processed_at: new Date().toISOString() })
      .eq('payment_id', paymentId)
      .eq('user_id', targetUid);

    if (ppErr) {
      throw new Error(`Falha ao atualizar status em processed_payments: ${ppErr.message}`);
    }

    // Só rebaixa o perfil se active_payment_id === paymentId (o pagamento estornado é o que concedeu o ciclo atual)
    const { data: updatedRows, error: revErr } = await serviceSb
      .from('profiles')
      .update({
        plano: 'free',
        subscription_status: revokeStatus,
        plan_expires_at: new Date(0).toISOString(),
        active_payment_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUid)
      .eq('active_payment_id', paymentId)
      .select('id');

    if (revErr) {
      throw new Error(`Falha ao revogar plano em profiles: ${revErr.message}`);
    }

    if (updatedRows && updatedRows.length > 0) {
      revoked = true;
    }
  }

  if (isSqlAvailable()) {
    await db
      .update(processedPayments)
      .set({ status: revokeStatus, processedAt: new Date() })
      .where(
        and(
          eq(processedPayments.paymentId, paymentId),
          eq(processedPayments.userUid, targetUid)
        )
      );

    const updated = await db
      .update(users)
      .set({
        plan: 'free',
        subscriptionStatus: revokeStatus,
        planExpiresAt: new Date(0),
        activePaymentId: null,
      })
      .where(and(eq(users.uid, targetUid), eq(users.activePaymentId, paymentId)))
      .returning({ uid: users.uid });

    if (updated && updated.length > 0) {
      revoked = true;
    }
  }

  const mem = getMemoryProcessedPayments().get(paymentId);
  if (mem && mem.userUid === targetUid) {
    mem.status = revokeStatus;
    if (!serviceSb && !isSqlAvailable()) {
      revoked = true;
    }
  }

  return revoked;
}

function parseExternalReference(
  rawRef: unknown,
  defaultProPrice: number
): {
  targetEmail: string;
  targetUid: string;
  targetPlan: 'flex' | 'pro';
  minimumExpectedAmount: number;
} {
  let targetEmail = '';
  let targetUid = '';
  let targetPlan: 'flex' | 'pro' = 'pro';
  let minimumExpectedAmount = 19.0;

  if (typeof rawRef === 'string' && rawRef.startsWith('{')) {
    try {
      const parsedRef = JSON.parse(rawRef);
      targetEmail = String(parsedRef.email || '').toLowerCase().trim();
      targetUid = String(parsedRef.uid || '').trim();
      targetPlan = parsedRef.plan === 'flex' ? 'flex' : 'pro';
      minimumExpectedAmount =
        targetPlan === 'flex' ? 19.0 : Math.max(19.0, Number(defaultProPrice || 39.9) - 1);
    } catch {
      // ignore malformed JSON
    }
  }

  return { targetEmail, targetUid, targetPlan, minimumExpectedAmount };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`webhook_mp:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');
    const topicParam = url.searchParams.get('topic') || url.searchParams.get('type') || '';

    const settings = await getAppSettings();
    const accessToken = settings.mercadopago_access_token;
    const webhookSecret = (
      process.env.MERCADOPAGO_WEBHOOK_SECRET ||
      settings.webhook_secret ||
      ''
    ).trim();

    // FAIL-CLOSED: Sem segredo de webhook configurado, recusa qualquer notificação
    if (!webhookSecret) {
      return NextResponse.json(
        {
          error:
            'Webhook bloqueado (fail-closed): MERCADOPAGO_WEBHOOK_SECRET não está configurado no servidor.',
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const resourceId = String(id || body?.data?.id || body?.id || '').trim();
    const eventType = String(body?.type || body?.topic || topicParam || 'payment')
      .toLowerCase()
      .trim();

    if (!resourceId) {
      return NextResponse.json({ error: 'ID do recurso ausente.' }, { status: 400 });
    }

    // Validação obrigatória de assinatura HMAC-SHA256
    const isValidSig = verifyMercadoPagoSignature(req, resourceId, webhookSecret);
    if (!isValidSig) {
      return NextResponse.json(
        { error: 'Assinatura de webhook inválida (x-signature).' },
        { status: 401 }
      );
    }

    if (!accessToken || !accessToken.startsWith('APP_USR')) {
      return NextResponse.json(
        { error: 'Access Token do Mercado Pago não configurado.' },
        { status: 503 }
      );
    }

    // 1. Tratamento de Assinatura Recorrente (subscription_preapproval / preapproval)
    if (eventType.includes('preapproval')) {
      const preRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(resourceId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken.trim()}` },
        }
      );

      if (!preRes.ok) {
        return NextResponse.json(
          { error: 'Não foi possível consultar a assinatura recorrente no Mercado Pago.' },
          { status: 502 }
        );
      }

      const preData = await preRes.json();
      const preStatus = String(preData.status || '').toLowerCase();
      const { targetEmail, targetUid, targetPlan, minimumExpectedAmount } = parseExternalReference(
        preData.external_reference,
        Number(settings.pro_plan_price || 39.9)
      );
      const recurringAmount = Number(preData.auto_recurring?.transaction_amount || 0);
      const isAmountValid = recurringAmount >= minimumExpectedAmount;

      if (preStatus === 'authorized' && isAmountValid && targetUid) {
        const rawDate =
          preData.auto_recurring?.start_date ||
          preData.last_modified ||
          preData.date_created ||
          new Date().toISOString();
        const parsedBaseDate = new Date(rawDate);
        const approvedDate = Number.isNaN(parsedBaseDate.getTime()) ? new Date() : parsedBaseDate;
        const cycleKey = `preapproval:${resourceId}:${approvedDate.toISOString().slice(0, 10)}`;

        await applyApprovedPaymentIdempotent({
          paymentId: cycleKey,
          preapprovalId: resourceId,
          targetUid,
          targetEmail,
          plan: targetPlan,
          amount: recurringAmount,
          approvedAt: approvedDate,
          cycleDays: 32,
        });
      } else if ((preStatus === 'cancelled' || preStatus === 'paused') && targetUid) {
        // Quando a recorrência é cancelada no Mercado Pago, mantém o plano atual até plan_expires_at e marca apenas subscription_status = 'cancelled'
        const serviceSb = getSupabaseServiceClient();
        if (serviceSb) {
          const { error: cancelErr } = await serviceSb
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
              active_preapproval_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUid)
            .eq('active_preapproval_id', resourceId);

          if (cancelErr) {
            throw new Error(`Falha ao registrar cancelamento de preapproval: ${cancelErr.message}`);
          }
        }
        if (isSqlAvailable()) {
          await db
            .update(users)
            .set({
              subscriptionStatus: 'cancelled',
              activePreapprovalId: null,
            })
            .where(and(eq(users.uid, targetUid), eq(users.activePreapprovalId, resourceId)));
        }
      }

      return NextResponse.json({
        received: true,
        type: 'preapproval',
        status: preStatus,
      });
    }

    // 2. Tratamento de Pagamentos (/v1/payments/{id}) com Idempotência e Revogação estrita por payment_id
    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(resourceId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
      }
    );

    if (!paymentRes.ok) {
      return NextResponse.json(
        { error: 'Não foi possível verificar o pagamento no Mercado Pago.' },
        { status: 502 }
      );
    }

    const paymentData = await paymentRes.json();
    const status = String(paymentData.status || '').toLowerCase();
    const statusDetail = String(paymentData.status_detail || '').toLowerCase();
    const transactionAmount = Number(paymentData.transaction_amount || 0);

    const { targetEmail, targetUid, targetPlan, minimumExpectedAmount } = parseExternalReference(
      paymentData.external_reference,
      Number(settings.pro_plan_price || 39.9)
    );
    const isAmountValid = transactionAmount >= minimumExpectedAmount;

    // Aprovação idempotente: exige targetUid autenticado no checkout e usa date_approved do pagamento (+30 dias)
    if (status === 'approved' && isAmountValid && targetUid) {
      const rawApprovedDate =
        paymentData.date_approved || paymentData.date_last_updated || paymentData.date_created;
      const parsedApproved = rawApprovedDate ? new Date(rawApprovedDate) : new Date();
      const approvedAt = Number.isNaN(parsedApproved.getTime()) ? new Date() : parsedApproved;

      const result = await applyApprovedPaymentIdempotent({
        paymentId: resourceId,
        targetUid,
        targetEmail,
        plan: targetPlan,
        amount: transactionAmount,
        approvedAt,
        cycleDays: 30,
      });

      return NextResponse.json({
        received: true,
        status: paymentData.status,
        amount_verified: isAmountValid,
        idempotent_skip: result.alreadyProcessed,
        plan_expires_at: result.expiresAtIso,
      });
    }

    // CORREÇÃO CRÍTICA:
    // - NUNCA revoga o plano por 'rejected' ou 'cancelled' de um pagamento avulso.
    // - Só revoga em 'refunded' ou 'charged_back', e SOMENTE se o payment_id for o active_payment_id que concedeu o acesso atual.
    const isRefundOrChargeback =
      status === 'refunded' ||
      status === 'charged_back' ||
      statusDetail.includes('refund') ||
      statusDetail.includes('chargeback');

    if (isRefundOrChargeback && targetUid) {
      const revokeStatus: 'refunded' | 'charged_back' =
        status === 'charged_back' || statusDetail.includes('chargeback')
          ? 'charged_back'
          : 'refunded';

      const revoked = await revokePlanForRefundedOrChargedBackPayment({
        paymentId: resourceId,
        targetUid,
        revokeStatus,
      });

      return NextResponse.json({
        received: true,
        status: paymentData.status,
        revoked_active_subscription: revoked,
      });
    }

    return NextResponse.json({
      received: true,
      status: paymentData.status,
      amount_verified: isAmountValid,
      ignored_non_revoking_status: status === 'rejected' || status === 'cancelled',
    });
  } catch (error) {
    console.error('Erro no Webhook Mercado Pago:', error);
    return NextResponse.json(
      { error: 'Falha ao processar notificação de pagamento.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook Mercado Pago ativo (fail-closed + idempotente)' });
}
