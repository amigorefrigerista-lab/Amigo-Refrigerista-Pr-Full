import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import {
  resolveStripeCredentials,
  cancelStripeSubscription,
} from '@/lib/paymentGateway';
import {
  authenticateRequest,
  getSupabaseServiceClient,
  checkRateLimitAsync,
  getClientIp,
} from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`sub_cancel:${clientIp}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    // 1. Autentica o usuário requisitante
    const auth = await authenticateRequest(req);
    if (!auth.authenticated || !auth.uid) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para gerenciar sua assinatura.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedUserId = body?.userId ? String(body.userId).trim() : auth.uid;

    // 2. Garante que o usuário só pode cancelar a própria assinatura (exceto Admin Master)
    if (requestedUserId !== auth.uid && auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado: você só pode cancelar a sua própria assinatura.' },
        { status: 403 }
      );
    }

    const serviceSb = getSupabaseServiceClient();
    let currentPlan: string = auth.plan || 'pro';
    let currentExpiresAt: string | null = auth.planExpiresAt || null;
    // Ignora qualquer preapprovalId enviado no corpo da requisição e usa exclusivamente o active_preapproval_id gravado no perfil
    let activePreapprovalId: string | null = null;
    let targetUserEmail: string = auth.email || '';

    // 3. Busca dados atuais do perfil (plano, plan_expires_at e active_preapproval_id)
    if (serviceSb) {
      const { data: profile, error: fetchErr } = await serviceSb
        .from('profiles')
        .select('id, email, plano, plan_expires_at, active_preapproval_id, subscription_status')
        .eq('id', requestedUserId)
        .maybeSingle();

      if (fetchErr) {
        return NextResponse.json(
          { error: `Erro ao consultar assinatura no banco: ${fetchErr.message}` },
          { status: 500 }
        );
      }

      if (!profile) {
        return NextResponse.json(
          { error: 'Perfil de assinatura não encontrado.' },
          { status: 404 }
        );
      }

      currentPlan = profile.plano || currentPlan;
      currentExpiresAt = profile.plan_expires_at || currentExpiresAt;
      if ((profile as any).email) {
        targetUserEmail = String((profile as any).email).trim().toLowerCase();
      }
      if ((profile as any).active_preapproval_id) {
        activePreapprovalId = String((profile as any).active_preapproval_id).trim();
      }
    } else if (isSqlAvailable()) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.uid, requestedUserId))
        .limit(1);

      if (!rows || !rows[0]) {
        return NextResponse.json(
          { error: 'Perfil de assinatura não encontrado.' },
          { status: 404 }
        );
      }

      currentPlan = rows[0].plan || currentPlan;
      currentExpiresAt = rows[0].planExpiresAt ? rows[0].planExpiresAt.toISOString() : currentExpiresAt;
      if (rows[0].email) {
        targetUserEmail = rows[0].email.trim().toLowerCase();
      }
      if (rows[0].activePreapprovalId) {
        activePreapprovalId = rows[0].activePreapprovalId.trim();
      }
    }

    // 4. Se houver assinatura recorrente no Stripe (sub_...) ou Mercado Pago (active_preapproval_id), valida e cancela no respectivo gateway
    const settings = await getAppSettings();
    const accessToken = settings.mercadopago_access_token?.trim() || '';
    const stripeCreds = resolveStripeCredentials(settings);

    if (activePreapprovalId && activePreapprovalId.startsWith('sub_') && stripeCreds.isConfigured) {
      const stripeCancel = await cancelStripeSubscription({
        subscriptionId: activePreapprovalId,
        stripeSecretKey: stripeCreds.secretKey,
        expectedUid: requestedUserId,
        expectedEmail: targetUserEmail,
      });

      if (!stripeCancel.ok) {
        return NextResponse.json(
          { error: stripeCancel.error || 'Falha ao cancelar assinatura no Stripe.' },
          { status: stripeCancel.forbidden ? 403 : 502 }
        );
      }
    } else if (activePreapprovalId && accessToken && accessToken.startsWith('APP_USR')) {
      // Consulta a assinatura no Mercado Pago para conferir o status atual e, no caso de Admin ou validação cruzada, garantir que external_reference aponta para o mesmo usuário
      const mpGetRes = await fetch(
        `https://api.mercadopago.com/preapproval/${encodeURIComponent(activePreapprovalId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!mpGetRes.ok) {
        return NextResponse.json(
          {
            error: `Não foi possível consultar a assinatura no Mercado Pago (HTTP ${mpGetRes.status}). Tente novamente em instantes.`,
          },
          { status: 502 }
        );
      }

      const mpPreapproval = await mpGetRes.json().catch(() => null);
      if (!mpPreapproval || typeof mpPreapproval !== 'object') {
        return NextResponse.json(
          {
            error: 'Resposta inválida ao consultar assinatura no Mercado Pago.',
          },
          { status: 502 }
        );
      }

      // Confere que o external_reference (ou payer_email) da assinatura no Mercado Pago pertence ao usuário alvo (especialmente crítico em ações de Admin)
      const rawExtRef = mpPreapproval.external_reference;
      let extUid = '';
      let extEmail = '';
      if (typeof rawExtRef === 'string' && rawExtRef.trim()) {
        try {
          const parsedExt = JSON.parse(rawExtRef);
          extUid = parsedExt?.uid ? String(parsedExt.uid).trim() : '';
          extEmail = parsedExt?.email ? String(parsedExt.email).trim().toLowerCase() : '';
        } catch {
          extUid = rawExtRef.trim();
        }
      }

      const belongsToTargetUser =
        (extUid && extUid === requestedUserId) ||
        (!extUid && extEmail && targetUserEmail && extEmail === targetUserEmail);

      if (!belongsToTargetUser) {
        return NextResponse.json(
          {
            error:
              'Recusa de segurança: o external_reference da assinatura no Mercado Pago não corresponde ao usuário solicitado.',
          },
          { status: 403 }
        );
      }

      const currentMpStatus = String(mpPreapproval.status || '').toLowerCase();

      // Se ainda não estiver cancelada no Mercado Pago, executa o PUT e confere código HTTP e status retornado
      if (currentMpStatus !== 'cancelled') {
        const mpCancelRes = await fetch(
          `https://api.mercadopago.com/preapproval/${encodeURIComponent(activePreapprovalId)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ status: 'cancelled' }),
          }
        );

        const mpCancelBody = await mpCancelRes.json().catch(() => null);
        const updatedMpStatus = String(mpCancelBody?.status || '').toLowerCase();

        if (!mpCancelRes.ok || updatedMpStatus !== 'cancelled') {
          return NextResponse.json(
            {
              error: `Não foi possível confirmar o cancelamento da recorrência junto ao Mercado Pago (HTTP ${mpCancelRes.status}). Tente novamente em instantes.`,
            },
            { status: 502 }
          );
        }
      }
    }

    // 5. Mantém o plano pago ativo até plan_expires_at (se ainda não houver data de expiração, define fim do ciclo atual +30d ou mantém vigente)
    const effectiveExpiresAt =
      currentExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 6. Atualiza apenas subscription_status = 'cancelled' (sem rebaixar plano antes de plan_expires_at)
    if (serviceSb) {
      const { error: updateErr } = await serviceSb
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          plan_expires_at: effectiveExpiresAt,
          active_preapproval_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestedUserId);

      if (updateErr) {
        return NextResponse.json(
          { error: `Falha ao gravar cancelamento no banco: ${updateErr.message}` },
          { status: 500 }
        );
      }
    }

    if (isSqlAvailable()) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'cancelled',
          planExpiresAt: new Date(effectiveExpiresAt),
          activePreapprovalId: null,
        })
        .where(eq(users.uid, requestedUserId));
    }

    const updatedSub = {
      plan: currentPlan,
      status: 'cancelled',
      autoRenew: false,
      planExpiresAt: effectiveExpiresAt,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message:
        'Sua assinatura recorrente foi cancelada e não haverá novas cobranças. Seus benefícios permanecem ativos até o fim do ciclo atual.',
      subscription: updatedSub,
    });
  } catch (err) {
    console.error('Erro ao cancelar assinatura:', err);
    return NextResponse.json(
      { error: 'Não foi possível processar o cancelamento no momento.' },
      { status: 500 }
    );
  }
}
