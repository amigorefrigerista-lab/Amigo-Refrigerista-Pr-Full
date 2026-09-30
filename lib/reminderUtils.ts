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
  notes?: string;
  createdAt?: string;
}

// Função auxiliar para calcular a próxima data
export function calculateNextMaintenanceDate(startDate: string, months: number): string {
  const date = new Date(startDate + 'T12:00:00');
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}
