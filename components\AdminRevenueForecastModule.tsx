'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Sliders,
  Target,
  RotateCcw,
  Calendar,
  ArrowUpRight,
  Crown,
  Zap,
} from 'lucide-react';
import { MonthlyRevenueData } from '@/app/actions/getAdminMetrics';

interface AdminRevenueForecastModuleProps {
  monthlyRevenueTrend: MonthlyRevenueData[];
  currentMrr: number;
  currentProCount: number;
  currentFlexCount: number;
}

type ScenarioKey = 'conservative' | 'baseline' | 'optimistic' | 'custom';

interface ForecastPoint {
  month: string;
  isForecast: boolean;
  realizedMrr: number | null;
  projectedMrr: number | null;
  optimisticMrr: number | null;
  conservativeMrr: number | null;
  proRevenue: number;
  flexRevenue: number;
  proCount: number;
  flexCount: number;
  netGrowthPct: number;
  arr: number;
}

const NEXT_THREE_MONTHS = ['Nov/26', 'Dez/26', 'Jan/27'];

const SCENARIO_PRESETS: Record<
  Exclude<ScenarioKey, 'custom'>,
  {
    label: string;
    description: string;
    acquisitionRate: number;
    churnRate: number;
    upgradeRate: number;
  }
> = {
  conservative: {
    label: 'Conservador',
    description: 'Crescimento moderado com retenção cautelosa',
    acquisitionRate: 7.5,
    churnRate: 2.5,
    upgradeRate: 1.5,
  },
  baseline: {
    label: 'Tendência Atual',
    description: 'Projeção alinhada ao ritmo histórico recente',
    acquisitionRate: 12.0,
    churnRate: 1.8,
    upgradeRate: 3.5,
  },
  optimistic: {
    label: 'Aceleração',
    description: 'Expansão comercial e maior migração para o Plano Pró',
    acquisitionRate: 17.5,
    churnRate: 1.0,
    upgradeRate: 6.0,
  },
};

const CustomForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data: ForecastPoint = payload[0].payload;
    const activeMrr = data.projectedMrr ?? data.realizedMrr ?? 0;

    return (
      <div className="bg-[#070e1c]/95 border border-emerald-500/30 p-3.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.55)] backdrop-blur-md text-xs space-y-1.5 font-mono">
        <div className="font-bold text-white border-b border-slate-800 pb-1.5 flex items-center justify-between gap-4">
          <span>Competência: {label}</span>
          <span
            className={`text-[11px] font-semibold ${
              data.isForecast ? 'text-emerald-400' : 'text-cyan-300'
            }`}
          >
            {data.isForecast ? 'Projeção Futura' : 'Realizado'}
          </span>
        </div>

        <div className="space-y-1 text-[11px] pt-0.5 tabular-nums">
          <p className="text-emerald-300 font-extrabold flex items-center justify-between gap-5">
            <span>{data.isForecast ? 'MRR Projetado:' : 'MRR Realizado:'}</span>
            <span>
              R$ {activeMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </p>

          {data.isForecast && data.optimisticMrr && data.conservativeMrr && (
            <p className="text-slate-400 flex items-center justify-between gap-5">
              <span>Faixa (Cons. – Otim.):</span>
              <span>
                R$ {data.conservativeMrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} – R${' '}
                {data.optimisticMrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </p>
          )}

          <p className="text-amber-400 font-semibold flex items-center justify-between gap-5">
            <span>Plano Pró ({data.proCount} assin.):</span>
            <span>
              R$ {data.proRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </p>

          <p className="text-sky-400 font-semibold flex items-center justify-between gap-5">
            <span>Plano Flex ({data.flexCount} assin.):</span>
            <span>
              R$ {data.flexRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </p>

          <p className="text-slate-300 font-semibold flex items-center justify-between gap-5 border-t border-slate-800 pt-1">
            <span>ARR Estimado (12x):</span>
            <span>
              R$ {data.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminRevenueForecastModule({
  monthlyRevenueTrend,
  currentMrr,
  currentProCount,
  currentFlexCount,
}: AdminRevenueForecastModuleProps) {
  const [scenario, setScenario] = useState<ScenarioKey>('baseline');
  const [acquisitionRate, setAcquisitionRate] = useState<number>(
    SCENARIO_PRESETS.baseline.acquisitionRate
  );
  const [churnRate, setChurnRate] = useState<number>(SCENARIO_PRESETS.baseline.churnRate);
  const [upgradeRate, setUpgradeRate] = useState<number>(SCENARIO_PRESETS.baseline.upgradeRate);
  const [targetMrr, setTargetMrr] = useState<number>(18500);

  const handleSelectScenario = (key: Exclude<ScenarioKey, 'custom'>) => {
    const preset = SCENARIO_PRESETS[key];
    setScenario(key);
    setAcquisitionRate(preset.acquisitionRate);
    setChurnRate(preset.churnRate);
    setUpgradeRate(preset.upgradeRate);
  };

  const simulateMonthStep = (
    pro: number,
    flex: number,
    acqPct: number,
    churnPct: number,
    upgPct: number
  ) => {
    const netFactor = 1 + (acqPct - churnPct) / 100;
    const upgradedFromFlex = Math.round(flex * (upgPct / 100));
    const nextPro = Math.max(0, Math.round(pro * netFactor) + upgradedFromFlex);
    const nextFlex = Math.max(0, Math.round(flex * netFactor) - upgradedFromFlex);
    const proRev = Number((nextPro * 39.9).toFixed(2));
    const flexRev = Number((nextFlex * 19.9).toFixed(2));
    const mrr = Number((proRev + flexRev).toFixed(2));
    return { nextPro, nextFlex, proRev, flexRev, mrr };
  };

  const { chartData, futureMonthsOnly } = useMemo(() => {
    const recentHistory = monthlyRevenueTrend.slice(-6);
    const basePro =
      recentHistory.length > 0
        ? recentHistory[recentHistory.length - 1].proCount
        : currentProCount;
    const baseFlex =
      recentHistory.length > 0
        ? recentHistory[recentHistory.length - 1].flexCount
        : currentFlexCount;
    const baseMrr =
      recentHistory.length > 0
        ? recentHistory[recentHistory.length - 1].mrr
        : currentMrr;

    const historicalPoints: ForecastPoint[] = recentHistory.map((item, index) => {
      const isLastRealized = index === recentHistory.length - 1;
      return {
        month: item.month,
        isForecast: false,
        realizedMrr: item.mrr,
        // Connect the forecast line seamlessly from the last realized month (Out/26)
        projectedMrr: isLastRealized ? item.mrr : null,
        optimisticMrr: isLastRealized ? item.mrr : null,
        conservativeMrr: isLastRealized ? item.mrr : null,
        proRevenue: item.proRevenue,
        flexRevenue: item.flexRevenue,
        proCount: item.proCount,
        flexCount: item.flexCount,
        netGrowthPct: item.growthRate,
        arr: item.arr,
      };
    });

    let simPro = basePro;
    let simFlex = baseFlex;
    let prevSimMrr = baseMrr;

    let optPro = basePro;
    let optFlex = baseFlex;

    let consPro = basePro;
    let consFlex = baseFlex;

    const projectedPoints: ForecastPoint[] = NEXT_THREE_MONTHS.map((monthLabel) => {
      const selectedStep = simulateMonthStep(
        simPro,
        simFlex,
        acquisitionRate,
        churnRate,
        upgradeRate
      );
      simPro = selectedStep.nextPro;
      simFlex = selectedStep.nextFlex;

      const netGrowthPct =
        prevSimMrr > 0
          ? Number((((selectedStep.mrr - prevSimMrr) / prevSimMrr) * 100).toFixed(1))
          : 0;
      prevSimMrr = selectedStep.mrr;

      const optStep = simulateMonthStep(
        optPro,
        optFlex,
        Math.max(acquisitionRate + 4, SCENARIO_PRESETS.optimistic.acquisitionRate),
        Math.min(churnRate, SCENARIO_PRESETS.optimistic.churnRate),
        Math.max(upgradeRate + 2, SCENARIO_PRESETS.optimistic.upgradeRate)
      );
      optPro = optStep.nextPro;
      optFlex = optStep.nextFlex;

      const consStep = simulateMonthStep(
        consPro,
        consFlex,
        Math.min( Math.max(2, acquisitionRate - 4), SCENARIO_PRESETS.conservative.acquisitionRate),
        Math.max(churnRate, SCENARIO_PRESETS.conservative.churnRate),
        Math.min(upgradeRate, SCENARIO_PRESETS.conservative.upgradeRate)
      );
      consPro = consStep.nextPro;
      consFlex = consStep.nextFlex;

      return {
        month: monthLabel,
        isForecast: true,
        realizedMrr: null,
        projectedMrr: selectedStep.mrr,
        optimisticMrr: Math.max(selectedStep.mrr, optStep.mrr),
        conservativeMrr: Math.min(selectedStep.mrr, consStep.mrr),
        proRevenue: selectedStep.proRev,
        flexRevenue: selectedStep.flexRev,
        proCount: selectedStep.nextPro,
        flexCount: selectedStep.nextFlex,
        netGrowthPct,
        arr: Number((selectedStep.mrr * 12).toFixed(2)),
      };
    });

    return {
      chartData: [...historicalPoints, ...projectedPoints],
      futureMonthsOnly: projectedPoints,
    };
  }, [
    monthlyRevenueTrend,
    currentMrr,
    currentProCount,
    currentFlexCount,
    acquisitionRate,
    churnRate,
    upgradeRate,
  ]);

  const month3Point = futureMonthsOnly[futureMonthsOnly.length - 1];
  const projectedMrrMonth3 = month3Point ? month3Point.projectedMrr || 0 : currentMrr;
  const totalQuarterlyForecastRevenue = futureMonthsOnly.reduce(
    (sum, item) => sum + (item.projectedMrr || 0),
    0
  );
  const mrrExpansion3mValue = Number((projectedMrrMonth3 - currentMrr).toFixed(2));
  const mrrExpansion3mPct =
    currentMrr > 0 ? (((projectedMrrMonth3 - currentMrr) / currentMrr) * 100).toFixed(1) : '0.0';
  const projectedArrMonth3 = Number((projectedMrrMonth3 * 12).toFixed(2));
  const targetProgressPct =
    targetMrr > 0 ? Math.min(100, Math.round((projectedMrrMonth3 / targetMrr) * 100)) : 100;

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Cabeçalho do Módulo de Projeção */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Projeção Interativa de Receita Recorrente (Forecast MRR — Próximos 3 Meses)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulação preditiva para Nov/26, Dez/26 e Jan/27 baseada no MRR atual e em alavancas de aquisição, retenção e upgrade
            </p>
          </div>
        </div>

        {/* Seletor de Cenários */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start lg:self-auto">
          {(['conservative', 'baseline', 'optimistic'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectScenario(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                scenario === key
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {SCENARIO_PRESETS[key].label}
            </button>
          ))}
          {scenario === 'custom' && (
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Personalizado
            </span>
          )}
        </div>
      </div>

      {/* KPIs Preditivos para o Horizonte de 3 Meses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">MRR Projetado (Jan/27 · Mês +3)</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
            R$ {projectedMrrMonth3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1 font-mono tabular-nums">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span>
              +{mrrExpansion3mPct}% (+R${' '}
              {mrrExpansion3mValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Faturamento Trimestral Previsto</span>
          <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums mt-0.5">
            R$ {totalQuarterlyForecastRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Soma acumulada de Nov/26 a Jan/27
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">ARR Projetado em Jan/27</span>
          <div className="text-lg sm:text-xl font-bold text-cyan-300 font-mono tabular-nums mt-0.5">
            R$ {projectedArrMonth3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            {month3Point ? month3Point.proCount + month3Point.flexCount : 0} assinantes ativos previstos
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Atingimento da Meta MRR</span>
            <span className="font-mono text-amber-300 font-semibold tabular-nums">
              {targetProgressPct}%
            </span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-300 font-mono tabular-nums mt-0.5">
            R$ {targetMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${targetProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Painel de Alavancas Interativas (Sliders) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Parâmetros de Simulação de Crescimento (Ajuste em Tempo Real)</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectScenario('baseline')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Tendência Atual</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Slider 1: Aquisição Mensal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-acq" className="text-slate-300 font-medium">
                Novos Assinantes / Mês
              </label>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                +{acquisitionRate.toFixed(1)}%
              </span>
            </div>
            <input
              id="slider-acq"
              type="range"
              min={0}
              max={30}
              step={0.5}
              value={acquisitionRate}
              onChange={(e) => {
                setScenario('custom');
                setAcquisitionRate(Number(e.target.value));
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Expansão bruta mensal da base paga</p>
          </div>

          {/* Slider 2: Churn Mensal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-churn" className="text-slate-300 font-medium">
                Taxa de Churn Estimada
              </label>
              <span className="font-mono font-bold text-rose-400 tabular-nums">
                -{churnRate.toFixed(1)}%
              </span>
            </div>
            <input
              id="slider-churn"
              type="range"
              min={0}
              max={10}
              step={0.2}
              value={churnRate}
              onChange={(e) => {
                setScenario('custom');
                setChurnRate(Number(e.target.value));
              }}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Cancelamentos mensais previstos</p>
          </div>

          {/* Slider 3: Upgrade Flex -> Pró */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-upgrade" className="text-slate-300 font-medium">
                Upgrade Flex → Pró
              </label>
              <span className="font-mono font-bold text-amber-400 tabular-nums">
                {upgradeRate.toFixed(1)}%/mês
              </span>
            </div>
            <input
              id="slider-upgrade"
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={upgradeRate}
              onChange={(e) => {
                setScenario('custom');
                setUpgradeRate(Number(e.target.value));
              }}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Clientes Flex migrando para R$ 39,90</p>
          </div>

          {/* Input 4: Meta de MRR */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="target-mrr-input" className="text-slate-300 font-medium flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Meta de MRR (R$)</span>
              </label>
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">Linha Alvo</span>
            </div>
            <input
              id="target-mrr-input"
              type="number"
              min={5000}
              max={100000}
              step={500}
              value={targetMrr}
              onChange={(e) => setTargetMrr(Number(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">Referência exibida no gráfico abaixo</p>
          </div>
        </div>
      </div>

      {/* Legenda do Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>MRR Realizado (Mai/26 – Out/26)</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>MRR Projetado (Nov/26 – Jan/27)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
            <span>Banda Otimista / Conservadora</span>
          </div>
        </div>
        <span className="text-[11px] text-amber-300 font-mono tabular-nums">
          Meta MRR: R$ {targetMrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Gráfico Recharts ComposedChart: Realizado + Projeção 3 Meses */}
      <div className="w-full h-80 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 14, right: 18, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="forecastEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.65} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(val: number) =>
                val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : `R$ ${val}`
              }
            />
            <Tooltip content={<CustomForecastTooltip />} />

            {/* Linha vertical demarcando início da projeção */}
            <ReferenceLine
              x="Out/26"
              stroke="#475569"
              strokeDasharray="3 3"
              label={{
                value: 'Início Projeção',
                position: 'insideTopRight',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />

            {/* Linha horizontal da Meta de MRR */}
            {targetMrr > 0 && (
              <ReferenceLine
                y={targetMrr}
                stroke="#f59e0b"
                strokeDasharray="5 5"
              />
            )}

            {/* Área sombreada sob a projeção */}
            <Area
              type="monotone"
              dataKey="projectedMrr"
              fill="url(#forecastEmeraldGrad)"
              stroke="none"
              connectNulls
            />

            {/* Limite Superior Otimista */}
            <Line
              type="monotone"
              dataKey="optimisticMrr"
              name="Teto Otimista"
              stroke="#34d399"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
            />

            {/* Limite Inferior Conservador */}
            <Line
              type="monotone"
              dataKey="conservativeMrr"
              name="Piso Conservador"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
            />

            {/* Série Histórica Realizada */}
            <Line
              type="monotone"
              dataKey="realizedMrr"
              name="MRR Realizado"
              stroke="#22d3ee"
              strokeWidth={3.5}
              dot={{ r: 4.5, fill: '#0891b2', stroke: '#22d3ee', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls
            />

            {/* Série Projetada (Próximos 3 Meses) */}
            <Line
              type="monotone"
              dataKey="projectedMrr"
              name="MRR Projetado"
              stroke="#10b981"
              strokeWidth={3.5}
              strokeDasharray="6 4"
              dot={{ r: 5, fill: '#059669', stroke: '#10b981', strokeWidth: 2 }}
              activeDot={{ r: 8, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detalhamento Mês a Mês dos Próximos 3 Meses */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Detalhamento Mensal Projetado (Nov/26 – Jan/27)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            Crescimento líquido: {(acquisitionRate - churnRate).toFixed(1)}%/mês
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {futureMonthsOnly.map((item, idx) => (
            <div
              key={item.month}
              className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.month}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-[11px] text-slate-400">Mês +{idx + 1}</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-400 tabular-nums">
                  +{item.netGrowthPct.toFixed(1)}% MoM
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">MRR Previsto</span>
                <span className="text-base font-bold text-emerald-300 font-mono tabular-nums">
                  R$ {(item.projectedMrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1 text-[11px] font-mono tabular-nums pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-amber-300">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Plano Pró ({item.proCount})
                  </span>
                  <span>
                    R$ {item.proRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sky-300">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-sky-400" />
                    Plano Flex ({item.flexCount})
                  </span>
                  <span>
                    R$ {item.flexRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
