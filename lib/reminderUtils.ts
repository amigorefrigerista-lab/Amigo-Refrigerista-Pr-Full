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
  notes?: string;
  status?: 'pending' | 'sent' | 'completed';
  createdAt?: string;
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
 * referente ao lembrete de manutenção preventiva com antecedência configurável.
 */
export function generateWhatsAppReminderLink(reminder: MaintenanceReminder): string {
  const serviceDateObj = typeof reminder.serviceDate === 'string' 
    ? new Date(reminder.serviceDate + 'T12:00:00') 
    : reminder.serviceDate;

  const nextServiceDate = new Date(serviceDateObj);
  nextServiceDate.setMonth(nextServiceDate.getMonth() + reminder.monthsInterval);
  const formattedNextDate = nextServiceDate.toLocaleDateString('pt-BR');

  const techName = reminder.technicianName || 'técnico do Amigo Refrigerista';
  const osText = reminder.orderNumber ? ` (Ref. OS #${reminder.orderNumber})` : '';

  const daysBefore = reminder.reminderDaysBefore ?? 0;
  const timingText = daysBefore > 0 
    ? `A manutenção preventiva programada do seu equipamento vence em *${formattedNextDate}* (daqui a ${daysBefore} dias).`
    : `Hoje faz exatamente ${reminder.monthsInterval} meses que realizamos o serviço no seu equipamento (${reminder.equipment}).`;

  const message = `Olá, ${reminder.clientName}! Tudo bem? Aqui é o ${techName}${osText}. ${timingText} Para manter a eficiência, economia de energia e a qualidade do ar, podemos já deixar agendada a sua visita preventiva para esta semana?`;

  // Sanitiza o número do telefone removendo caracteres especiais
  let cleanPhone = reminder.clientPhone.replace(/\D/g, '');
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
