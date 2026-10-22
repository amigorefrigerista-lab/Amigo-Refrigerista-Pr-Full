import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
  safeHttpsGetPinnedIp,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`wa_test:${clientIp}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          status: 'RATE_LIMITED',
          message: 'Muitas tentativas de teste. Aguarde um minuto.',
        },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const auth = await authenticateRequest(req);
    if (!auth.authenticated || !auth.uid) {
      return NextResponse.json(
        {
          success: false,
          status: 'UNAUTHORIZED',
          message: 'Sessão não autenticada. Faça login para testar a conexão da API WhatsApp.',
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { api_provider, api_url, api_key, instance_name, phone_number } = body || {};

    const instanceName = String(instance_name || 'Instancia_AmigoRefrigerista')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const baseUrl = api_url ? String(api_url).trim().replace(/\/$/, '') : '';

    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          status: 'DISCONNECTED',
          message: 'Informe a URL da API do WhatsApp (HTTPS) para testar a conexão.',
        },
        { status: 400 }
      );
    }

    let testEndpoint = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (api_provider === 'evolution_api') {
      testEndpoint = `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
      if (api_key) headers['apikey'] = String(api_key).trim();
    } else if (api_provider === 'z_api') {
      testEndpoint = `${baseUrl}/instances/${encodeURIComponent(instanceName)}/status`;
      if (api_key) headers['Client-Token'] = String(api_key).trim();
    } else if (api_provider === 'baileys') {
      testEndpoint = `${baseUrl}/api/${encodeURIComponent(instanceName)}/check-connection-session`;
      if (api_key) headers['Authorization'] = `Bearer ${String(api_key).trim()}`;
    } else {
      testEndpoint = `${baseUrl}/status`;
      if (api_key) headers['Authorization'] = `Bearer ${String(api_key).trim()}`;
    }

    // Proteção Anti-SSRF com DNS Pinning: resolve o DNS uma única vez, valida o IP público e conecta diretamente ao IP validado com TLS SNI (impede DNS Rebinding)
    const pinnedRes = await safeHttpsGetPinnedIp({
      targetUrl: testEndpoint,
      headers,
      timeoutMs: 6000,
    });

    if (pinnedRes.blockedReason) {
      return NextResponse.json(
        {
          success: false,
          status: 'BLOCKED_SSRF',
          message: pinnedRes.blockedReason,
        },
        { status: 400 }
      );
    }

    if (pinnedRes.status === 0) {
      return NextResponse.json(
        {
          success: false,
          status: 'DISCONNECTED',
          instance: instanceName,
          provider: api_provider || 'evolution_api',
          message:
            'Falha ao conectar no endpoint informado (timeout ou servidor inacessível). Verifique a URL e a disponibilidade do provedor.',
        },
        { status: 502 }
      );
    }

    if (!pinnedRes.ok) {
      return NextResponse.json(
        {
          success: false,
          status: 'DISCONNECTED',
          instance: instanceName,
          provider: api_provider || 'evolution_api',
          message: `O servidor WhatsApp respondeu com status HTTP ${pinnedRes.status}. Verifique a URL, instância e chave de API.`,
        },
        { status: 502 }
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(pinnedRes.bodyText || '{}');
    } catch {
      data = {};
    }
    const state = data?.instance?.state || data?.status || data?.state || 'open';

    return NextResponse.json({
      success: true,
      status:
        state === 'open' || state === 'CONNECTED' || state === 'connected'
          ? 'CONNECTED'
          : 'CONNECTING',
      instance: instanceName,
      provider: api_provider,
      phone: phone_number || 'Sem número registrado',
      message: `Conexão estabelecida com sucesso com a API ${String(
        api_provider || 'evolution_api'
      ).toUpperCase()}! Status: ${String(state).toUpperCase()}`,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: 'DISCONNECTED',
        message: 'Não foi possível processar o teste de conexão.',
      },
      { status: 500 }
    );
  }
}
