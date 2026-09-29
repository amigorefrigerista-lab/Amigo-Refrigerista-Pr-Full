'use client';

import React from 'react';
import { Crown, Sparkles, Star, ShieldCheck, KeyRound, Clock } from 'lucide-react';
import { getSubscriptionDaysRemaining } from '@/lib/licenseService';

interface VipWelcomeBannerProps {
  name: string;
  isTrial?: boolean;
  licenseCode?: string;
  endDate?: string;
}

export function VipWelcomeBanner({ name, isTrial, licenseCode, endDate }: VipWelcomeBannerProps) {
  const daysLeft = endDate ? getSubscriptionDaysRemaining(endDate) : null;

  return (
    <div className={`rounded-3xl p-6 relative overflow-hidden shadow-[0_10px_30px_rgba(245,158,11,0.15)] space-y-3 border ${
      isTrial 
        ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/60 border-cyan-500/40' 
        : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border-amber-500/40'
    }`}>
      {/* Glow e partículas decorativas de fundo */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 ${
        isTrial ? 'bg-cyan-500/10' : 'bg-amber-500/10'
      }`} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className={`p-3.5 rounded-2xl font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0 ${
            isTrial 
              ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-slate-950' 
              : 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950'
          }`}>
            {isTrial ? <KeyRound size={28} className="fill-slate-950" /> : <Crown size={28} className="fill-slate-950" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-widest flex items-center gap-1 ${
                isTrial 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                <Sparkles size={10} />
                {isTrial ? 'Licença Pro Promocional' : 'Parceiro VIP Vitalício'}
              </span>

              {licenseCode && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20">
                  Código: {licenseCode}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Olá, <span className={`bg-gradient-to-r ${isTrial ? 'from-cyan-300 via-sky-200 to-teal-400' : 'from-amber-300 via-amber-200 to-yellow-400'} bg-clip-text text-transparent`}>{name}</span>!
            </h2>
            <p className="text-xs text-slate-300">
              {isTrial 
                ? 'Sua conta está com todos os recursos do Plano Pró liberados durante o período de avaliação da licença!' 
                : 'Sua conta possui acesso ilimitado e prioritário a todas as ferramentas do Amigo Refrigerista Pro.'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 shrink-0 bg-slate-950/80 px-3.5 py-2 rounded-2xl border ${
          isTrial ? 'border-cyan-500/30' : 'border-amber-500/30'
        }`}>
          {isTrial ? (
            <>
              <Clock size={18} className="text-cyan-400" />
              <div className="text-xs">
                <span className="font-bold text-cyan-300 block">
                  {daysLeft !== null ? `${daysLeft} dias restantes` : 'Período Ativo'}
                </span>
                {endDate && <span className="text-[10px] text-slate-400">Até {endDate}</span>}
              </div>
            </>
          ) : (
            <>
              <ShieldCheck size={18} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Licença Vitalícia Ativa</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VipWelcomeBanner;
