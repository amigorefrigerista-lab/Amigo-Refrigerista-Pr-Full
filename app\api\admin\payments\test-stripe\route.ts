import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const { secretKey } = await req.json();

    if (!secretKey) {
      return NextResponse.json({ ok: false, error: 'Chave secreta não fornecida.' }, { status: 400 });
    }

    // Valida a chave chamando o endpoint oficial de saldo da API Stripe
    const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
      },
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      const errorMsg = data?.error?.message || 'Falha ao autenticar com a Stripe. Verifique a chave informada.';
      return NextResponse.json({ ok: false, error: errorMsg }, { status: stripeRes.status });
    }

    return NextResponse.json({
      ok: true,
      message: 'Conexão com a Stripe validada com sucesso! As credenciais estão ativas.',
    });
  } catch (err: any) {
    console.error('Erro ao testar Stripe:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Falha ao autenticar com Stripe.' },
      { status: 500 }
    );
  }
}
