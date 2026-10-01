import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // 1. Busca credenciais dinâmicas do Painel Master na tabela app_settings
    const settings = await getAppSettings();
    const accessToken = settings.mercadopago_access_token;

    const body = await req.json().catch(() => ({}));
    const resourceId = id || body?.data?.id || body?.id;

    if (!resourceId) {
      return NextResponse.json({ received: true, status: 'no_id' });
    }

    // 2. Se houver Access Token do Mercado Pago, consulta o status da cobrança na API
    if (accessToken && accessToken.startsWith('APP_USR')) {
      try {
        const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken.trim()}`,
          },
        });

        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          const userEmail = paymentData.external_reference || paymentData.payer?.email;
          const status = paymentData.status; // 'approved', 'pending', etc.

          if (status === 'approved' && userEmail && isSupabaseConfigured) {
            // Atualiza usuário para PRO / VIP no Supabase
            await supabase
              .from('user_profiles')
              .update({
                subscription_plan: 'pro',
                subscription_status: 'active',
                is_vip: true,
                updated_at: new Date().toISOString(),
              })
              .eq('email', userEmail);
          }

          return NextResponse.json({
            received: true,
            status: paymentData.status,
            email: userEmail,
          });
        }
      } catch (err) {
        console.error('Erro ao consultar Mercado Pago no Webhook:', err);
      }
    }

    return NextResponse.json({ received: true, id: resourceId });
  } catch (error: any) {
    console.error('Erro no Webhook Mercado Pago:', error);
    return NextResponse.json({ error: error.message || 'Webhook error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook Mercado Pago ativo' });
}
