import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
  safeHttpsRequestPinnedIp,
} from '@/lib/security';
import { getAppSettings } from '@/lib/getAppSettings';
import {
  MaintenanceReminder,
  calculateNextMaintenanceDate,
  calculateReminderAlertDate,
  formatWhatsAppReminderMessage,
  generateWhatsAppReminderLink,
} from '@/lib/reminderUtils';

declare global {
  var _whatsappReminderQueue: Array<{
    id: string;
    orderNumber: string;
    clientName: string;
    clientPhone: string;
    equipment: string;
    serviceDate: string;
    nextServiceDate: string;
    alertDate: string;
    reminderDaysBefore: number;
    monthsInterval: number;
    status: 'scheduled' | 'dispatched' | 'fallback_wa_me';
    waLink: string;
    message: string;
    createdAt: string;
  }> | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`wa_reminder:${clientIp}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limite de disparos atingido. Aguarde um instante.',
        },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    // Autenticação opcional para permitir funcionamento tanto logado quanto em modo local
    await authenticateRequest(req).catch(() => null);

    const body = await req.json().catch(() => ({}));
    const {
      id,
      orderNumber,
      clientName,
      clientPhone,
      clientAddress,
      equipment,
      serviceDate,
      monthsInterval = 6,
      reminderDaysBefore = 3,
      technicianName,
      companyName,
      notes,
      customTemplate,
      dispatchNow = false,
      baseUrl,
    } = body || {};

    if (!clientName || !clientPhone || !equipment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos obrigatórios ausentes: Nome do Cliente, WhatsApp e Equipamento.',
        },
        { status: 400 }
      );
    }

    let cleanPhone = String(clientPhone).replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const validServiceDate =
      typeof serviceDate === 'string' && serviceDate.trim()
        ? serviceDate.trim()
        : new Date().toISOString().split('T')[0];
    const intervalMonths = Number(monthsInterval) > 0 ? Number(monthsInterval) : 6;
    const daysBefore =
      reminderDaysBefore !== undefined && !Number.isNaN(Number(reminderDaysBefore))
        ? Math.max(0, Math.min(365, Number(reminderDaysBefore)))
        : 3;

    const nextServiceDate = calculateNextMaintenanceDate(validServiceDate, intervalMonths);
    const alertDate = calculateReminderAlertDate(nextServiceDate, daysBefore);

    const origin =
      baseUrl ||
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://amigorefrigerista.pro';

    const reminderPayload: MaintenanceReminder = {
      id: id || `rem-${Date.now()}`,
      orderNumber: orderNumber || `OS-${new Date().getFullYear()}-0001`,
      clientName: String(clientName).trim(),
      clientPhone: cleanPhone,
      clientAddress: clientAddress ? String(clientAddress).trim() : '',
      equipment: String(equipment).trim(),
      serviceDate: validServiceDate,
      monthsInterval: intervalMonths,
      reminderDaysBefore: daysBefore,
      alertDate,
      nextServiceDate,
      technicianName: technicianName || 'Técnico Especialista',
      companyName: companyName || 'Amigo Refrigerista Pro',
      notes: notes || '',
      status: dispatchNow ? 'sent' : 'pending',
      createdAt: new Date().toISOString(),
    };

    const formattedMessage = formatWhatsAppReminderMessage(
      reminderPayload,
      customTemplate,
      origin
    );
    const waLink = generateWhatsAppReminderLink(reminderPayload, customTemplate, origin);

    // Verifica se a data de alerta já chegou ou se o usuário solicitou disparo imediato
    const todayStr = new Date().toISOString().split('T')[0];
    const shouldAttemptApiSend = Boolean(dispatchNow || todayStr >= alertDate);

    const appSettings = (global as any)._serverMasterSettings || (await getAppSettings());
    const apiUrl = String(appSettings?.whatsapp_api_url || '').trim().replace(/\/$/, '');
    const apiKey = String(appSettings?.whatsapp_api_key || '').trim();
    const instanceName = String(
      appSettings?.whatsapp_instance_name || 'Instancia_AmigoRefrigerista'
    )
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    let apiDispatched = false;
    let apiStatusMessage = '';

    if (shouldAttemptApiSend && apiUrl && apiUrl.startsWith('https://')) {
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
        text: formattedMessage,
        textMessage: { text: formattedMessage },
      });

      const apiRes = await safeHttpsRequestPinnedIp({
        targetUrl: endpoint,
        method: 'POST',
        headers,
        body: payloadJson,
        timeoutMs: 6000,
      });

      if (apiRes.ok) {
        apiDispatched = true;
        apiStatusMessage = `Disparo automático enviado via API WhatsApp (${instanceName}) para +${cleanPhone}.`;
      } else {
        apiStatusMessage =
          apiRes.blockedReason ||
          `Servidor WhatsApp retornou status ${apiRes.status || 'indisponível'}. Link direto wa.me pronto para envio.`;
      }
    } else if (apiUrl) {
      apiStatusMessage = `Lembrete programado na fila de disparo do WhatsApp para ${new Date(
        alertDate + 'T12:00:00'
      ).toLocaleDateString('pt-BR')} (${daysBefore} dias antes da manutenção).`;
    } else {
      apiStatusMessage = `Lembrete configurado para ${new Date(
        alertDate + 'T12:00:00'
      ).toLocaleDateString('pt-BR')} (${
        daysBefore === 0 ? 'no dia do vencimento' : `${daysBefore} dias antes`
      }) e integrado ao disparo via WhatsApp.`;
    }

    if (!global._whatsappReminderQueue) {
      global._whatsappReminderQueue = [];
    }

    const queueItem = {
      id: reminderPayload.id!,
      orderNumber: reminderPayload.orderNumber!,
      clientName: reminderPayload.clientName,
      clientPhone: cleanPhone,
      equipment: reminderPayload.equipment,
      serviceDate: validServiceDate,
      nextServiceDate,
      alertDate,
      reminderDaysBefore: daysBefore,
      monthsInterval: intervalMonths,
      status: (apiDispatched
        ? 'dispatched'
        : shouldAttemptApiSend
        ? 'fallback_wa_me'
        : 'scheduled') as 'scheduled' | 'dispatched' | 'fallback_wa_me',
      waLink,
      message: formattedMessage,
      createdAt: new Date().toISOString(),
    };

    global._whatsappReminderQueue = [
      queueItem,
      ...global._whatsappReminderQueue.filter((item) => item.id !== queueItem.id),
    ].slice(0, 100);

    return NextResponse.json({
      success: true,
      apiDispatched,
      status: queueItem.status,
      message: apiStatusMessage,
      reminder: {
        ...reminderPayload,
        status: apiDispatched ? 'sent' : reminderPayload.status,
      },
      waLink,
      formattedMessage,
      alertDate,
      nextServiceDate,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro ao processar agendamento/disparo de lembrete via WhatsApp.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    queue: global._whatsappReminderQueue || [],
  });
}
