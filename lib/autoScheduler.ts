// lib/autoScheduler.ts

export interface PreventivePackage {
  title: string;
  price: number;
}

export interface AutoScheduleRequest {
  clientName: string;
  clientPhone: string;
  equipment: string;
  technicianName: string;
  pixKey?: string;
  packages: PreventivePackage[];
  existingOrders?: Array<{ date: string; timeSlot: string }>; // Datas já ocupadas
}

export function generateSmartWhatsAppProposal(data: AutoScheduleRequest): string {
  // 1. Lógica para encontrar a próxima data livre (pula domingo e ajusta formato)
  const today = new Date();
  let suggestedDate = new Date(today);
  suggestedDate.setDate(suggestedDate.getDate() + 3); // Sugere para daqui a 3 dias

  // Se cair no domingo (0), avança para segunda (1)
  if (suggestedDate.getDay() === 0) {
    suggestedDate.setDate(suggestedDate.getDate() + 1);
  }

  const formattedDate = suggestedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // 2. Monta a lista de pacotes configurados pelo técnico
  const packagesToUse = data.packages && data.packages.length > 0 
    ? data.packages 
    : [
        { title: 'Higienização Básica + Spray Antibacteriano', price: 180 },
        { title: 'Higienização Profunda Química + Teste de Rendimento', price: 280 }
      ];

  const packageList = packagesToUse
    .map((p, index) => `  ${index + 1}️⃣ *${p.title}*: R$ ${p.price.toFixed(2).replace('.', ',')}`)
    .join('\n');

  // 3. Monta a mensagem inteligente e humanizada
  const message = `Olá, *${data.clientName}*! Tudo bem?\n\n` +
    `Aqui é o *${data.technicianName}*. Hoje faz 6 meses que instalamos/revisamos o seu *${data.equipment}*.\n\n` +
    `Para manter o ar limpo e economizar energia, está na hora da manutenção preventiva! ❄️\n\n` +
    `📋 *Opções de Manutenção:*\n${packageList}\n\n` +
    `📅 *Sugestão de Horário Livre na minha Agenda:*\n` +
    `👉 *${capitalizedDate} às 09:00h*\n\n` +
    `💳 *Formas de Pagamento:* PIX, Cartão ou Dinheiro.` +
    `${data.pixKey ? `\n(Chave PIX para reserva: \`${data.pixKey}\`)\n\n` : '\n\n'}` +
    `Se esse horário for bom para você, basta me responder *'CONFIRMAR'* escolhendo a opção (1 ou 2)! Caso precise de outro dia, me avise por aqui.`;

  let cleanPhone = data.clientPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
