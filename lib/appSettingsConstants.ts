export interface WhatsAppRenewalSequenceStep {
  id: string;
  title: string;
  triggerType: 'before_due' | 'on_due' | 'after_due';
  daysOffset: number;
  enabled: boolean;
  template: string;
}

export const DEFAULT_WHATSAPP_RENEWAL_SEQUENCE: WhatsAppRenewalSequenceStep[] = [
  {
    id: 'wa-step-1-preventive',
    title: '1ª Etapa: Lembrete Preventivo',
    triggerType: 'before_due',
    daysOffset: 5,
    enabled: true,
    template:
      'Olá *{nome}*! ❄️🔧\n\nPassando para lembrar que sua assinatura do *{plano}* no *Amigo Refrigerista Pro* vence em *{dias_restantes} dias* ({data_vencimento}).\n\n💰 Valor de renovação: *{valor}*\n🔗 Renove com 1 clique no PIX ou Cartão: {link_renovacao}\n\nContinue emitindo suas Ordens de Serviço e laudos PMOC sem limites!',
  },
  {
    id: 'wa-step-2-eve',
    title: '2ª Etapa: Aviso de Véspera',
    triggerType: 'before_due',
    daysOffset: 1,
    enabled: true,
    template:
      '⚠️ *Atenção, {nome}!*\n\nSua assinatura do *{plano}* vence *amanhã ({data_vencimento})*.\n\nPara não pausar suas emissões de OS, QR Code PMOC e Diagnóstico por IA em campo, garanta sua renovação agora mesmo por *{valor}*:\n👉 {link_renovacao}',
  },
  {
    id: 'wa-step-3-dueday',
    title: '3ª Etapa: Dia do Vencimento',
    triggerType: 'on_due',
    daysOffset: 0,
    enabled: true,
    template:
      '🔔 *Hoje é o dia da renovação do seu {plano}, {nome}!*\n\nSeu ciclo atual encerra hoje ({data_vencimento}). Mantenha todas as ferramentas VIP ativas na sua conta por *{valor}* acessando o link abaixo:\n🚀 {link_renovacao}',
  },
  {
    id: 'wa-step-4-recovery',
    title: '4ª Etapa: Recuperação Pós-Vencimento',
    triggerType: 'after_due',
    daysOffset: 3,
    enabled: true,
    template:
      'Olá *{nome}*, sentimos sua falta no *Amigo Refrigerista Pro*! ❄️\n\nNotamos que sua assinatura do *{plano}* venceu em {data_vencimento}. Seus clientes, histórico de OS e equipamentos seguem salvos na sua conta.\n\nReative seu acesso completo agora por *{valor}*:\n🔓 {link_renovacao}',
  },
];
