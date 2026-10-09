'use client';

import React, { useState, useEffect } from 'react';
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
  Check
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
  description = 'Escolha entre o Plano Flex ou Plano Pró, selecione pagamento no Cartão de Crédito ou PIX, ou resgate um voucher promocional.',
  onRedeemSuccess
}: UpgradeModalProps) {
  const { user, profile, isAdmin } = useAuth();
  const [licenseCode, setLicenseCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedSuccessMessage, setRedeemedSuccessMessage] = useState<string | null>(null);

  // Estados de Escolha do Plano (Flex ou Pró) e Método de Pagamento (Cartão de Crédito ou PIX)
  const [selectedPlan, setSelectedPlan] = useState<'flex' | 'pro'>('pro');
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
          if (data.plans?.flex?.price) setFlexPrice(Number(data.plans.flex.price));
          if (data.plans?.pro?.price) setProPrice(Number(data.plans.pro.price));
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

  const handleStartCheckout = async (targetPlan?: 'flex' | 'pro', targetMethod?: 'credit_card' | 'pix') => {
    const chosenPlan = targetPlan || selectedPlan;
    const chosenMethod = targetMethod || paymentMethod;

    if (!user) {
      toast.error('Faça login na sua conta para assinar um plano.');
      return;
    }

    setSelectedPlan(chosenPlan);
    setPaymentMethod(chosenMethod);
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
          installments,
          billingCycle:
            chosenMethod === 'credit_card' && installments === 1 && creditCardRecurringEnabled
              ? 'recurring'
              : 'single_30d',
          returnUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Não foi possível iniciar o pagamento.');
        return;
      }

      if (data.init_point) {
        toast.success(
          `Redirecionando para o checkout seguro (${chosenPlan === 'flex' ? 'Plano Flex' : 'Plano Pró'})...`
        );
        window.location.href = data.init_point;
        return;
      }

      if (data.pix) {
        setPixResult({
          copy_paste: data.pix.copy_paste,
          qr_code_url: data.pix.qr_code_url,
          amount: Number(data.amount) || (chosenPlan === 'flex' ? flexPrice : proPrice),
          plan: chosenPlan,
          message: data.message,
        });
        toast.success(
          `Pagamento gerado para o ${chosenPlan === 'flex' ? 'Plano Flex' : 'Plano Pró'}!`
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

        {/* PASSO 1: ESCOLHA DO PLANO (FLEX OU PRÓ) */}
        <div className="space-y-2.5 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
              1. Escolha o seu Plano (Flex ou Pró):
            </span>
            <span className="text-[10px] font-mono text-slate-400">Ativação imediata</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opção Plano Flex */}
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
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-2xl font-black text-cyan-400 font-mono">
                    R$ {flexPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-400">/ mês</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Ideal para ferramentas essenciais, cálculo de Superaquecimento/Sub-resfriamento e gestão de OS.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                <span className={selectedPlan === 'flex' ? 'text-cyan-300' : 'text-slate-400'}>
                  {selectedPlan === 'flex' ? '✓ Plano Flex Selecionado' : 'Selecionar Plano Flex'}
                </span>
              </div>
            </div>

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
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    R$ {proPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-400">/ mês</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  IA ilimitada para todas as marcas, PMOC, Leitor OCR de Placas, QR Code e Automação WhatsApp.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold">
                <span className={selectedPlan === 'pro' ? 'text-amber-300' : 'text-slate-400'}>
                  {selectedPlan === 'pro' ? '✓ Plano Pró Selecionado' : 'Selecionar Plano Pró'}
                </span>
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
                    Visa, Mastercard, Elo, Hipercard
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
                    Liberação imediata c/ QR Code
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
                <option value={1}>
                  1x de R$ {(selectedPlan === 'flex' ? flexPrice : proPrice).toFixed(2).replace('.', ',')}{' '}
                  {creditCardRecurringEnabled ? '(Mensal Recorrente)' : '(Ciclo 30 Dias)'}
                </option>
                {maxInstallments >= 2 && (
                  <option value={2}>Até 2x no Cartão de Crédito</option>
                )}
                {maxInstallments >= 3 && (
                  <option value={3}>Até 3x no Cartão de Crédito</option>
                )}
                {maxInstallments >= 6 && (
                  <option value={6}>Até 6x no Cartão de Crédito</option>
                )}
                {maxInstallments >= 12 && (
                  <option value={12}>Até 12x no Cartão de Crédito</option>
                )}
              </select>
            </div>
          )}

          {/* Botão Principal de Pagamento */}
          <button
            type="button"
            disabled={isProcessingCheckout}
            onClick={() => handleStartCheckout(selectedPlan, paymentMethod)}
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
                  Assinar {selectedPlan === 'flex' ? 'Plano Flex' : 'Plano Pró'} no{' '}
                  {paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'PIX'} — R${' '}
                  {(selectedPlan === 'flex' ? flexPrice : proPrice).toFixed(2).replace('.', ',')}
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
                  {pixResult.plan === 'flex' ? 'Plano Flex VIP' : 'Plano Amigo PRO'}
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
