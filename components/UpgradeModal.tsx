'use client';

import React, { useState, useEffect } from 'react';
import {
  ANNUAL_PRICE_FACTOR,
  SHOW_FLEX_PLAN,
  normalizeProPlanPrice,
  normalizeFlexPlanPrice,
} from '@/lib/pricing';
import { 
  Zap, 
  CheckCircle2, 
  Crown, 
  Sparkles, 
  X, 
  ArrowRight, 
  Gift, 
  KeyRound, 
  Loader2,
  CreditCard,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  CalendarCheck,
  BadgePercent
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
  description = 'Escolha entre o Plano Flex ou Plano Pró, selecione entre o plano recorrente ou plano anual (com 2 meses grátis) e pague via Cartão de Crédito ou PIX.',
  onRedeemSuccess
}: UpgradeModalProps) {
  const { user, profile, isAdmin } = useAuth();
  const [licenseCode, setLicenseCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedSuccessMessage, setRedeemedSuccessMessage] = useState<string | null>(null);

  // Estados de Escolha do Plano (Flex ou Pró), Modalidade (Recorrente ou Anual com 5% de desconto) e Método (Cartão ou PIX)
  const [selectedPlan, setSelectedPlan] = useState<'flex' | 'pro'>('pro');
  const [billingInterval, setBillingInterval] = useState<'recurring' | 'annual'>('recurring');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [installments, setInstallments] = useState<number>(1);
  const [maxInstallments, setMaxInstallments] = useState<number>(12);
  const [creditCardEnabled, setCreditCardEnabled] = useState<boolean>(true);
  const [creditCardRecurringEnabled, setCreditCardRecurringEnabled] = useState<boolean>(true);
  const [pixEnabled, setPixEnabled] = useState<boolean>(true);
  const [flexPrice, setFlexPrice] = useState<number>(19.9);
  const [proPrice, setProPrice] = useState<number>(39.9);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [pixResult, setPixResult] = useState<{
    copy_paste: string;
    qr_code_url: string;
    amount: number;
    plan: 'flex' | 'pro';
    message?: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPixResult(null);
    fetch('/api/checkout')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          if (data.plans?.flex?.price) setFlexPrice(normalizeFlexPlanPrice(data.plans.flex.price));
          if (data.plans?.pro?.price) setProPrice(normalizeProPlanPrice(data.plans.pro.price));
          if (data.paymentConfig) {
            const ccEnabled = data.paymentConfig.creditCardEnabled ?? true;
            const ccRecurring = data.paymentConfig.creditCardRecurringEnabled ?? true;
            const pxEnabled = data.paymentConfig.pixEnabled ?? true;
            setCreditCardEnabled(ccEnabled);
            setCreditCardRecurringEnabled(ccRecurring);
            setPixEnabled(pxEnabled);
            setMaxInstallments(Number(data.paymentConfig.creditCardMaxInstallments) || 12);
            if (!ccEnabled && pxEnabled) {
              setPaymentMethod('pix');
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

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

  const isAnnual = billingInterval === 'annual';

  // Cálculos do Plano Flex
  const flexMonthly = flexPrice;
  const flexAnnualOriginal = Math.round(flexMonthly * 12 * 100) / 100;
  const flexAnnualPrice = Math.round(flexAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100; // 2 meses grátis (paga 10, usa 12)
  const flexAnnualSavings = Math.round((flexAnnualOriginal - flexAnnualPrice) * 100) / 100;
  const flexAnnualMonthlyEquiv = Math.round((flexAnnualPrice / 12) * 100) / 100;

  // Cálculos do Plano Pró
  const proMonthly = proPrice;
  const proAnnualOriginal = Math.round(proMonthly * 12 * 100) / 100;
  const proAnnualPrice = Math.round(proAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100; // 2 meses grátis (paga 10, usa 12)
  const proAnnualSavings = Math.round((proAnnualOriginal - proAnnualPrice) * 100) / 100;
  const proAnnualMonthlyEquiv = Math.round((proAnnualPrice / 12) * 100) / 100;

  // Preço e valores do plano atualmente selecionado
  const currentFinalAmount = isAnnual
    ? (selectedPlan === 'flex' ? flexAnnualPrice : proAnnualPrice)
    : (selectedPlan === 'flex' ? flexMonthly : proMonthly);

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

  const handleStartCheckout = async (
    targetPlan?: 'flex' | 'pro',
    targetMethod?: 'credit_card' | 'pix',
    targetInterval?: 'recurring' | 'annual'
  ) => {
    const chosenPlan = targetPlan || selectedPlan;
    const chosenMethod = targetMethod || paymentMethod;
    const chosenInterval = targetInterval || billingInterval;
    const isChosenAnnual = chosenInterval === 'annual';

    if (!user) {
      toast.error('Faça login na sua conta para assinar um plano.');
      return;
    }

    setSelectedPlan(chosenPlan);
    setPaymentMethod(chosenMethod);
    setBillingInterval(chosenInterval);
    setIsProcessingCheckout(true);
    setPixResult(null);

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
          } catch {}
        }
        if (user.uid) headers['x-amigo-uid'] = user.uid;
        if (user.email) headers['x-amigo-email'] = user.email;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userName: profile?.name || user.displayName || 'Técnico Refrigerista',
          planType: chosenPlan,
          paymentMethod: chosenMethod,
          billingInterval: isChosenAnnual ? 'annual' : 'monthly',
          billingCycle: isChosenAnnual
            ? 'annual'
            : chosenMethod === 'credit_card' && installments === 1 && creditCardRecurringEnabled
            ? 'recurring'
            : 'single_30d',
          installments: isChosenAnnual ? installments : (chosenMethod === 'credit_card' ? installments : 1),
          returnUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível iniciar o pagamento.');
        return;
      }

      const chosenPlanLabel = chosenPlan === 'flex' ? 'Plano Flex' : 'Plano Pró';
      const chosenIntervalLabel = isChosenAnnual ? 'Anual c/ 2 meses grátis' : 'Recorrente';

      if (data.init_point) {
        toast.success(
          `Redirecionando para o checkout seguro (${chosenPlanLabel} - ${chosenIntervalLabel})...`
        );
        window.location.href = data.init_point;
        return;
      }

      if (data.pix) {
        setPixResult({
          copy_paste: data.pix.copy_paste,
          qr_code_url: data.pix.qr_code_url,
          amount: Number(data.amount) || currentFinalAmount,
          plan: chosenPlan,
          message: data.message,
        });
        toast.success(
          `Pagamento gerado para o ${chosenPlanLabel} (${chosenIntervalLabel})!`
        );
      }
    } catch (err: any) {
      toast.error('Erro ao conectar com o gateway de pagamentos.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow de Fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Crown size={26} />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest inline-flex items-center gap-1">
                <Sparkles size={10} />
                Integração de Pagamentos & Planos
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

        {/* ESCOLHA DA MODALIDADE: PLANO RECORRENTE OU PLANO ANUAL (5% DE DESCONTO) */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <BadgePercent size={14} className="text-emerald-400" />
              Modalidade de Faturamento:
            </span>
            <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-400 animate-pulse" />
              2 meses grátis no Plano Anual
            </span>
          </div>

          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 gap-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setBillingInterval('recurring');
                setPixResult(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                !isAnnual
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <RefreshCw size={13} className={!isAnnual ? 'text-slate-950' : 'text-slate-400'} />
              <span>Plano Recorrente</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBillingInterval('annual');
                setPixResult(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden ${
                isAnnual
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CalendarCheck size={14} />
              <span>Plano Anual</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                isAnnual ? 'bg-slate-950 text-emerald-300 border border-emerald-400/30' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                2 meses grátis
              </span>
            </button>
          </div>
        </div>

        {/* PASSO 1: ESCOLHA DO PLANO (FLEX OU PRÓ) */}
        <div className="space-y-2.5 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
              1. Escolha o seu Plano (Flex ou Pró):
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isAnnual ? 'Acesso total por 12 meses (365 dias)' : 'Cobrança mensal renovável'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opção Plano Flex */}
            {SHOW_FLEX_PLAN && (

            <div
              onClick={() => setSelectedPlan('flex')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                selectedPlan === 'flex'
                  ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Zap size={11} />
                    Plano Flex VIP
                  </span>
                  <input
                    type="radio"
                    name="upgrade_plan_choice"
                    checked={selectedPlan === 'flex'}
                    onChange={() => setSelectedPlan('flex')}
                    className="w-4 h-4 text-cyan-400 bg-slate-900 border-slate-700"
                  />
                </div>
                {isAnnual ? (
                  <div className="pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-cyan-400 font-mono">
                        R$ {flexAnnualPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ ano</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 line-through">
                        R$ {flexAnnualOriginal.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                        R$ {flexMonthly.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Plano recorrente mensal sem fidelidade
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-slate-300 leading-snug">
                  Ideal para ferramentas essenciais, cálculo de Superaquecimento/Sub-resfriamento e gestão de OS.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                <span className={selectedPlan === 'flex' ? 'text-cyan-300' : 'text-slate-400'}>
                  {selectedPlan === 'flex' ? '✓ Plano Flex Selecionado' : 'Selecionar Plano Flex'}
                </span>
                {isAnnual && (
                  <span className="text-emerald-400 font-mono">12 meses liberados</span>
                )}
              </div>
            </div>
            )}

            {/* Opção Plano Pró */}
            <div
              onClick={() => setSelectedPlan('pro')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                selectedPlan === 'pro'
                  ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown size={11} />
                    Plano Pró (Completo)
                  </span>
                  <input
                    type="radio"
                    name="upgrade_plan_choice"
                    checked={selectedPlan === 'pro'}
                    onChange={() => setSelectedPlan('pro')}
                    className="w-4 h-4 text-amber-400 bg-slate-900 border-slate-700"
                  />
                </div>
                {isAnnual ? (
                  <div className="pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        R$ {proAnnualPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ ano</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 line-through">
                        R$ {proAnnualOriginal.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                        R$ {proMonthly.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Plano recorrente mensal sem fidelidade
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-slate-300 leading-snug">
                  IA ilimitada para todas as marcas, PMOC, Leitor OCR de Placas, QR Code e Automação WhatsApp.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                <span className={selectedPlan === 'pro' ? 'text-amber-300' : 'text-slate-400'}>
                  {selectedPlan === 'pro' ? '✓ Plano Pró Selecionado' : 'Selecionar Plano Pró'}
                </span>
                {isAnnual && (
                  <span className="text-emerald-400 font-mono">12 meses liberados</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PASSO 2: OPÇÃO DE PAGAMENTO NO CARTÃO DE CRÉDITO OU PIX */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3.5 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
              2. Forma de Pagamento (Cartão de Crédito ou PIX):
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Ambiente 100% Seguro</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {creditCardEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  paymentMethod === 'credit_card'
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${paymentMethod === 'credit_card' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <span className="text-xs font-black block">Cartão de Crédito</span>
                  <span className="text-[10px] text-slate-400 block">
                    {isAnnual ? 'À vista ou parcelado em até 12x' : 'Visa, Mastercard, Elo, Hipercard'}
                  </span>
                </div>
              </button>
            )}

            {pixEnabled && (
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${paymentMethod === 'pix' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <QrCode size={18} />
                </div>
                <div>
                  <span className="text-xs font-black block">PIX Instantâneo</span>
                  <span className="text-[10px] text-slate-400 block">
                    {isAnnual ? 'Liberação anual imediata c/ 2 meses grátis' : 'Liberação imediata c/ QR Code'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {paymentMethod === 'credit_card' && creditCardEnabled && (
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <label className="text-slate-300 font-semibold">
                Opções do Cartão de Crédito:
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value) || 1)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {isAnnual ? (
                  <>
                    <option value={1}>
                      1x de R$ {currentFinalAmount.toFixed(2).replace('.', ',')} à vista (2 meses grátis)
                    </option>
                    {maxInstallments >= 2 && (
                      <option value={2}>
                        2x de R$ {(currentFinalAmount / 2).toFixed(2).replace('.', ',')} sem acréscimo
                      </option>
                    )}
                    {maxInstallments >= 3 && (
                      <option value={3}>
                        3x de R$ {(currentFinalAmount / 3).toFixed(2).replace('.', ',')} sem acréscimo
                      </option>
                    )}
                    {maxInstallments >= 6 && (
                      <option value={6}>
                        6x de R$ {(currentFinalAmount / 6).toFixed(2).replace('.', ',')} sem acréscimo
                      </option>
                    )}
                    {maxInstallments >= 12 && (
                      <option value={12}>
                        12x de R$ {(currentFinalAmount / 12).toFixed(2).replace('.', ',')} (Equivalente mensal c/ 2 meses grátis)
                      </option>
                    )}
                  </>
                ) : (
                  <>
                    <option value={1}>
                      1x de R$ {currentFinalAmount.toFixed(2).replace('.', ',')}{' '}
                      {creditCardRecurringEnabled ? '(Mensal Recorrente Automático)' : '(Ciclo 30 Dias)'}
                    </option>
                    {maxInstallments >= 2 && (
                      <option value={2}>Até 2x no Cartão de Crédito</option>
                    )}
                    {maxInstallments >= 3 && (
                      <option value={3}>Até 3x no Cartão de Crédito</option>
                    )}
                    {maxInstallments >= 12 && (
                      <option value={12}>Até 12x no Cartão de Crédito</option>
                    )}
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Resumo da Cobrança e Aplicação do Desconto */}
          <div className={`p-3.5 rounded-2xl border space-y-2 text-xs relative overflow-hidden transition-all duration-300 ${
            isAnnual
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                {isAnnual ? <CalendarCheck size={14} className="text-emerald-400" /> : <RefreshCw size={13} className="text-amber-400" />}
                <span>Resumo da Cobrança ({isAnnual ? 'Plano Anual' : 'Plano Recorrente'}):</span>
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isAnnual
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {isAnnual ? '2 Meses Grátis Aplicados' : 'Mensal Sem Fidelidade'}
              </span>
            </div>

            {isAnnual ? (
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal 12 meses (12x de R$ {(selectedPlan === 'flex' ? flexMonthly : proMonthly).toFixed(2).replace('.', ',')}):</span>
                  <span className="font-mono line-through">
                    R$ {(selectedPlan === 'flex' ? flexAnnualOriginal : proAnnualOriginal).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <BadgePercent size={13} />
                    Desconto Anual (2 meses grátis):
                  </span>
                  <span className="font-mono">
                    - R$ {(selectedPlan === 'flex' ? flexAnnualSavings : proAnnualSavings).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block uppercase">Total a Pagar (12 Meses):</span>
                    <span className="text-[10px] font-bold text-emerald-300">
                      Equivalente a apenas R$ {(selectedPlan === 'flex' ? flexAnnualMonthlyEquiv : proAnnualMonthlyEquiv).toFixed(2).replace('.', ',')}/mês
                    </span>
                  </div>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    R$ {currentFinalAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Período de Renovação:</span>
                  <span className="text-slate-300">A cada 30 dias</span>
                </div>
                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-white block uppercase">Valor por Mês:</span>
                    <span className="text-[10px] text-slate-400">Cancele quando quiser</span>
                  </div>
                  <span className="text-lg font-black font-mono text-amber-400">
                    R$ {currentFinalAmount.toFixed(2).replace('.', ',')}/mês
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Botão Principal de Pagamento */}
          <button
            type="button"
            disabled={isProcessingCheckout}
            onClick={() => handleStartCheckout(selectedPlan, paymentMethod, billingInterval)}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 ${
              selectedPlan === 'flex'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 shadow-cyan-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25'
            }`}
          >
            {isProcessingCheckout ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Iniciando Pagamento Seguro...</span>
              </>
            ) : (
              <>
                {paymentMethod === 'credit_card' ? <CreditCard size={16} /> : <QrCode size={16} />}
                <span>
                  {isAnnual
                    ? `Assinar ${selectedPlan === 'flex' ? 'Plano Flex Anual' : 'Plano Pró Anual'} (2 meses grátis) — R$ ${currentFinalAmount.toFixed(2).replace('.', ',')}`
                    : `Assinar ${selectedPlan === 'flex' ? 'Plano Flex Recorrente' : 'Plano Pró Recorrente'} — R$ ${currentFinalAmount.toFixed(2).replace('.', ',')}/mês`}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Exibição do QR Code PIX quando gerado */}
          {pixResult && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3 text-center animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400">
                  {pixResult.plan === 'flex' ? 'Plano Flex VIP' : 'Plano Amigo PRO'} {isAnnual ? '(Anual 2 meses grátis)' : '(Recorrente)'}
                </span>
                <span className="font-mono font-black text-white">
                  R$ {pixResult.amount.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {pixResult.message && (
                <p className="text-[11px] text-amber-300 text-left leading-relaxed">
                  {pixResult.message}
                </p>
              )}

              {pixResult.qr_code_url && (
                <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pixResult.qr_code_url}
                    alt="QR Code PIX"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Código PIX Copia e Cola:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixResult.copy_paste}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixResult.copy_paste);
                      setCopiedPix(true);
                      toast.success('Código PIX copiado!');
                      setTimeout(() => setCopiedPix(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPix ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recursos incluídos no Plano Selecionado */}
        <div className="space-y-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 relative z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {selectedPlan === 'flex'
              ? 'O que você libera no Plano Flex VIP:'
              : 'O que você libera no Plano Pró Completo:'}
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span><strong>Ordens de Serviço Profissionais</strong> com Assinatura Digital e PDF</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span><strong>Calculadora de Superaquecimento, Sub-resfriamento</strong> e Carga Térmica</span>
            </div>
            {selectedPlan === 'pro' && (
              <>
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span><strong>Diagnósticos de Erros com IA Ilimitados</strong> e Leitor OCR de Placas</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span><strong>QR Code PMOC Exclusivo</strong> e Automação de Preventivas no WhatsApp</span>
                </div>
              </>
            )}
          </div>
        </div>

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
      </div>
    </div>
  );
}

export default UpgradeModal;
