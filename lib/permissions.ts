// lib/permissions.ts
import { UserSubscription as BaseUserSubscription, isSubscriptionValid } from './licenseService';

export type PlanType = 'free' | 'pro_trial' | 'pro_paid';

export type UserSubscription = BaseUserSubscription;

export interface UsageStats {
  monthlyOrdersCreated: number;
  monthlyAiQueries: number;
}

export const PLAN_LIMITS: Record<PlanType, any> = {
  free: {
    maxMonthlyOrders: 3,
    maxMonthlyAiQueries: 3,
    allowCustomLogo: false,
    allowPhotoReport: false,
    allowSimpleReminder: false,
    allowSmartAutoSalesAgent: false, // Inclusão de Agenda + PIX no WhatsApp
  },
  pro_trial: {
    maxMonthlyOrders: Infinity,
    maxMonthlyAiQueries: Infinity,
    allowCustomLogo: true,
    allowPhotoReport: true,
    allowSimpleReminder: true,
    allowSmartAutoSalesAgent: true,
  },
  pro_paid: {
    maxMonthlyOrders: Infinity,
    maxMonthlyAiQueries: Infinity,
    allowCustomLogo: true,
    allowPhotoReport: true,
    allowSimpleReminder: true,
    allowSmartAutoSalesAgent: true,
  },
};

/**
 * Função utilitária para verificar se o usuário pode realizar uma ação no aplicativo
 */
export function checkFeatureAccess(
  subscription: Partial<UserSubscription> | undefined | null,
  usage: UsageStats,
  feature: 'create_order' | 'ai_query' | 'photo_report' | 'smart_whatsapp_sales'
): { allowed: boolean; reason?: string } {
  // Usuários com flag VIP ou licença ativa têm acesso irrestrito
  if (subscription?.isVip || subscription?.plan === 'pro_paid' || (subscription?.plan as any) === 'pro') {
    return { allowed: true };
  }

  // Se o usuário estiver no período de avaliação da licença gratuita (pro_trial)
  if (subscription?.plan === 'pro_trial') {
    if (isSubscriptionValid(subscription)) {
      return { allowed: true };
    } else {
      return {
        allowed: false,
        reason: 'O período da sua licença gratuita expirou. Faça o upgrade para o Plano Pró para continuar usando todos os recursos.',
      };
    }
  }

  const currentPlan = (subscription?.plan as PlanType) || 'free';
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

  switch (feature) {
    case 'create_order':
      if (usage.monthlyOrdersCreated >= limits.maxMonthlyOrders) {
        return {
          allowed: false,
          reason: `Você atingiu o limite de ${limits.maxMonthlyOrders} OS neste mês no Plano ${currentPlan.toUpperCase()}. Faça o upgrade para continuar gerando Ordens de Serviço.`,
        };
      }
      return { allowed: true };

    case 'ai_query':
      if (usage.monthlyAiQueries >= limits.maxMonthlyAiQueries) {
        return {
          allowed: false,
          reason: `Você atingiu o limite de ${limits.maxMonthlyAiQueries} consultas de IA neste mês no Plano ${currentPlan.toUpperCase()}.`,
        };
      }
      return { allowed: true };

    case 'photo_report':
      if (!limits.allowPhotoReport) {
        return {
          allowed: false,
          reason: 'O relatório com fotos do Antes/Depois é um recurso exclusivo dos planos Flex e Pró.',
        };
      }
      return { allowed: true };

    case 'smart_whatsapp_sales':
      if (!limits.allowSmartAutoSalesAgent) {
        return {
          allowed: false,
          reason: 'O Agente Automático de Vendas via WhatsApp com leitura de agenda e chave PIX é exclusivo do Plano Pró.',
        };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

