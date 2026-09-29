'use client';

import React, { useState } from 'react';
import { 
  Lock, 
  Zap, 
  CheckCircle2, 
  MessageCircle, 
  Crown, 
  Sparkles, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Gift, 
  KeyRound, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { redeemFreeLicenseInFirestore } from '@/lib/licenseService';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onRedeemSuccess?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  title = 'Recurso Exclusivo do Plano Pró',
  description = 'Transforme seus clientes de instalação em uma fonte de renda mensal recorrente com a busca de agenda e envio de PIX automático no WhatsApp.',
  onRedeemSuccess
}: UpgradeModalProps) {
  const { user } = useAuth();
  const [licenseCode, setLicenseCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedSuccessMessage, setRedeemedSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCode.trim()) {
      toast.error('Digite o código da licença para resgatar.');
      return;
    }

    if (!user) {
      toast.error('Você precisa fazer login no aplicativo para ativar uma licença.');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await redeemFreeLicenseInFirestore(user.uid, user.email, licenseCode.trim());
      if (res.success) {
        toast.success(res.message);
        setRedeemedSuccessMessage(res.message);
        setLicenseCode('');
        if (onRedeemSuccess) {
          onRedeemSuccess();
        }
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Erro ao processar resgate da licença.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow de Fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Crown size={28} />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest inline-flex items-center gap-1">
                <Sparkles size={10} />
                Upgrade de Plano
              </span>
              <h3 className="text-lg font-black text-white mt-1 leading-tight">{title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed relative z-10">
          {description}
        </p>

        {/* Resgate de Licença Gratuita / Voucher Promocional */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-950 border border-cyan-500/30 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Gift size={16} />
              <span className="text-xs font-black uppercase tracking-wider">
                Tem um Voucher ou Licença Grátis?
              </span>
            </div>
            <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
              30 a 90 dias
            </span>
          </div>

          {redeemedSuccessMessage ? (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{redeemedSuccessMessage}</span>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60" />
                <input
                  type="text"
                  value={licenseCode}
                  onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO-REFRIGERACAO-30"
                  className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition uppercase"
                  disabled={isRedeeming}
                />
              </div>
              <button
                type="submit"
                disabled={isRedeeming}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <Gift size={14} />
                    <span>Resgatar</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Recursos incluídos no Plano Pró */}
        <div className="space-y-2.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 relative z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            O que você libera no Plano Pró:
          </span>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span><strong>Ordens de Serviço Ilimitadas</strong> com logotipo e QR Code PMOC</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span><strong>Diagnósticos de Erros com IA Ilimitados</strong> para todas as marcas</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span><strong>Agente de Vendas com Leitura de Agenda</strong> e Proposta no WhatsApp</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span><strong>Chave PIX e Pacotes de Higienização</strong> inclusos no orçamento</span>
            </div>
          </div>
        </div>

        {/* Oferta / Valor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 border border-amber-500/30 p-4 rounded-2xl relative z-10">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Plano Pró Mensal:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-400 font-mono">R$ 39,90</span>
              <span className="text-xs text-slate-400">/ mês</span>
            </div>
          </div>

          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1%21%20Gostaria%20de%20fazer%20o%20upgrade%20para%20o%20Plano%20Pr%C3%B3%20do%20Amigo%20Refrigerista."
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer shrink-0"
          >
            <span>Assinar Plano Pró</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
