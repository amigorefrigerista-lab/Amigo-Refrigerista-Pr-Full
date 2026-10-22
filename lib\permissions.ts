// lib/permissions.ts
export type RawPlanType = 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid' | string;
export type NormalizedPlanTier = 'free' | 'pro';

export interface PlanLimits {
  maxOrdersPerMonth: number;
  maxQuotesPerMonth: number;
  maxAiQueriesPerMonth: number;
  maxClients: number;
  canUseOcrPlateReader: boolean;
  canExportPdfWithoutWatermark: boolean;
  canUseCustomLogo: boolean;
  canScheduleWhatsappReminders: boolean;
  canAccessFullErrorDatabase: boolean;
}

export const PLAN_LIMITS: Record<NormalizedPlanTier, PlanLimits> = {
  free: {
    maxOrdersPerMonth: 5,
    maxQuotesPerMonth: 10,
    maxAiQueriesPerMonth: 3,
    maxClients: 20,
    canUseOcrPlateReader: false,
    canExportPdfWithoutWatermark: false,
    canUseCustomLogo: false,
    canScheduleWhatsappReminders: true,
    canAccessFullErrorDatabase: true,
  },
  pro: {
    maxOrdersPerMonth: 9999,
    maxQuotesPerMonth: 9999,
    maxAiQueriesPerMonth: 150,
    maxClients: 9999,
    canUseOcrPlateReader: true,
    canExportPdfWithoutWatermark: true,
    canUseCustomLogo: true,
    canScheduleWhatsappReminders: true,
    canAccessFullErrorDatabase: true,
  },
};

export function normalizePlanTier(
  rawPlan?: RawPlanType | null,
  planExpiresAt?: string | null,
  isAdmin?: boolean
): NormalizedPlanTier {
  if (isAdmin) return 'pro';
  if (!rawPlan) return 'free';
  const clean = String(rawPlan).toLowerCase().trim();

  if (planExpiresAt) {
    const expiryTime = new Date(planExpiresAt).getTime();
    if (!Number.isNaN(expiryTime) && expiryTime < Date.now()) {
      return 'free';
    }
  }

  if (['pro', 'flex', 'pro_paid', 'pro_trial', 'vip', 'annual'].includes(clean)) {
    return 'pro';
  }
  return 'free';
}

export function getUserPlanLimits(
  rawPlan?: RawPlanType | null,
  planExpiresAt?: string | null,
  isAdmin?: boolean
): PlanLimits {
  return PLAN_LIMITS[normalizePlanTier(rawPlan, planExpiresAt, isAdmin)];
}