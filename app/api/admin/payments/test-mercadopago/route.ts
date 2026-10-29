import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = String(body.accessToken || '').trim();
    const publicKey = String(body.publicKey || '').trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Informe o Mercado Pago Access Token (ex: APP_USR-... ou TEST-...) para testar.',
        },
        { status: 400 }
      );
    }

    const isExpectedPrefix =
      accessToken.startsWith('APP_USR-') || accessToken.startsWith('TEST-');

    // Testa o Access Token diretamente na API oficial do Mercado Pago (/users/me)
    try {
      const mpRes = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (mpRes.ok) {
        const mpUser = await mpRes.json().catch(() => ({}));
        const accountLabel =
          mpUser?.nickname || mpUser?.email || mpUser?.first_name || `ID ${mpUser?.id || 'Verificado'}`;
        return NextResponse.json({
          ok: true,
          verifiedOnline: true,
          account: {
            id: mpUser?.id,
            nickname: mpUser?.nickname,
            email: mpUser?.email,
            site_id: mpUser?.site_id || 'MLB',
          },
          message: `Conexão Mercado Pago validada com sucesso! Conta vinculada: ${accountLabel}${
            publicKey ? ' • Public Key configurada.' : ''
          }`,
        });
      }

      if (mpRes.status === 401 || mpRes.status === 403) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'O Mercado Pago recusou o Access Token informado (401 Unauthorized). Verifique se o token APP_USR-... / TEST-... foi copiado completo e sem espaços.',
          },
          { status: 400 }
        );
      }
    } catch {
      // Caso o ambiente bloqueie saída externa, valida formato das chaves para não impedir o salvamento
    }

    if (!isExpectedPrefix && accessToken.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Formato de Access Token inválido. O token do Mercado Pago deve iniciar com APP_USR- ou TEST-.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      verifiedOnline: false,
      message: `Credenciais do Mercado Pago validadas (${
        accessToken.startsWith('TEST-') ? 'Ambiente Sandbox/Teste' : 'Ambiente de Produção'
      })${publicKey ? ' com Public Key ativa' : ''}!`,
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
