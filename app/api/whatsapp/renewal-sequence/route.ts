import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
  safeHttpsRequestPinnedIp,
} from '@/lib/security';
import { getAppSettings } from '@/lib/getAppSettings';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`wa_renewal_seq:${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Limite de disparos atingido. Aguarde um instante.' },
        { status: 429 }
      );
    }

    const auth = await authenticateRequest(req);
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const settings = (global as any)._serverMasterSettings || (await getAppSettings());

    const apiUrl = String(
      body.whatsapp_api_url || settings?.whatsapp_api_url || process.env.WHATSAPP_API_URL || ''
    )
      .trim()
      .replace(/\/$/, '');

    const apiKey = String(
      body.whatsapp_api_key || settings?.whatsapp_api_key || process.env.WHATSAPP_API_KEY || ''
    ).trim();

    const instanceName = String(
      body.whatsapp_instance_name ||
        settings?.whatsapp_instance_name ||
        process.env.WHATSAPP_INSTANCE_NAME ||
        'Instancia_AmigoRefrigerista'
    )
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    let cleanPhone = String(body.phone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    const messageText = String(body.message || '').trim();
    const stepTitle = String(body.stepTitle || 'Etapa de Renovação').trim();

    if (!cleanPhone || !messageText) {
      return NextResponse.json(
        { ok: false, error: 'Informe um número de WhatsApp válido e o texto do template.' },
        { status: 400 }
      );
    }

    const waFallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    if (!apiUrl || !apiUrl.startsWith('https://')) {
      return NextResponse.json({
        ok: true,
        dispatchedViaApi: false,
        waLink: waFallbackUrl,
        message: `Template "${stepTitle}" pronto! Configure a URL HTTPS da API do WhatsApp Master para envio 100% silencioso em segundo plano ou use o link direto gerado.`,
      });
    }

    const endpoint = `${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['apikey'] = apiKey;
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payloadJson = JSON.stringify({
      number: cleanPhone,
      text: messageText,
      textMessage: { text: messageText },
    });

    const apiRes = await safeHttpsRequestPinnedIp({
      targetUrl: endpoint,
      method: 'POST',
      headers,
      body: payloadJson,
      timeoutMs: 8000,
    });

    if (apiRes.ok) {
      return NextResponse.json({
        ok: true,
        dispatchedViaApi: true,
        waLink: waFallbackUrl,
        message: `Disparo da etapa "${stepTitle}" realizado com sucesso via API WhatsApp (${instanceName}) para +${cleanPhone}!`,
      });
    }

    return NextResponse.json({
      ok: true,
      dispatchedViaApi: false,
      waLink: waFallbackUrl,
      message: `O servidor WhatsApp respondeu HTTP ${apiRes.status || 'timeout'}. Link direto wa.me preparado como fallback imediato para "${stepTitle}".`,
    });
  } catch (err: any) {
    console.error('Erro no disparo da sequência WhatsApp:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro ao processar disparo via API WhatsApp.' },
      { status: 500 }
    );
  }
}
