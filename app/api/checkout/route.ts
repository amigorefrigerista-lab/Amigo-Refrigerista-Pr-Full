import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, userName, planType = 'pro', returnUrl } = body;

    // 1. Busca as credenciais dinâmicas salvas no banco pelo Admin Master
    const settings = await getAppSettings();

    const accessToken = settings.mercadopago_access_token;
    const planPrice = settings.pro_plan_price || 39.90;
    const planTitle = planType === 'flex' ? 'Plano Flex VIP' : 'Plano Amigo Refrigerista PRO';

    // 2. Se houver Access Token do Mercado Pago configurado no Painel Admin Master
    if (accessToken && accessToken.startsWith('APP_USR')) {
      try {
        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken.trim()}`,
          },
          body: JSON.stringify({
            items: [
              {
                id: `plan-${planType}`,
                title: planTitle,
                description: 'Assinatura Mensal - Ferramenta de Refrigeração e PMOC Pro',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: Number(planPrice),
              },
            ],
            payer: {
              email: userEmail || 'tecnico@amigorefrigerista.com.br',
              name: userName || 'Técnico Refrigerista',
            },
            back_urls: {
              success: returnUrl || `${req.nextUrl.origin}/?payment=success`,
              failure: returnUrl || `${req.nextUrl.origin}/?payment=failure`,
              pending: returnUrl || `${req.nextUrl.origin}/?payment=pending`,
            },
            auto_return: 'approved',
            notification_url: `${req.nextUrl.origin}/api/webhooks/mercadopago`,
            external_reference: userEmail || 'user_anon',
          }),
        });

        if (mpResponse.ok) {
          const preferenceData = await mpResponse.json();
          return NextResponse.json({
            success: true,
            init_point: preferenceData.init_point || preferenceData.sandbox_init_point,
            preference_id: preferenceData.id,
            amount: planPrice,
            provider: 'mercadopago',
          });
        }
      } catch (mpErr) {
        console.error('Erro na API Mercado Pago:', mpErr);
      }
    }

    // 3. Fallback Pix Direto em Modo Demo / Sem Chave Mercado Pago cadastrada
    const pixCopyAndPaste = `00020126580014BR.GOV.BCB.PIX0136amigorefrigerista@gmail.com5204000053039865405${planPrice.toFixed(2)}5802BR5922AMIGO REFRIGERISTA PRO6009SAO PAULO62070503***6304C8A1`;

    return NextResponse.json({
      success: true,
      init_point: null,
      message: 'Checkout gerado com valor dinâmico do Painel Master',
      amount: planPrice,
      pix: {
        copy_paste: pixCopyAndPaste,
        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyAndPaste)}`,
        receiver_name: 'Amigo Refrigerista PRO',
        key_email: 'amigorefrigerista@gmail.com',
      },
      provider: settings.payment_provider || 'manual',
    });
  } catch (error: any) {
    console.error('Erro ao processar checkout:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao processar checkout' },
      { status: 500 }
    );
  }
}
