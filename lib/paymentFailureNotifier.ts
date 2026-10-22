import { getAppSettings } from '@/lib/getAppSettings';
import { getSupabaseServiceClient, safeHttpsRequestPinnedIp } from '@/lib/security';
import { db, isSqlAvailable } from '@/src/db';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export interface PaymentFailureNotificationParams {
  targetUid?: string | null;
  targetEmail?: string | null;
  targetPhone?: string | null;
  technicianName?: string | null;
  plan?: 'flex' | 'pro' | string;
  amount?: number;
  failureReason?: string;
  provider?: 'mercadopago' | 'stripe' | 'manual';
  subscriptionId?: string | null;
  paymentId?: string | null;
  updatePaymentUrl?: string | null;
}

export interface PaymentFailureNotificationResult {
  success: boolean;
  notified: boolean;
  phone: string | null;
  technicianName: string;
  message: string;
  waLink: string;
  providerDispatched: boolean;
  statusMessage: string;
  error?: string;
}

declare global {
  var _paymentFailureNotificationLogs:
    | Array<{
        id: string;
        targetUid: string | null;
        targetEmail: string | null;
        phone: string | null;
        technicianName: string;
        plan: string;
        amount: number;
        reason: string;
        provider: string;
        dispatched: boolean;
        timestamp: string;
        message: string;
        waLink: string;
      }>
    | undefined;
}

function getNotificationLogsStore() {
  if (!global._paymentFailureNotificationLogs) {
    global._paymentFailureNotificationLogs = [];
  }
  return global._paymentFailureNotificationLogs;
}

/**
 * Traduz códigos de erro de gateway para explicações em português amigáveis ao técnico.
 */
function translateFailureReason(reason?: string): string {
  if (!reason) return 'Não foi possível debitar no cartão de crédito cadastrado';
  const clean = reason.toLowerCase().trim();

  if (clean.includes('insufficient_amount') || clean.includes('insufficient_funds')) {
    return 'Saldo ou limite insuficiente no cartão';
  }
  if (clean.includes('bad_filled_date') || clean.includes('expired_card')) {
    return 'Data de validade do cartão expirada ou incorreta';
  }
  if (clean.includes('bad_filled_security_code')) {
    return 'Código de segurança (CVV) inválido';
  }
  if (clean.includes('call_for_authorize')) {
    return 'Necessário autorizar a transação junto ao aplicativo do seu banco/cartão';
  }
  if (clean.includes('card_declined') || clean.includes('generic_decline')) {
    return 'Transação não autorizada pela operadora do cartão';
  }
  if (clean.includes('lost_card') || clean.includes('stolen_card')) {
    return 'Cartão bloqueado ou informado como indisponível';
  }
  if (clean.includes('paused') || clean.includes('past_due')) {
    return 'Cobrança recorrente não concluída após tentativas automáticas';
  }

  return reason;
}

/**
 * Normaliza número de telefone brasileiro para formato internacional E.164 (ex: 5511999998888).
 */
export function normalizeBrazilPhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // Se já tiver DDI 55 e tamanho entre 12 e 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se tiver DDD + número (10 ou 11 dígitos), adiciona DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }

  // Fallback se tiver pelo menos 8 dígitos
  if (digits.length >= 8 && digits.length <= 15) {
    return digits.startsWith('55') ? digits : '55' + digits;
  }

  return null;
}

/**
 * Dispara automaticamente notificação via WhatsApp para o técnico quando uma cobrança recorrente falhar.
 */
export async function notifyTechnicianPaymentFailed(
  params: PaymentFailureNotificationParams
): Promise<PaymentFailureNotificationResult> {
  const {
    targetUid,
    targetEmail,
    plan = 'pro',
    amount = 39.9,
    failureReason = 'Falha no débito do cartão de crédito',
    provider = 'mercadopago',
    subscriptionId,
    paymentId,
    updatePaymentUrl,
  } = params;

  let phone = params.targetPhone ? normalizeBrazilPhone(params.targetPhone) : null;
  let name = params.technicianName?.trim() || '';

  // 1. Se o telefone ou nome não foram fornecidos diretamente, busca nos perfis
  const serviceSb = getSupabaseServiceClient();

  if ((!phone || !name) && (targetUid || targetEmail)) {
    if (serviceSb) {
      try {
        let query = serviceSb.from('profiles').select('*');
        if (targetUid) {
          query = query.eq('id', targetUid);
        } else if (targetEmail) {
          query = query.eq('email', targetEmail.toLowerCase().trim());
        }

        const { data: profile } = await query.maybeSingle();
        if (profile) {
          if (!name) {
            name =
              profile.nome ||
              profile.name ||
              (profile.email ? profile.email.split('@')[0] : '');
          }
          if (!phone) {
            const rawPhone =
              profile.telefone || profile.whatsapp || profile.phone || '';
            phone = normalizeBrazilPhone(rawPhone);
          }
        }
      } catch {
        // ignora erros de leitura do supabase
      }
    }

    if ((!phone || !name) && isSqlAvailable() && (targetUid || targetEmail)) {
      try {
        let dbUser: any = null;
        if (targetUid) {
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.uid, targetUid))
            .limit(1);
          dbUser = rows[0];
        } else if (targetEmail) {
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.email, targetEmail.toLowerCase().trim()))
            .limit(1);
          dbUser = rows[0];
        }

        if (dbUser) {
          if (!name && dbUser.name) name = dbUser.name;
          if (!phone && (dbUser as any).phone) {
            phone = normalizeBrazilPhone((dbUser as any).phone);
          }
        }
      } catch {
        // ignora erros sql
      }
    }
  }

  const finalName = name || 'Técnico Refrigerista';
  const planLabel =
    plan === 'flex' ? 'Plano Flex VIP' : 'Plano Amigo Refrigerista PRO';
  const friendlyReason = translateFailureReason(failureReason);
  const formattedAmount = Number(amount) > 0 ? `R$ ${Number(amount).toFixed(2).replace('.', ',')}` : 'R$ 39,90';

  const baseUrl =
    updatePaymentUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://amigorefrigerista.pro';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const directUpdateLink = `${cleanBaseUrl}/?tab=settings&action=update_payment`;

  // Mensagem padronizada, profissional e clara solicitando a atualização do método de pagamento
  const message = [
    `⚠️ *Atenção, ${finalName}! Notificação de Pagamento - Amigo Refrigerista PRO*`,
    ``,
    `Identificamos que a cobrança recorrente da sua assinatura do *${planLabel}* (${formattedAmount}) não pôde ser concluída pela operadora do seu cartão.`,
    ``,
    `📌 *Motivo informado:* ${friendlyReason}`,
    ``,
    `Para evitar a interrupção do seu acesso aos recursos PRO (IA Diagnóstico ilimitada, PMOC, Laudos em PDF e Leitor OCR de Placas), por favor atualize o seu método de pagamento pelo link seguro:`,
    ``,
    `🔗 *Atualizar Forma de Pagamento:*`,
    `${directUpdateLink}`,
    ``,
    `✅ A confirmação é processada na hora e seu acesso é restabelecido sem nenhuma perda de dados.`,
    `Caso já tenha regularizado ou tenha alguma dúvida, responda diretamente a esta mensagem!`,
  ].join('\n');

  const waLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  // 2. Disparo via Evolution API / Z-API / WhatsApp Gateway se configurado no sistema
  let providerDispatched = false;
  let statusMessage = '';

  const settings = await getAppSettings();
  const apiUrl = String(
    process.env.WHATSAPP_API_URL || settings?.whatsapp_api_url || ''
  )
    .trim()
    .replace(/\/$/, '');
  const apiKey = String(
    process.env.WHATSAPP_API_KEY || settings?.whatsapp_api_key || ''
  ).trim();
  const instanceName = String(
    process.env.WHATSAPP_INSTANCE_NAME ||
      settings?.whatsapp_instance_name ||
      'Instancia_AmigoRefrigerista'
  ).trim();

  if (phone && apiUrl && apiUrl.startsWith('https://')) {
    try {
      const endpoint = `${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['apikey'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const body = JSON.stringify({
        number: phone,
        text: message,
        textMessage: { text: message },
      });

      const res = await safeHttpsRequestPinnedIp({
        targetUrl: endpoint,
        method: 'POST',
        headers,
        body,
        timeoutMs: 6000,
      });

      if (res.ok) {
        providerDispatched = true;
        statusMessage = `Notificação enviada com sucesso via WhatsApp API para +${phone}.`;
      } else {
        statusMessage = `Falha na API externa do WhatsApp (${res.status || 'indisponível'}). Link wa.me pronto para envio manual.`;
      }
    } catch (sendErr: any) {
      statusMessage = `Erro ao conectar com API WhatsApp: ${sendErr?.message || 'timeout'}. Link wa.me pronto para envio.`;
    }
  } else if (!phone) {
    statusMessage = 'Técnico não possui telefone/WhatsApp cadastrado no perfil.';
  } else {
    statusMessage = 'WhatsApp API não configurada em Configurações Master. Link wa.me gerado com sucesso.';
  }

  // 3. Registra no log de auditoria
  const logItem = {
    id: `pay-fail-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetUid: targetUid || null,
    targetEmail: targetEmail || null,
    phone,
    technicianName: finalName,
    plan: String(plan),
    amount: Number(amount) || 0,
    reason: friendlyReason,
    provider,
    dispatched: providerDispatched,
    timestamp: new Date().toISOString(),
    message,
    waLink,
  };

  const store = getNotificationLogsStore();
  store.unshift(logItem);
  if (store.length > 50) store.pop();

  return {
    success: true,
    notified: providerDispatched || Boolean(phone),
    phone,
    technicianName: finalName,
    message,
    waLink,
    providerDispatched,
    statusMessage,
  };
}

/**
 * Retorna o histórico de notificações de falha de pagamento para o painel admin.
 */
export function getPaymentFailureLogs() {
  return getNotificationLogsStore();
}
