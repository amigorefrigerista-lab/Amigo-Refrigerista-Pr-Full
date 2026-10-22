import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/getAppSettings';
import { getSupabaseServiceClient, checkRateLimitAsync, getClientIp } from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { installations, whatsappConfirmations } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';

function safeCompareToken(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a.trim());
    const bufB = Buffer.from(b.trim());
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = await getAppSettings();
  const expectedVerifyToken = (
    process.env.WHATSAPP_VERIFY_TOKEN ||
    settings.webhook_secret ||
    settings.whatsapp_api_key ||
    ''
  ).trim();

  // FAIL-CLOSED: Sem token de verificação configurado no servidor, recusa subscrição
  if (!expectedVerifyToken) {
    return NextResponse.json(
      {
        error:
          'Webhook WhatsApp bloqueado (fail-closed): WHATSAPP_VERIFY_TOKEN não configurado no servidor.',
      },
      { status: 503 }
    );
  }

  if (mode === 'subscribe' && challenge) {
    if (!token || !safeCompareToken(token, expectedVerifyToken)) {
      return NextResponse.json(
        { error: 'Token de verificação do Webhook WhatsApp inválido (hub.verify_token).' },
        { status: 403 }
      );
    }
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'online',
    service: 'Amigo Refrigerista Pro - WhatsApp Webhook Ingest (Fail-Closed)',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`wa_webhook:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const settings = await getAppSettings();
    const webhookSecret = (
      process.env.WHATSAPP_WEBHOOK_SECRET ||
      settings.webhook_secret ||
      settings.whatsapp_api_key ||
      ''
    ).trim();

    // FAIL-CLOSED: Sem segredo configurado no servidor, recusa qualquer requisição POST
    if (!webhookSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Webhook WhatsApp bloqueado (fail-closed): segredo de webhook não configurado no servidor.',
        },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    const headerToken =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('apikey') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';
    const hubSig256 = req.headers.get('x-hub-signature-256') || '';

    let verified = false;
    if (headerToken && safeCompareToken(headerToken, webhookSecret)) {
      verified = true;
    } else if (hubSig256.startsWith('sha256=')) {
      const expectedHmac =
        'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      verified = safeCompareToken(hubSig256, expectedHmac);
    }

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Assinatura ou credencial de origem do webhook inválida.' },
        { status: 401 }
      );
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};

    let senderPhone = '';
    let messageText = '';

    // Extração estrita sem assumir telefone ou mensagem padrão
    if (payload?.data?.key?.remoteJid) {
      senderPhone = String(payload.data.key.remoteJid).replace('@s.whatsapp.net', '').trim();
      messageText = String(
        payload?.data?.message?.conversation ||
          payload?.data?.message?.extendedTextMessage?.text ||
          ''
      ).trim();
    } else if (payload?.phone) {
      senderPhone = String(payload.phone).trim();
      messageText = String(payload.message || payload.text || '').trim();
    } else if (payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msgObj = payload.entry[0].changes[0].value.messages[0];
      senderPhone = String(msgObj.from || '').trim();
      messageText = String(msgObj.text?.body || '').trim();
    } else {
      senderPhone = String(payload?.sender || payload?.from || '').trim();
      messageText = String(payload?.text || payload?.message || '').trim();
    }

    if (!senderPhone || !messageText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payload incompleto: remetente (phone/from) e texto da mensagem são obrigatórios.',
        },
        { status: 400 }
      );
    }

    const cleanMsg = messageText.toUpperCase();
    let confirmationType: 'CONFIRMADO' | 'CANCELADO' | 'REMARCADO' | 'OUTROS' = 'OUTROS';

    if (
      cleanMsg.includes('SIM') ||
      cleanMsg.includes('CONFIRMAR') ||
      cleanMsg.includes('CONFIRMO') ||
      cleanMsg === '1'
    ) {
      confirmationType = 'CONFIRMADO';
    } else if (
      cleanMsg.includes('NÃO') ||
      cleanMsg.includes('NAO') ||
      cleanMsg.includes('CANCELAR') ||
      cleanMsg === '2'
    ) {
      confirmationType = 'CANCELADO';
    } else if (cleanMsg.includes('REMARCAR') || cleanMsg.includes('ADIAR') || cleanMsg === '3') {
      confirmationType = 'REMARCADO';
    }

    const senderDigits = senderPhone.replace(/\D/g, '');
    const last8Digits = senderDigits.slice(-8);
    let matchedInstallationId: number | null = null;
    let persistedInDb = false;

    // 1. Persiste a confirmação no PostgreSQL (Drizzle) e atualiza a Ordem de Serviço correspondente
    if (isSqlAvailable()) {
      try {
        if (last8Digits.length >= 8) {
          const allInstallations = await db
            .select()
            .from(installations)
            .orderBy(desc(installations.createdAt))
            .limit(200);

          const matched = allInstallations.find((inst) => {
            const instDigits = (inst.clientPhone || '').replace(/\D/g, '');
            return instDigits.length >= 8 && instDigits.endsWith(last8Digits);
          });

          if (matched) {
            matchedInstallationId = matched.id;
            const newStatus =
              confirmationType === 'CANCELADO'
                ? 'cancelado'
                : confirmationType === 'CONFIRMADO'
                ? 'em_andamento'
                : matched.status;

            const stamp = `[WhatsApp ${new Date().toLocaleString('pt-BR')}]: Cliente respondeu "${messageText.slice(0, 120)}" (${confirmationType})`;
            const updatedNotes = matched.notes ? `${matched.notes}\n${stamp}` : stamp;

            await db
              .update(installations)
              .set({
                status: newStatus,
                notes: updatedNotes,
              })
              .where(eq(installations.id, matched.id));
          }
        }

        await db.insert(whatsappConfirmations).values({
          senderPhone: senderDigits || senderPhone,
          messageText: messageText.slice(0, 500),
          confirmationStatus: confirmationType,
          installationId: matchedInstallationId,
        });
        persistedInDb = true;
      } catch (dbErr) {
        console.error('Erro ao persistir confirmação WhatsApp no PostgreSQL:', dbErr);
      }
    }

    // 2. Persiste também no Supabase (work_orders e whatsapp_confirmations) se configurado
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      try {
        let matchedWorkOrderId: string | null = null;
        if (last8Digits.length >= 8) {
          const { data: orders } = await serviceSb
            .from('work_orders')
            .select('id, cliente_telefone, status, observacoes')
            .order('created_at', { ascending: false })
            .limit(100);

          if (orders && orders.length > 0) {
            const matchOrder = orders.find((o: any) => {
              const d = String(o.cliente_telefone || '').replace(/\D/g, '');
              return d.length >= 8 && d.endsWith(last8Digits);
            });

            if (matchOrder) {
              matchedWorkOrderId = matchOrder.id;
              const nextStatus =
                confirmationType === 'CANCELADO'
                  ? 'cancelado'
                  : confirmationType === 'CONFIRMADO'
                  ? 'aprovado'
                  : matchOrder.status;
              const stamp = `[WhatsApp ${new Date().toISOString()}]: ${confirmationType} - "${messageText.slice(0, 120)}"`;
              await serviceSb
                .from('work_orders')
                .update({
                  status: nextStatus,
                  observacoes: matchOrder.observacoes
                    ? `${matchOrder.observacoes}\n${stamp}`
                    : stamp,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', matchOrder.id);
            }
          }
        }

        await serviceSb.from('whatsapp_confirmations').insert({
          sender_phone: senderDigits || senderPhone,
          message_text: messageText.slice(0, 500),
          confirmation_status: confirmationType,
          work_order_id: matchedWorkOrderId,
          processed_at: new Date().toISOString(),
        });
        persistedInDb = true;
      } catch (sbErr) {
        console.error('Erro ao persistir confirmação WhatsApp no Supabase:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      persisted: persistedInDb,
      matched_installation_id: matchedInstallationId,
      sender: senderPhone,
      text_received: messageText,
      confirmation_status: confirmationType,
      processed_at: new Date().toISOString(),
      message: `Webhook processado e persistido com sucesso! Resposta do cliente (${confirmationType}) gravada.`,
    });
  } catch (error) {
    console.error('Erro ao processar Webhook do WhatsApp:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno no processamento do webhook.',
      },
      { status: 500 }
    );
  }
}
