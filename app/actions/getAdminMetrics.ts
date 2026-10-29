import { getAdminSystemOverviewAction } from '@/app/actions/dbActions';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SubscriptionMonthData {
  month: string;
  flex: number;
  pro: number;
  totalPaid: number;
  mrr: number;
}

export interface MonthlyRevenueData {
  month: string;
  mrr: number;
  proRevenue: number;
  flexRevenue: number;
  growthRate: number;
  proCount: number;
  flexCount: number;
  arr: number;
}

export interface AdminMetrics {
  mrr: number;
  totalUsers: number;
  freeCount: number;
  flexCount: number;
  proCount: number;
  totalOrdersThisMonth: number;
  totalAiQueriesThisMonth: number;
  historicalGrowth: SubscriptionMonthData[];
  monthlyRevenueTrend: MonthlyRevenueData[];
}

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function getLastTwelveMonthsMeta(now: Date) {
  const result: Array<{ label: string; year: number; month: number; endOfMonth: Date }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const shortYear = String(year).slice(-2);
    const label = `${MONTH_NAMES_PT[month]}/${shortYear}`;
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    result.push({ label, year, month, endOfMonth });
  }
  return result;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Consulta dados reais do banco PostgreSQL (Cloud SQL / Drizzle)
  const overview = await getAdminSystemOverviewAction().catch(() => null);
  const pgUsers = overview?.users || [];
  const pgInstallations = overview?.installations || [];
  const pgDiagnoses = overview?.errorDiagnoses || [];
  const pgQuotas = overview?.monthlyQuotas || [];

  // 2. Consulta perfis reais do Supabase (caso configurado) e unifica por e-mail/UID
  const unifiedUsersMap = new Map<string, { plan: 'free' | 'flex' | 'pro'; createdAt: Date }>();

  for (const u of pgUsers) {
    const key = String(u.email || u.uid || u.id).toLowerCase().trim();
    if (!key) continue;
    const rawPlan = String(u.plan || 'free').toLowerCase().trim();
    const plan: 'free' | 'flex' | 'pro' =
      rawPlan === 'pro' ? 'pro' : rawPlan === 'flex' ? 'flex' : 'free';
    const createdAt = u.createdAt ? new Date(u.createdAt) : now;
    unifiedUsersMap.set(key, {
      plan,
      createdAt: Number.isNaN(createdAt.getTime()) ? now : createdAt,
    });
  }

  if (isSupabaseConfigured) {
    try {
      const { data: sbProfiles } = await supabase
        .from('profiles')
        .select('id, email, plano, created_at');
      if (Array.isArray(sbProfiles)) {
        for (const p of sbProfiles) {
          const key = String(p.email || p.id || '').toLowerCase().trim();
          if (!key) continue;
          const rawPlan = String(p.plano || 'free').toLowerCase().trim();
          const plan: 'free' | 'flex' | 'pro' =
            rawPlan === 'pro' ? 'pro' : rawPlan === 'flex' ? 'flex' : 'free';
          const createdAt = p.created_at ? new Date(p.created_at) : now;
          const existing = unifiedUsersMap.get(key);
          if (!existing || (existing.plan === 'free' && plan !== 'free')) {
            unifiedUsersMap.set(key, {
              plan,
              createdAt: Number.isNaN(createdAt.getTime()) ? now : createdAt,
            });
          }
        }
      }
    } catch {
      // ignora falha de rede silenciosamente mantendo os dados reais do PostgreSQL
    }
  }

  const allRealUsers = Array.from(unifiedUsersMap.values());

  let flexCount = 0;
  let proCount = 0;
  let freeCount = 0;

  for (const u of allRealUsers) {
    if (u.plan === 'pro') proCount++;
    else if (u.plan === 'flex') flexCount++;
    else freeCount++;
  }

  const totalUsers = flexCount + proCount + freeCount;
  const mrr = Number(((flexCount * 19.90) + (proCount * 39.90)).toFixed(2));

  // Ordens de Serviço emitidas no mês atual (dados reais)
  const totalOrdersThisMonth = pgInstallations.filter((inst: any) => {
    if (!inst.createdAt) return false;
    const d = new Date(inst.createdAt);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }).length;

  // Consultas técnicas / diagnósticos no mês atual (dados reais)
  const diagnosesThisMonth = pgDiagnoses.filter((diag: any) => {
    if (!diag.createdAt) return false;
    const d = new Date(diag.createdAt);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }).length;

  const quotaAiThisMonth = pgQuotas
    .filter((q: any) => q.monthKey === currentMonthKey)
    .reduce((acc: number, q: any) => acc + (Number(q.aiQueriesCount) || 0), 0);

  const totalAiQueriesThisMonth = Math.max(diagnosesThisMonth, quotaAiThisMonth);

  // Evolução mensal dos últimos 12 meses baseada na data real de cadastro dos assinantes
  const monthsMeta = getLastTwelveMonthsMeta(now);
  const rawTwelveMonths = monthsMeta.map((m) => {
    let mFlex = 0;
    let mPro = 0;
    for (const u of allRealUsers) {
      if (u.createdAt.getTime() <= m.endOfMonth.getTime()) {
        if (u.plan === 'pro') mPro++;
        else if (u.plan === 'flex') mFlex++;
      }
    }
    return {
      month: m.label,
      flex: mFlex,
      pro: mPro,
    };
  });

  const monthlyRevenueTrend: MonthlyRevenueData[] = rawTwelveMonths.map((item, idx) => {
    const flexRevenue = Number((item.flex * 19.90).toFixed(2));
    const proRevenue = Number((item.pro * 39.90).toFixed(2));
    const monthMrr = Number((flexRevenue + proRevenue).toFixed(2));
    const prevItem = idx > 0 ? rawTwelveMonths[idx - 1] : null;
    const prevMrr = prevItem ? (prevItem.flex * 19.90) + (prevItem.pro * 39.90) : monthMrr;
    const growthRate =
      idx > 0 && prevMrr > 0
        ? Number((((monthMrr - prevMrr) / prevMrr) * 100).toFixed(1))
        : 0;

    return {
      month: item.month,
      mrr: monthMrr,
      proRevenue,
      flexRevenue,
      growthRate,
      proCount: item.pro,
      flexCount: item.flex,
      arr: Number((monthMrr * 12).toFixed(2)),
    };
  });

  const historicalGrowth: SubscriptionMonthData[] = rawTwelveMonths.slice(-6).map((item) => ({
    month: item.month,
    flex: item.flex,
    pro: item.pro,
    totalPaid: item.flex + item.pro,
    mrr: Number(((item.flex * 19.90) + (item.pro * 39.90)).toFixed(2)),
  }));

  return {
    mrr,
    totalUsers,
    freeCount,
    flexCount,
    proCount,
    totalOrdersThisMonth,
    totalAiQueriesThisMonth,
    historicalGrowth,
    monthlyRevenueTrend,
  };
}
