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
  Loader2,
  Globe,
  CreditCard,
  Copy
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
  title = 'Evolua o seu Plano no Amigo Refrigerista',
  description = 'Compare os planos disponíveis, ative um código promocional ou faça o upgrade imediato para destravar todas as ferramentas profissionais.',
  onRedeemSuccess
}: UpgradeModalProps) {
  const { user, profile, isAdmin } = useAuth();
  const [licenseCode, setLicenseCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedSuccessMessage, setRedeemedSuccessMessage] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'mercadopago' | 'stripe'>('mercadopago');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'BRL'>('USD');
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<'flex' | 'pro' | null>(null);
  const [pixFallbackData, setPixFallbackData] = useState<{
    copy_paste: string;
    qr_code_url: string;
    amount: number;
    plan: 'flex' | 'pro';
  } | null>(null);

  if (!isOpen) return null;

  const currentPlan = isAdmin ? 'pro' : profile?.subscription?.plan || 'free';
  const currentPlanLabel =
    currentPlan === 'pro' || currentPlan === 'pro_paid'
      ? 'Plano PRO'
      : currentPlan === 'pro_trial'
      ? 'Plano PRO (Trial)'
      : currentPlan === 'flex'
      ? 'Plano Flex'
      : 'Plano Grátis (Free)';

  const handleCheckout = async (planType: 'flex' | 'pro') => {
    if (!user) {
      toast.error('Faça login na sua conta para iniciar a assinatura.');
      return;
    }

    setCheckoutLoadingPlan(planType);
    setPixFallbackData(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('amigo_hmac_session');
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        } else {
          try {
            const { data: { session: sbSession } } = await supabase.auth.getSession();
            if (sbSession?.access_token) {
              headers['Authorization'] = `Bearer ${sbSession.access_token}`;
            }
          } catch {
            // ignore
          }
        }
        if (user.uid) headers['x-amigo-uid'] = user.uid;
        if (user.email) headers['x-amigo-email'] = user.email;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userName: profile?.name || user.displayName || 'Técnico Refrigerista',
          planType,
          billingCycle: 'recurring',
          provider: selectedGateway,
          currency: selectedGateway === 'stripe' ? selectedCurrency : 'BRL',
          returnUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Não foi possível iniciar o checkout no gateway selecionado.');
        return;
      }

      if (data.init_point) {
        toast.success(
          data.provider === 'stripe'
            ? 'Redirecionando para o Checkout Internacional Seguro do Stripe...'
            : 'Redirecionando para o Checkout Seguro...'
        );
        window.location.href = data.init_point;
        return;
      }

      if (data.pix?.copy_paste) {
        setPixFallbackData({
          copy_paste: data.pix.copy_paste,
          qr_code_url: data.pix.qr_code_url,
          amount: data.amount || (planType === 'flex' ? 19.9 : 39.9),
          plan: planType,
        });
        toast.success('QR Code Pix gerado! Copie o código abaixo para concluir.');
      }
    } catch (err: any) {
      toast.error('Erro de conexão ao iniciar o pagamento.');
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

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

        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800 relative z-10">
          <span className="text-xs font-semibold text-slate-400">Seu plano atual:</span>
          <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {currentPlanLabel}
          </span>
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

        {/* Seletor de Gateway de Pagamento: Brasil (Mercado Pago / Pix) vs Internacional (Stripe) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 relative z-10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={13} className="text-indigo-400" />
              Região / Método de Pagamento:
            </span>
            {selectedGateway === 'stripe' && (
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                {(['USD', 'EUR', 'BRL'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                      selectedCurrency === curr
                        ? 'bg-indigo-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedGateway('mercadopago');
                setPixFallbackData(null);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedGateway === 'mercadopago'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard size={14} className={selectedGateway === 'mercadopago' ? 'text-amber-400' : 'text-slate-500'} />
              <span>Brasil (Pix / MP)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedGateway('stripe');
                setPixFallbackData(null);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedGateway === 'stripe'
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe size={14} className={selectedGateway === 'stripe' ? 'text-indigo-400' : 'text-slate-500'} />
              <span>Stripe Internacional</span>
            </button>
          </div>
        </div>

        {/* Oferta / Valor: Plano Flex e Plano Pró */}
        <div className="space-y-3 relative z-10">
          {currentPlan === 'free' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/50 via-slate-950 to-slate-950 border border-cyan-500/30 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-cyan-300 uppercase block">Plano Flex VIP Mensal:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-cyan-400 font-mono">
                    {selectedGateway === 'stripe'
                      ? `${selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'BRL' ? 'R$' : '$'} 19.90`
                      : 'R$ 19,90'}
                  </span>
                  <span className="text-xs text-slate-400">/ mês</span>
                </div>
                <span className="text-[11px] text-slate-400">Ideal para ferramentas essenciais e gestão de OS</span>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout('flex')}
                disabled={checkoutLoadingPlan !== null}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {checkoutLoadingPlan === 'flex' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedGateway === 'stripe' ? 'Assinar com Stripe' : 'Assinar Plano Flex'}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 border border-amber-500/30 p-4 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase block">Plano Pró Completo (Recomendado):</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {selectedGateway === 'stripe'
                    ? `${selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'BRL' ? 'R$' : '$'} 39.90`
                    : 'R$ 39,90'}
                </span>
                <span className="text-xs text-slate-400">/ mês</span>
              </div>
              <span className="text-[11px] text-slate-400">IA ilimitada, PMOC, Leitor OCR e Automação WhatsApp</span>
            </div>

            <button
              type="button"
              onClick={() => handleCheckout('pro')}
              disabled={checkoutLoadingPlan !== null}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer shrink-0 disabled:opacity-50"
            >
              {checkoutLoadingPlan === 'pro' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>
                    {selectedGateway === 'stripe' ? 'Assinar PRO (Stripe)' : 'Assinar Plano Pró'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {pixFallbackData && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase">
                  Pagamento Instantâneo via PIX (R$ {pixFallbackData.amount.toFixed(2).replace('.', ',')})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ciclo 30 Dias</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Copie o código Pix Copia e Cola abaixo e pague no aplicativo do seu banco:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixFallbackData.copy_paste}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixFallbackData.copy_paste);
                    toast.success('Código PIX copiado para a área de transferência!');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Copy size={14} />
                  <span>Copiar PIX</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
