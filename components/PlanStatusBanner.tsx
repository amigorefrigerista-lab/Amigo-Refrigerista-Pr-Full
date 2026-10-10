'use client';

import React from 'react';
import { Crown, Zap, Shield, Sparkles, ArrowUpRight, CheckCircle2, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PlanStatusBannerProps {
  onOpenUpgradeModal: () => void;
}

export function PlanStatusBanner({ onOpenUpgradeModal }: PlanStatusBannerProps) {
  const { profile, isAdmin } = useAuth();

  const rawPlan = isAdmin ? 'pro' : profile?.subscription?.plan || 'free';
  const endDate = profile?.subscription?.endDate;

  const isPro = rawPlan === 'pro' || rawPlan === 'pro_paid' || rawPlan === 'pro_trial';
  const isFlex = rawPlan === 'flex';
  const isFree = !isPro && !isFlex;

  const planConfig = isPro
    ? {
        badge: rawPlan === 'pro_trial' ? 'PLANO PRO (TRIAL ATIVO)' : 'PLANO PRO ATIVO',
        title: 'Você está no Plano Amigo PRO',
        subtitle:
          'Acesso total liberado: Ordens de Serviço ilimitadas, Diagnóstico com IA, Leitor OCR de Placas, PMOC e Lembretes Automáticos.',
        buttonText: 'Ver Detalhes do Plano / Voucher',
        icon: Crown,
        containerClass:
          'from-amber-950/85 via-slate-900 to-slate-900 border-amber-500/40 shadow-[0_10px_30px_rgba(245,158,11,0.12)]',
        iconBoxClass:
          'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        btnClass:
          'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40',
        highlights: ['OS & PMOC Ilimitados', 'IA Diagnóstico Total', 'Automação WhatsApp'],
      }
    : isFlex
    ? {
        badge: 'PLANO FLEX ATIVO',
        title: 'Você está no Plano Flex VIP',
        subtitle:
          'Ferramentas essenciais liberadas! Faça o upgrade para o Plano PRO para desbloquear IA ilimitada, Leitor de Placas OCR e Automação de Vendas.',
        buttonText: 'Evoluir para o Plano PRO',
        icon: Zap,
        containerClass:
          'from-cyan-950/85 via-slate-900 to-slate-900 border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.12)]',
        iconBoxClass:
          'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        btnClass:
          'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]',
        highlights: ['Calculadora SH/Sub', 'Gestão de Clientes', 'Upgrade PRO Disponível'],
      }
    : {
        badge: 'PLANO GRÁTIS (FREE)',
        title: 'Você está no Plano Gratuito',
        subtitle:
          'Aproveite os recursos básicos de teste. Evolua para o Plano Flex ou PRO para liberar Ordens de Serviço ilimitadas, IA de Diagnóstico e alertas automáticos.',
        buttonText: 'Como Mudar para um Plano Melhor',
        icon: Shield,
        containerClass:
          'from-sky-950/80 via-slate-900 to-slate-900 border-sky-500/35 shadow-[0_10px_30px_rgba(14,165,233,0.12)]',
        iconBoxClass:
          'bg-sky-500/20 border-sky-500/30 text-sky-400 shadow-[0_0_18px_rgba(14,165,233,0.25)]',
        badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        btnClass:
          'bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
        highlights: ['Acesso Inicial', 'Upgrade Flex (R$ 19,90)', 'Upgrade PRO (R$ 39,90)'],
      };

  const PlanIcon = planConfig.icon;

  return (
    <div
      className={`w-full rounded-3xl bg-gradient-to-r ${planConfig.containerClass} border p-4 sm:p-5 transition-all duration-300 relative overflow-hidden`}
    >
      {/* Brilho decorativo sutil */}
      <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 relative z-10">
        {/* Esquerda: Ícone + Informações do Plano Atual */}
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 ${planConfig.iconBoxClass}`}
          >
            <PlanIcon size={22} className="sm:w-6 sm:h-6" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider inline-flex items-center gap-1 ${planConfig.badgeClass}`}
              >
                <Sparkles size={10} />
                {planConfig.badge}
              </span>

              {endDate && (
                <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded-md border border-slate-800">
                  Válido até: <strong className="text-white">{endDate}</strong>
                </span>
              )}

              {!isPro && (
                <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Gift size={10} />
                  Aceita Código / Voucher
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-snug">
              {planConfig.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
              {planConfig.subtitle}
            </p>

            {/* Pílulas informativas de recursos/opções */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
              {planConfig.highlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-200 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg"
                >
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Direita: Botão Informativo que leva ao Modal de Upgrade */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-end gap-2 shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className={`w-full sm:w-auto px-4 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${planConfig.btnClass}`}
          >
            <Crown size={16} className="shrink-0" />
            <span>{planConfig.buttonText}</span>
            <ArrowUpRight size={15} className="shrink-0" />
          </button>
          {isFree && (
            <span className="text-[11px] text-slate-300 text-center md:text-right font-medium">
              Planos a partir de <strong className="text-amber-400">R$ 19,90/mês</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanStatusBanner;
