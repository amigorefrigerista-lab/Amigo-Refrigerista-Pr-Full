'use client';

import React from 'react';
import {
  ANNUAL_PRICE_FACTOR,
  SHOW_FLEX_PLAN,
} from '@/lib/pricing';
import {
  Zap,
  Crown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
} from 'lucide-react';

export interface PlanComparisonCardsProps {
  selectedPlan: 'flex' | 'pro';
  onSelectPlan: (plan: 'flex' | 'pro') => void;
  isAnnual: boolean;
  flexMonthlyPrice: number;
  proMonthlyPrice: number;
  currentPlan?: string;
}

interface PlanFeatureItem {
  label: string;
  value: string;
  status: 'included' | 'limited' | 'highlight';
}

export function PlanComparisonCards({
  selectedPlan,
  onSelectPlan,
  isAnnual,
  flexMonthlyPrice,
  proMonthlyPrice,
  currentPlan = 'free',
}: PlanComparisonCardsProps) {
  const normalizedCurrent = (currentPlan || 'free').toLowerCase().trim();
  const isCurrentFree = normalizedCurrent === 'free';
  const isCurrentFlex = normalizedCurrent === 'flex';
  const isCurrentPro =
    normalizedCurrent === 'pro' ||
    normalizedCurrent === 'pro_paid' ||
    normalizedCurrent === 'pro_trial';

  // Cálculos do Plano Flex
  const flexAnnualOriginal = Math.round(flexMonthlyPrice * 12 * 100) / 100;
  const flexAnnualPrice = Math.round(flexAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100;
  const flexAnnualSavings = Math.round((flexAnnualOriginal - flexAnnualPrice) * 100) / 100;
  const flexAnnualMonthlyEquiv = Math.round((flexAnnualPrice / 12) * 100) / 100;

  // Cálculos do Plano Pró
  const proAnnualOriginal = Math.round(proMonthlyPrice * 12 * 100) / 100;
  const proAnnualPrice = Math.round(proAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100;
  const proAnnualSavings = Math.round((proAnnualOriginal - proAnnualPrice) * 100) / 100;
  const proAnnualMonthlyEquiv = Math.round((proAnnualPrice / 12) * 100) / 100;

  const freeFeatures: PlanFeatureItem[] = [
    {
      label: 'Ordens de Serviço (OS) no Banco',
      value: 'Até 3 OS / mês',
      status: 'limited',
    },
    {
      label: 'Consultas IA + Leitor de Placa (OCR)',
      value: 'Até 3 consultas / mês (depois usa banco local)',
      status: 'limited',
    },
    {
      label: 'Calculadora SH / Sub-resfriamento e BTUs',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Tabela Pressão × Temperatura (CoolProp)',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Cadastro de Clientes, Orçamentos e Financeiro',
      value: 'Liberado',
      status: 'included',
    },
    {
      label: 'OS com Assinatura Digital e Exportação PDF',
      value: 'Até o limite mensal (3 OS/mês)',
      status: 'limited',
    },
    {
      label: 'Diagnóstico de Códigos de Erro (Banco Local)',
      value: 'Liberado',
      status: 'included',
    },
    {
      label: 'QR Code PMOC e Automação de Preventivas WhatsApp',
      value: 'Básico (envio manual)',
      status: 'limited',
    },
  ];

  const flexFeatures: PlanFeatureItem[] = [
    {
      label: 'Ordens de Serviço (OS) no Banco',
      value: 'Ilimitadas',
      status: 'highlight',
    },
    {
      label: 'Consultas IA + Leitor de Placa (OCR)',
      value: 'Até 150 consultas / mês (uso justo)',
      status: 'included',
    },
    {
      label: 'Calculadora SH / Sub-resfriamento e BTUs',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Tabela Pressão × Temperatura (CoolProp)',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Cadastro de Clientes, Orçamentos e Financeiro',
      value: 'Liberado sem limites',
      status: 'included',
    },
    {
      label: 'OS com Assinatura Digital e Exportação PDF',
      value: 'Liberado sem limite',
      status: 'highlight',
    },
    {
      label: 'Diagnóstico de Códigos de Erro (Local + IA)',
      value: 'Liberado (até 150 consultas IA/mês)',
      status: 'included',
    },
    {
      label: 'QR Code PMOC e Automação de Preventivas WhatsApp',
      value: 'Básico',
      status: 'limited',
    },
  ];

  const proFeatures: PlanFeatureItem[] = [
    {
      label: 'Ordens de Serviço (OS) no Banco',
      value: 'Ilimitadas',
      status: 'highlight',
    },
    {
      label: 'Consultas IA + Leitor de Placa (OCR)',
      value: 'Destaque Total (até 150 consultas / mês)',
      status: 'highlight',
    },
    {
      label: 'Calculadora SH / Sub-resfriamento e BTUs',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Tabela Pressão × Temperatura (CoolProp)',
      value: 'Liberada',
      status: 'included',
    },
    {
      label: 'Cadastro de Clientes, Orçamentos e Financeiro',
      value: 'Liberado sem limites',
      status: 'included',
    },
    {
      label: 'OS com Assinatura Digital, PDF e E-mail',
      value: 'Liberado sem limite',
      status: 'highlight',
    },
    {
      label: 'Diagnóstico Avançado com IA + Leitor OCR por Câmera',
      value: 'Destaque Total em todas as marcas',
      status: 'highlight',
    },
    {
      label: 'QR Code PMOC e Automação de Preventivas WhatsApp',
      value: 'Destaque Exclusivo do Plano Pró',
      status: 'highlight',
    },
  ];

  const renderFeatureRow = (item: PlanFeatureItem, accentColor: 'slate' | 'cyan' | 'amber') => {
    const isHighlight = item.status === 'highlight';
    const isLimited = item.status === 'limited';

    return (
      <li
        key={item.label}
        className="flex items-start gap-2 text-[11px] leading-snug py-1.5 border-b border-slate-800/60 last:border-b-0"
      >
        {isLimited ? (
          <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
        ) : isHighlight ? (
          <Sparkles
            size={14}
            className={`shrink-0 mt-0.5 ${
              accentColor === 'amber'
                ? 'text-amber-400'
                : accentColor === 'cyan'
                ? 'text-cyan-400'
                : 'text-emerald-400'
            }`}
          />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-slate-300 font-medium block">{item.label}:</span>
          <span
            className={`font-bold block mt-0.5 ${
              isLimited
                ? 'text-slate-400'
                : isHighlight
                ? accentColor === 'amber'
                  ? 'text-amber-300'
                  : accentColor === 'cyan'
                  ? 'text-cyan-300'
                  : 'text-emerald-300'
                : 'text-emerald-300'
            }`}
          >
            {item.value}
          </span>
        </div>
      </li>
    );
  };

  return (
    <div
      className={`grid grid-cols-1 ${
        SHOW_FLEX_PLAN ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
      } gap-3.5 items-stretch`}
    >
      {/* CARD 1: PLANO GRÁTIS (FREE) */}
      <div className="p-4 rounded-2xl border bg-slate-950/85 border-slate-800 flex flex-col justify-between gap-4 relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
              <Shield size={11} />
              Plano Grátis (Free)
            </span>
            {isCurrentFree ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-800 text-emerald-300 border border-emerald-500/30">
                Seu Plano Atual
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-800">
                Para Testar
              </span>
            )}
          </div>

          <div className="pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white font-mono">R$ 0,00</span>
              <span className="text-xs text-slate-400">/ mês</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Acesso inicial gratuito para conhecer as ferramentas
            </p>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            Ideal para testar o aplicativo e utilizar as calculadoras térmicas e banco local de erros.
          </p>

          <div className="pt-2 border-t border-slate-800/90">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Funções e Limites do Plano Grátis:
            </span>
            <ul className="space-y-0.5">
              {freeFeatures.map((item) => renderFeatureRow(item, 'slate'))}
            </ul>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
          <span className="text-slate-400">
            {isCurrentFree ? '✓ Ativo na sua conta' : 'Plano de Entrada'}
          </span>
          <span className="text-slate-500 font-mono">3 OS e 3 IA/mês</span>
        </div>
      </div>

      {/* CARD 2: PLANO FLEX VIP */}
      {SHOW_FLEX_PLAN && (
        <div
          onClick={() => onSelectPlan('flex')}
          className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${
            selectedPlan === 'flex'
              ? 'bg-cyan-950/45 border-cyan-400 ring-2 ring-cyan-400/25 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
              : 'bg-slate-950/85 border-slate-800 hover:border-cyan-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Zap size={11} />
                Plano Flex VIP
              </span>
              <div className="flex items-center gap-1.5">
                {isCurrentFlex && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Plano Atual
                  </span>
                )}
                <input
                  type="radio"
                  name="plan_comparison_choice"
                  checked={selectedPlan === 'flex'}
                  onChange={() => onSelectPlan('flex')}
                  className="w-4 h-4 text-cyan-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>

            {isAnnual ? (
              <div className="pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-cyan-400 font-mono">
                    R$ {flexAnnualPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-400">/ ano</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 line-through font-mono">
                    R$ {flexAnnualOriginal.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    2 meses grátis (Economize R$ {flexAnnualSavings.toFixed(2).replace('.', ',')})
                  </span>
                </div>
                <p className="text-[10px] font-bold text-cyan-300 mt-1">
                  Equivale a apenas R$ {flexAnnualMonthlyEquiv.toFixed(2).replace('.', ',')}/mês
                </p>
              </div>
            ) : (
              <div className="pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-cyan-400 font-mono">
                    R$ {flexMonthlyPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-400">/ mês</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Recorrente mensal • Sem fidelidade (ou R$ {flexAnnualPrice.toFixed(2).replace('.', ',')}/ano)
                </p>
              </div>
            )}

            <p className="text-[11px] text-slate-300 leading-snug">
              Para técnicos autônomos que querem Ordens de Serviço ilimitadas com PDF e assinatura digital.
            </p>

            <div className="pt-2 border-t border-slate-800/90">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 block mb-1.5">
                Funções Liberadas no Plano Flex:
              </span>
              <ul className="space-y-0.5">
                {flexFeatures.map((item) => renderFeatureRow(item, 'cyan'))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlan('flex');
            }}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedPlan === 'flex'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            <span>
              {selectedPlan === 'flex' ? '✓ Plano Flex Selecionado' : 'Escolher Plano Flex'}
            </span>
          </button>
        </div>
      )}

      {/* CARD 3: PLANO PRÓ COMPLETO */}
      <div
        onClick={() => onSelectPlan('pro')}
        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${
          selectedPlan === 'pro'
            ? 'bg-amber-950/45 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
            : 'bg-slate-950/85 border-slate-800 hover:border-amber-500/50'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Crown size={11} />
              Plano Pró Completo
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950">
                {isCurrentPro ? 'Plano Atual' : 'Mais Completo'}
              </span>
              <input
                type="radio"
                name="plan_comparison_choice"
                checked={selectedPlan === 'pro'}
                onChange={() => onSelectPlan('pro')}
                className="w-4 h-4 text-amber-400 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {isAnnual ? (
            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  R$ {proAnnualPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-slate-400">/ ano</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-slate-500 line-through font-mono">
                  R$ {proAnnualOriginal.toFixed(2).replace('.', ',')}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  2 meses grátis (Economize R$ {proAnnualSavings.toFixed(2).replace('.', ',')})
                </span>
              </div>
              <p className="text-[10px] font-bold text-amber-300 mt-1">
                Equivale a apenas R$ {proAnnualMonthlyEquiv.toFixed(2).replace('.', ',')}/mês
              </p>
            </div>
          ) : (
            <div className="pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  R$ {proMonthlyPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Recorrente mensal • Sem fidelidade (ou R$ {proAnnualPrice.toFixed(2).replace('.', ',')}/ano)
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-300 leading-snug">
            Acesso total: OS ilimitadas, IA e Leitor OCR de Placas, QR Code PMOC e Automação no WhatsApp.
          </p>

          <div className="pt-2 border-t border-slate-800/90">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block mb-1.5">
              Tudo Liberado no Plano Pró:
            </span>
            <ul className="space-y-0.5">
              {proFeatures.map((item) => renderFeatureRow(item, 'amber'))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectPlan('pro');
          }}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedPlan === 'pro'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
          }`}
        >
          <span>
            {selectedPlan === 'pro' ? '✓ Plano Pró Selecionado' : 'Escolher Plano Pró'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default PlanComparisonCards;
