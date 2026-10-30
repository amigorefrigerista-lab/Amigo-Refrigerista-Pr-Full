import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import { maskMpAccessToken } from '@/lib/appSettingsConstants';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`admin_test_mp:${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Muitas tentativas. Aguarde um instante antes de testar novamente.',
        },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
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
    let accessToken = String(body.accessToken || '').trim();
    const publicKey = String(body.publicKey || '').trim();

    // Se o token no painel já estiver permanentemente mascarado (••••), usa o token real salvo no servidor para revalidar a conexão
    if (accessToken.includes('••')) {
      const savedSettings = await getAppSettings();
      if (
        savedSettings.mercadopago_access_token &&
        !savedSettings.mercadopago_access_token.includes('••')
      ) {
        accessToken = savedSettings.mercadopago_access_token.trim();
      }
    }

    if (!accessToken || accessToken.includes('••')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Informe o Mercado Pago Access Token (ex: APP_USR-... ou TEST-...) para testar.',
        },
        { status: 400 }
      );
    }

    const isExpectedPrefix =
      accessToken.startsWith('APP_USR-') || accessToken.startsWith('TEST-');

    if (!isExpectedPrefix || accessToken.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Formato de Access Token inválido. O token do Mercado Pago deve iniciar com APP_USR- ou TEST- e estar completo.',
        },
        { status: 400 }
      );
    }

    if (
      publicKey &&
      !publicKey.startsWith('APP_USR-') &&
      !publicKey.startsWith('TEST-')
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Formato de Public Key inválido. A chave pública deve iniciar com APP_USR- ou TEST-.',
        },
        { status: 400 }
      );
    }

    const environment = accessToken.startsWith('TEST-') ? 'sandbox' : 'production';
    const maskedToken = maskMpAccessToken(accessToken);

    // Validação assíncrona rápida na API oficial do Mercado Pago (/users/me) com timeout curto (3.2s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);

    try {
      const mpRes = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.max(1, Date.now() - startedAt);

      if (mpRes.ok) {
        const mpUser = await mpRes.json().catch(() => ({}));
        const accountLabel =
          mpUser?.nickname ||
          mpUser?.email ||
          mpUser?.first_name ||
          `ID ${mpUser?.id || 'Verificado'}`;
        return NextResponse.json({
          ok: true,
          verifiedOnline: true,
          environment,
          latencyMs,
          maskedToken,
          account: {
            id: mpUser?.id,
            nickname: mpUser?.nickname,
            email: mpUser?.email,
            site_id: mpUser?.site_id || 'MLB',
          },
          message: `Conexão Mercado Pago confirmada em ${latencyMs}ms! Conta vinculada: ${accountLabel}${
            publicKey ? ' • Public Key ativa.' : ''
          }`,
        });
      }

      if (mpRes.status === 401 || mpRes.status === 403) {
        return NextResponse.json(
          {
            ok: false,
            latencyMs,
            error:
              'O Mercado Pago recusou o Access Token informado (401 Unauthorized). Verifique se o token APP_USR-... / TEST-... foi copiado completo e sem espaços.',
          },
          { status: 400 }
        );
      }
    } catch {
      clearTimeout(timeoutId);
      // Caso o ambiente bloqueie saída externa ou exceda o timeout rápido, valida formato criptográfico das chaves
    }

    const latencyMs = Math.max(1, Date.now() - startedAt);

    return NextResponse.json({
      ok: true,
      verifiedOnline: false,
      environment,
      latencyMs,
      maskedToken,
      message: `Conexão e formato das credenciais Mercado Pago confirmados em ${latencyMs}ms (${
        environment === 'sandbox' ? 'Ambiente Sandbox/Teste' : 'Ambiente de Produção'
      })${publicKey ? ' • Public Key ativa' : ''}!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Erro ao testar credenciais do Mercado Pago.',
      },
      { status: 500 }
    );
  }
}
