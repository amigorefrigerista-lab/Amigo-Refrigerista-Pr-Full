import { NextRequest, NextResponse } from 'next/server';
import {
  notifyTechnicianPaymentFailed,
  getPaymentFailureLogs,
  PaymentFailureNotificationParams,
} from '@/lib/paymentFailureNotifier';
import { getAppSettings } from '@/lib/getAppSettings';
import { getClientIp, checkRateLimitAsync } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const appSettings = await getAppSettings();
    const apiUrl = String(
      process.env.WHATSAPP_API_URL || appSettings?.whatsapp_api_url || ''
    ).trim();

    const logs = getPaymentFailureLogs();

    return NextResponse.json({
      success: true,
      whatsappConfigured: Boolean(apiUrl && apiUrl.startsWith('https://')),
      provider: apiUrl ? 'evolution_api' : 'none',
      logsCount: logs.length,
      logs,
      message: 'Sistema de notificação automática via WhatsApp para falha de cobrança recorrente operacional.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao consultar logs de notificação.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimitAsync(clientIp, {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde antes de tentar novamente.' },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PaymentFailureNotificationParams & {
      testDirectNumber?: string;
    };

    const targetPhone = body.testDirectNumber || body.targetPhone;

    const result = await notifyTechnicianPaymentFailed({
      targetUid: body.targetUid || null,
      targetEmail: body.targetEmail || null,
      targetPhone: targetPhone || null,
      technicianName: body.technicianName || null,
      plan: body.plan || 'pro',
      amount: Number(body.amount) || 39.9,
      failureReason: body.failureReason || 'Falha no débito automático do cartão de crédito',
      provider: body.provider || 'mercadopago',
      subscriptionId: body.subscriptionId || null,
      paymentId: body.paymentId || null,
      updatePaymentUrl: body.updatePaymentUrl || null,
    });

    return NextResponse.json({
      success: true,
      result,
      message: result.providerDispatched
        ? `Notificação enviada com sucesso via WhatsApp para +${result.phone}.`
        : result.phone
        ? `Notificação formatada e link direto wa.me gerado para +${result.phone}.`
        : 'Notificação gerada com sucesso para o técnico.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro ao disparar notificação de falha de pagamento via WhatsApp.',
      },
      { status: 500 }
    );
  }
}
