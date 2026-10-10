import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
  getSupabaseServiceClient,
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

export interface ScheduledWhatsAppNotification {
  id: string;
  userUid: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  equipment: string;
  serviceDate: string;
  nextServiceDate: string;
  alertDate: string;
  reminderDaysBefore: number;
  monthsInterval: number;
  status: 'scheduled' | 'dispatched' | 'fallback_wa_me';
  waLink: string;
  message: string;
  supabaseSynced?: boolean;
  whatsappProviderConfigured?: boolean;
  createdAt: string;
}

declare global {
  var _whatsappReminderQueue: ScheduledWhatsAppNotification[] | undefined;
}

function resolveWhatsAppCredentials(appSettings?: any) {
  const apiUrl = String(
    process.env.WHATSAPP_API_URL || appSettings?.whatsapp_api_url || ''
  )
    .trim()
    .replace(/\/$/, '');

  const apiKey = String(
    process.env.WHATSAPP_API_KEY || appSettings?.whatsapp_api_key || ''
  ).trim();

  const instanceName = String(
    process.env.WHATSAPP_INSTANCE_NAME ||
      appSettings?.whatsapp_instance_name ||
      'Instancia_AmigoRefrigerista'
  )
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

  return { apiUrl, apiKey, instanceName };
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

    const auth = await authenticateRequest(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const {
      id,
      userUid,
      orderNumber,
      clientName,
      clientPhone,
      clientAddress,
      equipment,
      serviceDate,
      monthsInterval = 6,
      reminderDaysBefore = 3,
      alertDate: explicitAlertDate,
      nextServiceDate: explicitNextServiceDate,
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

    const nextServiceDate =
      typeof explicitNextServiceDate === 'string' && explicitNextServiceDate.trim()
        ? explicitNextServiceDate.trim()
        : calculateNextMaintenanceDate(validServiceDate, intervalMonths);

    const alertDate =
      typeof explicitAlertDate === 'string' && explicitAlertDate.trim()
        ? explicitAlertDate.trim()
        : calculateReminderAlertDate(nextServiceDate, daysBefore);

    const effectiveUserUid = auth?.uid || userUid || 'public';

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

    // 1. Verifica se o disparo deve ocorrer agora (data de alerta atingida ou disparo imediato)
    const todayStr = new Date().toISOString().split('T')[0];
    const shouldAttemptApiSend = Boolean(dispatchNow || todayStr >= alertDate);

    // 2. Obtém credenciais WHATSAPP_API_URL e WHATSAPP_API_KEY do ambiente (process.env) ou app_settings
    const appSettings = (global as any)._serverMasterSettings || (await getAppSettings());
    const { apiUrl, apiKey, instanceName } = resolveWhatsAppCredentials(appSettings);
    const whatsappProviderConfigured = Boolean(apiUrl && apiKey);

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
        apiStatusMessage = `Notificação disparada via WHATSAPP_API_URL (${instanceName}) para +${cleanPhone}.`;
      } else {
        apiStatusMessage =
          apiRes.blockedReason ||
          `Servidor WhatsApp respondeu com status ${apiRes.status || 'indisponível'}. Notificação agendada com link direto wa.me.`;
      }
    } else if (apiUrl) {
      apiStatusMessage = `Notificação agendada no Supabase (alertDate: ${new Date(
        alertDate + 'T12:00:00'
      ).toLocaleDateString('pt-BR')}) para disparo automático via WHATSAPP_API_URL.`;
    } else {
      apiStatusMessage = `Notificação agendada no Supabase para ${new Date(
        alertDate + 'T12:00:00'
      ).toLocaleDateString('pt-BR')} (${
        daysBefore === 0 ? 'no dia do vencimento' : `${daysBefore} dias antes`
      }) para futuro disparo via WhatsApp.`;
    }

    // 3. Persiste o agendamento da notificação no Supabase usando o campo `alertDate` / `alert_date`
    let supabaseSynced = false;
    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      try {
        const { error: sbErr } = await serviceSb.from('maintenance_reminders').upsert({
          id: reminderPayload.id,
          user_id: effectiveUserUid,
          order_number: reminderPayload.orderNumber,
          client_name: reminderPayload.clientName,
          client_phone: cleanPhone,
          client_address: reminderPayload.clientAddress || null,
          equipment: reminderPayload.equipment,
          service_date: validServiceDate,
          next_service_date: nextServiceDate,
          alert_date: alertDate,
          months_interval: intervalMonths,
          reminder_days_before: daysBefore,
          message: formattedMessage,
          wa_link: waLink,
          status: apiDispatched ? 'dispatched' : 'scheduled',
          notes: reminderPayload.notes || null,
          updated_at: new Date().toISOString(),
        });
        if (!sbErr) {
          supabaseSynced = true;
        }
      } catch {
        // Fallback silencioso caso a tabela remota ainda não exista
      }
    }

    if (!global._whatsappReminderQueue) {
      global._whatsappReminderQueue = [];
    }

    const queueItem: ScheduledWhatsAppNotification = {
      id: reminderPayload.id!,
      userUid: effectiveUserUid,
      orderNumber: reminderPayload.orderNumber!,
      clientName: reminderPayload.clientName,
      clientPhone: cleanPhone,
      clientAddress: reminderPayload.clientAddress,
      equipment: reminderPayload.equipment,
      serviceDate: validServiceDate,
      nextServiceDate,
      alertDate,
      reminderDaysBefore: daysBefore,
      monthsInterval: intervalMonths,
      status: apiDispatched
        ? 'dispatched'
        : shouldAttemptApiSend
        ? 'fallback_wa_me'
        : 'scheduled',
      waLink,
      message: formattedMessage,
      supabaseSynced,
      whatsappProviderConfigured,
      createdAt: new Date().toISOString(),
    };

    global._whatsappReminderQueue = [
      queueItem,
      ...global._whatsappReminderQueue.filter(
        (item) => item.id !== queueItem.id && item.orderNumber !== queueItem.orderNumber
      ),
    ].slice(0, 200);

    return NextResponse.json({
      success: true,
      apiDispatched,
      supabaseSynced,
      whatsappProviderConfigured,
      status: queueItem.status,
      message: apiStatusMessage,
      reminder: {
        ...reminderPayload,
        alertDate,
        nextServiceDate,
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const runDue = url.searchParams.get('dispatchDue') === 'true';
  const todayStr = new Date().toISOString().split('T')[0];

  const queue = global._whatsappReminderQueue || [];

  if (runDue) {
    const appSettings = (global as any)._serverMasterSettings || (await getAppSettings());
    const { apiUrl, apiKey, instanceName } = resolveWhatsAppCredentials(appSettings);

    if (apiUrl && apiUrl.startsWith('https://')) {
      for (const item of queue) {
        if (item.status === 'scheduled' && todayStr >= item.alertDate) {
          const endpoint = `${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) {
            headers['apikey'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          const res = await safeHttpsRequestPinnedIp({
            targetUrl: endpoint,
            method: 'POST',
            headers,
            body: JSON.stringify({
              number: item.clientPhone,
              text: item.message,
              textMessage: { text: item.message },
            }),
            timeoutMs: 6000,
          });
          if (res.ok) {
            item.status = 'dispatched';
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    whatsappConfigured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY),
    queue,
  });
}
