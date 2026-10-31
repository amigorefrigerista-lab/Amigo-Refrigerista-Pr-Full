export type WhatsAppStepDispatchMode = 'immediate' | 'scheduled';

export interface WhatsAppRenewalSequenceStep {
  id: string;
  title: string;
  triggerType: 'before_due' | 'on_due' | 'after_due';
  daysOffset: number;
  enabled: boolean;
  dispatchMode: WhatsAppStepDispatchMode;
  template: string;
}

export const DEFAULT_WHATSAPP_RENEWAL_SEQUENCE: WhatsAppRenewalSequenceStep[] = [
  {
    id: 'wa-step-1-preventive',
    title: '1ª Etapa: Lembrete Preventivo',
    triggerType: 'before_due',
    daysOffset: 5,
    enabled: true,
    dispatchMode: 'scheduled',
    template:
      'Olá *{nome}*! ❄️🔧\n\nPassando para lembrar que sua assinatura do *{plano}* no *Amigo Refrigerista Pro* vence em *{dias_restantes} dias* ({data_vencimento}).\n\n💰 Valor de renovação: *{valor}*\n🔗 Renove com 1 clique no PIX ou Cartão: {link_renovacao}\n\nContinue emitindo suas Ordens de Serviço e laudos PMOC sem limites!',
  },
  {
    id: 'wa-step-2-eve',
    title: '2ª Etapa: Aviso de Véspera',
    triggerType: 'before_due',
    daysOffset: 1,
    enabled: true,
    dispatchMode: 'scheduled',
    template:
      '⚠️ *Atenção, {nome}!*\n\nSua assinatura do *{plano}* vence *amanhã ({data_vencimento})*.\n\nPara não pausar suas emissões de OS, QR Code PMOC e Diagnóstico por IA em campo, garanta sua renovação agora mesmo por *{valor}*:\n👉 {link_renovacao}',
  },
  {
    id: 'wa-step-3-dueday',
    title: '3ª Etapa: Dia do Vencimento',
    triggerType: 'on_due',
    daysOffset: 0,
    enabled: true,
    dispatchMode: 'immediate',
    template:
      '🔔 *Hoje é o dia da renovação do seu {plano}, {nome}!*\n\nSeu ciclo atual encerra hoje ({data_vencimento}). Mantenha todas as ferramentas VIP ativas na sua conta por *{valor}* acessando o link abaixo:\n🚀 {link_renovacao}',
  },
  {
    id: 'wa-step-4-recovery',
    title: '4ª Etapa: Recuperação Pós-Vencimento',
    triggerType: 'after_due',
    daysOffset: 3,
    enabled: true,
    dispatchMode: 'immediate',
    template:
      'Olá *{nome}*, sentimos sua falta no *Amigo Refrigerista Pro*! ❄️\n\nNotamos que sua assinatura do *{plano}* venceu em {data_vencimento}. Seus clientes, histórico de OS e equipamentos seguem salvos na sua conta.\n\nReative seu acesso completo agora por *{valor}*:\n🔓 {link_renovacao}',
  },
];

export function normalizeWhatsAppRenewalSequence(
  rawSequence: unknown
): WhatsAppRenewalSequenceStep[] {
  let parsedSequence: unknown = rawSequence;
  if (typeof rawSequence === 'string' && rawSequence.trim()) {
    try {
      parsedSequence = JSON.parse(rawSequence);
    } catch {
      parsedSequence = null;
    }
  }

  const source =
    Array.isArray(parsedSequence) && parsedSequence.length > 0
      ? parsedSequence
      : DEFAULT_WHATSAPP_RENEWAL_SEQUENCE;

  return source.map((item: any, idx: number) => {
    const fallback =
      DEFAULT_WHATSAPP_RENEWAL_SEQUENCE.find((d) => d.id === item?.id) ||
      DEFAULT_WHATSAPP_RENEWAL_SEQUENCE[idx] ||
      DEFAULT_WHATSAPP_RENEWAL_SEQUENCE[0];

    const resolvedDispatchMode: WhatsAppStepDispatchMode =
      item?.dispatchMode === 'immediate' || item?.dispatchMode === 'scheduled'
        ? item.dispatchMode
        : fallback.dispatchMode;

    const resolvedTriggerType: 'before_due' | 'on_due' | 'after_due' =
      item?.triggerType === 'before_due' ||
      item?.triggerType === 'on_due' ||
      item?.triggerType === 'after_due'
        ? item.triggerType
        : fallback.triggerType;

    return {
      id: String(item?.id || fallback.id || `wa-step-${idx + 1}`),
      title: String(item?.title || fallback.title),
      triggerType: resolvedTriggerType,
      daysOffset:
        resolvedTriggerType === 'on_due'
          ? 0
          : Math.max(0, Number(item?.daysOffset ?? fallback.daysOffset ?? 0)),
      enabled: item?.enabled !== undefined ? Boolean(item.enabled) : fallback.enabled,
      dispatchMode: resolvedDispatchMode,
      template: String(item?.template || fallback.template),
    };
  });
}

export interface MercadoPagoConnectionTestLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  environment?: 'production' | 'sandbox';
  latencyMs?: number;
  accountLabel?: string;
  maskedToken?: string;
  message: string;
  errorDetail?: string | null;
}

export function isMaskedMpToken(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••');
}

export function maskMpAccessToken(token: string): string {
  const clean = String(token || '').trim();
  if (!clean) return '';
  if (isMaskedMpToken(clean)) return clean;
  if (clean.length <= 14) {
    return `${clean.slice(0, 6)}••••••••••••••••`;
  }
  return `${clean.slice(0, 10)}••••••••••••••••••••••••${clean.slice(-4)}`;
}


