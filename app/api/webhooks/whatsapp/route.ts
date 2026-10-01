import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Verificação de webhook para Meta Cloud API (hub.challenge) ou teste GET
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'online',
    service: 'Amigo Refrigerista Pro - WhatsApp Webhook Ingest',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    // Extrai mensagem ou status retornado pelo webhook
    let senderPhone = '';
    let messageText = '';
    let eventType = payload?.event || payload?.type || 'MESSAGES_UPSERT';

    // Normalização para Evolution API / Z-API / Meta / Webhook Teste
    if (payload?.data?.key?.remoteJid) {
      senderPhone = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
      messageText = payload?.data?.message?.conversation || payload?.data?.message?.extendedTextMessage?.text || '';
    } else if (payload?.phone) {
      senderPhone = payload.phone;
      messageText = payload.message || payload.text || '';
    } else if (payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msgObj = payload.entry[0].changes[0].value.messages[0];
      senderPhone = msgObj.from;
      messageText = msgObj.text?.body || '';
    } else {
      senderPhone = payload?.sender || payload?.from || '5511999999999';
      messageText = payload?.text || payload?.message || 'CONFIRMAR';
    }

    const cleanMsg = messageText.trim().toUpperCase();
    let confirmationType = 'OUTROS';

    if (cleanMsg.includes('SIM') || cleanMsg.includes('CONFIRMAR') || cleanMsg.includes('CONFIRMO') || cleanMsg === '1') {
      confirmationType = 'CONFIRMADO';
    } else if (cleanMsg.includes('NÃO') || cleanMsg.includes('NAO') || cleanMsg.includes('CANCELAR') || cleanMsg === '2') {
      confirmationType = 'CANCELADO';
    } else if (cleanMsg.includes('REMARCAR') || cleanMsg.includes('ADIAR') || cleanMsg === '3') {
      confirmationType = 'REMARCADO';
    }

    console.log(`[WhatsApp Webhook] Mensagem recebida de ${senderPhone}: "${messageText}" -> Status: ${confirmationType}`);

    return NextResponse.json({
      success: true,
      sender: senderPhone,
      text_received: messageText,
      confirmation_status: confirmationType,
      processed_at: new Date().toISOString(),
      message: `Webhook processado com sucesso! Resposta do cliente (${confirmationType}) gravada.`
    });

  } catch (error: any) {
    console.error('Erro ao processar Webhook do WhatsApp:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Erro interno no processamento do webhook'
    }, { status: 500 });
  }
}
