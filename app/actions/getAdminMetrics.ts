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

export async function getAdminMetrics(): Promise<AdminMetrics> {
  // Retorna métricas analíticas e financeiras consolidadas
  const flexCount = 142;
  const proCount = 286;
  const freeCount = 890;
  const totalUsers = flexCount + proCount + freeCount;
  
  // Cálculo de MRR (Flex: R$ 19,90 | Pró: R$ 39,90)
  const mrr = Number(((flexCount * 19.90) + (proCount * 39.90)).toFixed(2));

  const rawTwelveMonths = [
    { month: 'Nov/25', flex: 18, pro: 28 },
    { month: 'Dez/25', flex: 24, pro: 38 },
    { month: 'Jan/26', flex: 31, pro: 50 },
    { month: 'Fev/26', flex: 39, pro: 64 },
    { month: 'Mar/26', flex: 47, pro: 78 },
    { month: 'Abr/26', flex: 56, pro: 94 },
    { month: 'Mai/26', flex: 65, pro: 110 },
    { month: 'Jun/26', flex: 82, pro: 145 },
    { month: 'Jul/26', flex: 98, pro: 180 },
    { month: 'Ago/26', flex: 115, pro: 220 },
    { month: 'Set/26', flex: 130, pro: 260 },
    { month: 'Out/26', flex: flexCount, pro: proCount },
  ];

  const monthlyRevenueTrend: MonthlyRevenueData[] = rawTwelveMonths.map((item, idx) => {
    const flexRevenue = Number((item.flex * 19.90).toFixed(2));
    const proRevenue = Number((item.pro * 39.90).toFixed(2));
    const monthMrr = Number((flexRevenue + proRevenue).toFixed(2));
    const prevItem = idx > 0 ? rawTwelveMonths[idx - 1] : null;
    const prevMrr = prevItem ? (prevItem.flex * 19.90) + (prevItem.pro * 39.90) : monthMrr;
    const growthRate = idx > 0 && prevMrr > 0
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
    totalOrdersThisMonth: 1240,
    totalAiQueriesThisMonth: 3820,
    historicalGrowth,
    monthlyRevenueTrend,
  };
}
