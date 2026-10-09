// lib/reminderUtils.ts

export interface MaintenanceReminder {
  id?: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string; // Ex: 5584999998888 ou (11) 98765-4321
  clientAddress?: string;
  equipment: string;   // Ex: Split Inverter LG 12k BTUs
  serviceDate: Date | string;
  monthsInterval: number; // Ex: 6 ou 3 meses
  reminderDaysBefore?: number; // Ex: 3 dias antes da data de vencimento
  alertDate?: string; // Data em que o lembrete deve ser enviado
  nextServiceDate?: string; // Data exata do vencimento da preventiva
  technicianName?: string;
  companyName?: string;
  notes?: string;
  status?: 'pending' | 'sent' | 'completed';
  createdAt?: string;
}

/**
 * Modelo padrão recomendado para mensagens de WhatsApp
 */
export const DEFAULT_WHATSAPP_TEMPLATE = 
`Olá, {CLIENTE}! Tudo bem? Aqui é {TECNICO}.

Lembramos que a manutenção preventiva programada do seu equipamento ({EQUIPAMENTO}) está prevista para *{DATA_PREVENTIVA}*.

Manter a higienização e revisão técnica em dia garante economia de energia, evita quebras e protege a saúde de todos com ar 100% puro.

Podemos agendar a sua visita preventiva para esta semana?

Você pode consultar sua Ordem de Serviço online aqui:
{LINK_OS}`;

/**
 * Variáveis dinâmicas suportadas no modelo de mensagem
 */
export const TEMPLATE_VARIABLES = [
  { tag: '{CLIENTE}', label: 'Nome do Cliente', example: 'Carlos Silva' },
  { tag: '{DATA_PREVENTIVA}', label: 'Data da Preventiva', example: '15/10/2026' },
  { tag: '{LINK_OS}', label: 'Link da Ordem de Serviço', example: 'https://.../os/OS-2026-0001' },
  { tag: '{EQUIPAMENTO}', label: 'Equipamento', example: 'Split Inverter 12.000 BTU/h' },
  { tag: '{TECNICO}', label: 'Nome do Técnico / Empresa', example: 'Amigo Refrigerista Pro' },
  { tag: '{NUMERO_OS}', label: 'Número da OS', example: 'OS-2026-0001' },
  { tag: '{DIAS_RESTANTES}', label: 'Dias de Antecedência', example: '3' },
];

/**
 * Formata o texto final da mensagem substituindo todas as variáveis dinâmicas
 */
export function formatWhatsAppReminderMessage(
  reminder: MaintenanceReminder,
  template?: string,
  baseUrl?: string
): string {
  const serviceDateObj = typeof reminder.serviceDate === 'string' 
    ? new Date(reminder.serviceDate + 'T12:00:00') 
    : reminder.serviceDate;

  const nextServiceDate = new Date(serviceDateObj);
  nextServiceDate.setMonth(nextServiceDate.getMonth() + (reminder.monthsInterval || 6));
  const formattedNextDate = nextServiceDate.toLocaleDateString('pt-BR');

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://amigorefrigerista.pro');
  const osIdentifier = reminder.orderNumber || reminder.id || 'consulta';
  const osLink = `${origin}/os/${encodeURIComponent(osIdentifier)}`;

  const techName = reminder.companyName || reminder.technicianName || 'Amigo Refrigerista Pro';
  const clientName = reminder.clientName?.trim() || 'Cliente';
  const equipment = reminder.equipment?.trim() || 'Ar-Condicionado';
  const osNumber = reminder.orderNumber || reminder.id || 'S/N';
  const daysBefore = String(reminder.reminderDaysBefore ?? 0);

  let message = template && template.trim().length > 0 ? template : DEFAULT_WHATSAPP_TEMPLATE;

  // Substituição das variáveis dinâmicas (suporta maiúsculas ou minúsculas)
  message = message
    .replace(/\{CLIENTE\}/gi, clientName)
    .replace(/\{DATA_PREVENTIVA\}/gi, formattedNextDate)
    .replace(/\{LINK_OS\}/gi, osLink)
    .replace(/\{EQUIPAMENTO\}/gi, equipment)
    .replace(/\{TECNICO\}/gi, techName)
    .replace(/\{NUMERO_OS\}/gi, osNumber)
    .replace(/\{DIAS_RESTANTES\}/gi, daysBefore);

  return message;
}

/**
 * Calcula a data exata em que o alerta/lembrete deve ser disparado
 * (data de vencimento menos a quantidade de dias de antecedência configurada)
 */
export function calculateReminderAlertDate(targetDueDate: string, daysBefore: number): string {
  const date = new Date(targetDueDate + 'T12:00:00');
  date.setDate(date.getDate() - (daysBefore || 0));
  return date.toISOString().split('T')[0];
}

/**
 * Gera o link direto do WhatsApp com mensagem personalizada para o cliente
 * referente ao lembrete de manutenção preventiva com variáveis dinâmicas.
 */
export function generateWhatsAppReminderLink(
  reminder: MaintenanceReminder,
  customTemplate?: string,
  baseUrl?: string
): string {
  const message = formatWhatsAppReminderMessage(reminder, customTemplate, baseUrl);

  // Sanitiza o número do telefone removendo caracteres especiais
  let cleanPhone = (reminder.clientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Modelo estendido para incluir a automação do lembrete e controle de OS
export interface ServiceOrder {
  id: string;
  orderNumber: string; // Número sequencial automático da OS (ex: OS-2026-0001)
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  equipment: string;
  serviceDate: string; // Data da realização do serviço
  maintenanceIntervalMonths: number; // Ex: 6 meses
  autoScheduleReminder: boolean;
  reminderDaysBefore: number; // Quantos dias antes do vencimento avisar (ex: 3 dias)
  status?: 'Pending' | 'In Progress' | 'Completed';
  customerSignature?: string;
  customerNotes?: string;
  notes?: string;
  createdAt?: string;
}

// Função auxiliar para calcular a próxima data
export function calculateNextMaintenanceDate(startDate: string, months: number): string {
  const date = new Date(startDate + 'T12:00:00');
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

/**
 * Integra o lembrete de manutenção com o serviço de disparo via WhatsApp (/api/whatsapp/send-reminder)
 * e retorna os dados do lembrete agendado/disparado junto com o link wa.me formatado.
 */
export async function dispatchWhatsAppMaintenanceReminder(params: {
  reminder: MaintenanceReminder;
  customTemplate?: string;
  dispatchNow?: boolean;
}): Promise<{
  success: boolean;
  apiDispatched?: boolean;
  status?: string;
  message?: string;
  waLink: string;
  formattedMessage: string;
  alertDate: string;
  nextServiceDate: string;
}> {
  const { reminder, customTemplate, dispatchNow = false } = params;
  const serviceDateStr =
    typeof reminder.serviceDate === 'string'
      ? reminder.serviceDate
      : new Date(reminder.serviceDate).toISOString().split('T')[0];
  const nextServiceDate =
    reminder.nextServiceDate ||
    calculateNextMaintenanceDate(serviceDateStr, reminder.monthsInterval || 6);
  const alertDate =
    reminder.alertDate ||
    calculateReminderAlertDate(nextServiceDate, reminder.reminderDaysBefore ?? 3);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://amigorefrigerista.pro';
  const fallbackWaLink = generateWhatsAppReminderLink(reminder, customTemplate, origin);
  const fallbackMessage = formatWhatsAppReminderMessage(reminder, customTemplate, origin);

  if (typeof window === 'undefined') {
    return {
      success: true,
      apiDispatched: false,
      status: 'scheduled',
      waLink: fallbackWaLink,
      formattedMessage: fallbackMessage,
      alertDate,
      nextServiceDate,
    };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const sessionToken = sessionStorage.getItem('amigo_hmac_session');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const res = await fetch('/api/whatsapp/send-reminder', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...reminder,
        serviceDate: serviceDateStr,
        customTemplate,
        dispatchNow,
        baseUrl: origin,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return {
        success: true,
        apiDispatched: Boolean(data.apiDispatched),
        status: data.status,
        message: data.message,
        waLink: data.waLink || fallbackWaLink,
        formattedMessage: data.formattedMessage || fallbackMessage,
        alertDate: data.alertDate || alertDate,
        nextServiceDate: data.nextServiceDate || nextServiceDate,
      };
    }
  } catch {
    // Fallback silencioso para disparo via link direto wa.me
  }

  return {
    success: true,
    apiDispatched: false,
    status: 'scheduled',
    waLink: fallbackWaLink,
    formattedMessage: fallbackMessage,
    alertDate,
    nextServiceDate,
  };
}

