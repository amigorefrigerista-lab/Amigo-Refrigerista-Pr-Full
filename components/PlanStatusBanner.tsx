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
      className={`w-full rounded-xl bg-gradient-to-r ${planConfig.containerClass} border p-2 transition-all duration-300 relative overflow-hidden`}
    >
      {/* Brilho decorativo sutil */}
      <div className="absolute -right-8 -top-8 w-16 h-16 rounded-full bg-white/5 blur-xl pointer-events-none" />

      <div className="flex flex-col gap-2 relative z-10">
        {/* Superior: Ícone + Título do Plano + Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${planConfig.iconBoxClass}`}
          >
            <PlanIcon size={14} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-black text-white leading-tight truncate">
              {planConfig.title}
            </h2>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={`text-[8px] font-black uppercase px-1 py-0 rounded border tracking-wider inline-flex items-center gap-0.5 ${planConfig.badgeClass}`}
              >
                {planConfig.badge}
              </span>
            </div>
          </div>
        </div>

        {/* Inferior: Ação de Upgrade */}
        <button
          type="button"
          onClick={onOpenUpgradeModal}
          className={`w-full px-3 py-1.5 rounded-lg font-black text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border ${planConfig.btnClass}`}
        >
          <Crown size={12} />
          <span>{planConfig.buttonText.split(' / ')[0]}</span>
        </button>
      </div>
    </div>
  );
}

export default PlanStatusBanner;
