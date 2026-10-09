'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Settings, 
  MessageSquare, 
  ShieldCheck, 
  Save, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldAlert,
  Shield
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const MASTER_EMAIL = 'amigorefrigerista@gmail.com';

export default function AdminSettingsPage() {
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<'all' | 'payments' | 'automation' | 'whatsapp' | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Estados de Login de Fallback
  const [adminEmailInput, setAdminEmailInput] = useState('amigorefrigerista@gmail.com');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [form, setForm] = useState({
    payment_provider: 'mercadopago',
    mercadopago_access_token: '',
    mercadopago_public_key: '',
    webhook_secret: '',
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
    stripe_currency: 'USD',
    pro_plan_price: 39.90,
    flex_plan_price: 19.90,
    maintenance_interval_months: 6,
    free_trial_days: 7,
    whatsapp_api_url: '',
    whatsapp_api_key: '',
    whatsapp_instance_name: ''
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const headers: Record<string, string> = {};
        if (typeof window !== 'undefined') {
          // 1. Prioriza o sessionToken HMAC emitido pelo servidor
          const sessionToken = sessionStorage.getItem('amigo_hmac_session');
          if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
          } else {
            // 2. Se não houver sessionToken HMAC, tenta o token JWT do Supabase
            try {
              const { data: { session: sbSession } } = await supabase.auth.getSession();
              if (sbSession?.access_token) {
                headers['Authorization'] = `Bearer ${sbSession.access_token}`;
              }
            } catch {
              // ignore
            }
          }
          if (user?.id) headers['x-amigo-uid'] = user.id;
          if (user?.email) headers['x-amigo-email'] = user.email;
        }
        const res = await fetch('/api/admin/settings', {
          method: 'GET',
          headers,
          credentials: 'same-origin',
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && json.settings) {
            const data = json.settings;
            setForm((prev) => ({
              ...prev,
              ...data,
              pro_plan_price: data.pro_plan_price ? Number(data.pro_plan_price) : prev.pro_plan_price,
              flex_plan_price: data.flex_plan_price ? Number(data.flex_plan_price) : prev.flex_plan_price,
              maintenance_interval_months: data.maintenance_interval_months
                ? Number(data.maintenance_interval_months)
                : prev.maintenance_interval_months,
              free_trial_days: data.free_trial_days ? Number(data.free_trial_days) : prev.free_trial_days,
            }));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleEmailLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const targetEmail = adminEmailInput.trim() || MASTER_EMAIL;
      const targetPass = adminPassInput || 'admin123';
      const { error } = await signInWithEmail(targetEmail, targetPass);
      if (error) {
        setAuthError(error.message || 'E-mail ou senha incorretos.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLoginAdmin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const { error } = await signInWithGoogle(MASTER_EMAIL, 'Administrador Master');
      if (error) {
        setAuthError(error.message || 'Falha na autenticação Google.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha na autenticação Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const saveSection = async (
    section: 'all' | 'payments' | 'automation' | 'whatsapp',
    payload: Partial<typeof form>,
    successLabel: string
  ) => {
    setSavingSection(section);
    setMessage('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        // 1. Prioriza o sessionToken HMAC emitido pelo servidor
        const sessionToken = sessionStorage.getItem('amigo_hmac_session');
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        } else {
          // 2. Fallback para o access_token da sessão atual do Supabase
          try {
            const { data: { session: sbSession } } = await supabase.auth.getSession();
            if (sbSession?.access_token) {
              headers['Authorization'] = `Bearer ${sbSession.access_token}`;
            }
          } catch {
            // ignore
          }
        }
        if (user?.id) headers['x-amigo-uid'] = user.id;
        if (user?.email) headers['x-amigo-email'] = user.email;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setMessageType('error');
        setMessage(json?.error || `Erro (${res.status}): Não foi possível salvar ${successLabel.toLowerCase()}.`);
      } else {
        setMessageType('success');
        setMessage(`${successLabel} salvas com sucesso no servidor!`);
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || `Erro de conexão ao salvar ${successLabel.toLowerCase()} no servidor.`);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSavePayments = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    await saveSection(
      'payments',
      {
        payment_provider: form.payment_provider,
        pro_plan_price: form.pro_plan_price,
        flex_plan_price: form.flex_plan_price,
        mercadopago_access_token: form.mercadopago_access_token,
        mercadopago_public_key: form.mercadopago_public_key,
        webhook_secret: form.webhook_secret,
        stripe_secret_key: form.stripe_secret_key,
        stripe_publishable_key: form.stripe_publishable_key,
        stripe_webhook_secret: form.stripe_webhook_secret,
        stripe_currency: form.stripe_currency,
      },
      'Configurações de Integração de Pagamentos'
    );
  };

  const handleSaveAutomation = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    await saveSection(
      'automation',
      {
        maintenance_interval_months: form.maintenance_interval_months,
        free_trial_days: form.free_trial_days,
      },
      'Configurações de Automação e Regras de Negócio'
    );
  };

  const handleSaveWhatsApp = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    await saveSection(
      'whatsapp',
      {
        whatsapp_api_url: form.whatsapp_api_url,
        whatsapp_api_key: form.whatsapp_api_key,
        whatsapp_instance_name: form.whatsapp_instance_name,
      },
      'Configurações da API do WhatsApp Master'
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSection('all', form, 'Todas as configurações do Painel Master');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e1c] text-white flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-slate-300 text-sm font-semibold font-mono">
          Carregando painel de configurações...
        </p>
      </div>
    );
  }

  // Verificação de Email Master (Se não for o admin master, exibe login)
  const isMasterUser = user?.email?.toLowerCase().trim() === MASTER_EMAIL;

  if (!isMasterUser) {
    return (
      <div className="min-h-screen bg-[#070e1c] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Acesso ao Painel Master de Configurações
            </h1>
            <p className="text-xs text-slate-400">
              Uso exclusivo do administrador (<strong className="text-amber-300 font-mono">{MASTER_EMAIL}</strong>)
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleEmailLoginAdmin} className="space-y-4">
            <div>
              <label className="text-slate-400 block text-[11px] font-semibold mb-1">E-mail Administrativo:</label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block text-[11px] font-semibold mb-1">Senha Master:</label>
              <input
                type="password"
                placeholder="Digite sua senha de administrador"
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer min-h-[46px]"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Sparkles className="w-4 h-4 text-slate-950" />
              )}
              <span>Acessar Painel Master</span>
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleLoginAdmin}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Entrar com Google ({MASTER_EMAIL})</span>
          </button>

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Aplicativo</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link 
                href="/admin-master" 
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Admin Master</span>
              </Link>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                <CrownIcon />
                Painel Master
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Painel Master: Configurações do Sistema</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Gerencie credenciais de pagamento, preços e automações do app.
            </p>
          </div>
        </div>

        {/* Alerta de Mensagem */}
        {message && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
            messageType === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Bloco 1: Meios de Pagamento */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>💳 Integração de Pagamentos</span>
                </h2>
                <p className="text-xs text-slate-400">Chaves de API do Mercado Pago e valor da assinatura VIP</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Gateway Principal
                </label>
                <select
                  value={form.payment_provider}
                  onChange={(e) => setForm({ ...form, payment_provider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px] cursor-pointer"
                >
                  <option value="mercadopago">Mercado Pago (Pix & Cartão - Brasil)</option>
                  <option value="stripe">Stripe International (USD / EUR / BRL)</option>
                  <option value="asaas">Asaas (Boleto & Pix)</option>
                  <option value="manual">Transferência Pix Direta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Valor da Assinatura VIP (Mensal)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                    {form.payment_provider === 'stripe' ? (form.stripe_currency || 'USD') : 'R$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.pro_plan_price}
                    onChange={(e) => setForm({ ...form, pro_plan_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Valor da Assinatura Flex (Mensal)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                    {form.payment_provider === 'stripe' ? (form.stripe_currency || 'USD') : 'R$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.flex_plan_price}
                    onChange={(e) => setForm({ ...form, flex_plan_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Moeda Internacional (Stripe Currency)
                </label>
                <select
                  value={form.stripe_currency || 'USD'}
                  onChange={(e) => setForm({ ...form, stripe_currency: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px] cursor-pointer"
                >
                  <option value="USD">USD ($) - Dólar Americano</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - Libra Esterlina</option>
                  <option value="BRL">BRL (R$) - Real Brasileiro</option>
                </select>
              </div>
            </div>

            {/* Credenciais Mercado Pago */}
            <div className="space-y-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Credenciais Mercado Pago (Brasil - Pix & Cartão)
                </span>
                {form.payment_provider === 'mercadopago' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    Ativo como Principal
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Mercado Pago Access Token (Privado)
                </label>
                <input
                  type="password"
                  placeholder="APP_USR-..."
                  value={form.mercadopago_access_token}
                  onChange={(e) => setForm({ ...form, mercadopago_access_token: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Public Key Mercado Pago (Pública)
                  </label>
                  <input
                    type="text"
                    placeholder="APP_USR-..."
                    value={form.mercadopago_public_key}
                    onChange={(e) => setForm({ ...form, mercadopago_public_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Segredo do Webhook Mercado Pago (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Segredo de validação do webhook MP"
                    value={form.webhook_secret}
                    onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Credenciais Stripe International */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  🌍 Credenciais Stripe International (Pagamentos Globais)
                </span>
                {form.payment_provider === 'stripe' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                    Ativo como Principal
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Stripe Secret Key (Chave Privada `sk_live_...` ou `sk_test_...`)
                </label>
                <input
                  type="password"
                  placeholder="sk_live_... ou sk_test_..."
                  value={form.stripe_secret_key}
                  onChange={(e) => setForm({ ...form, stripe_secret_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Stripe Publishable Key (`pk_live_...` ou `pk_test_...`)
                  </label>
                  <input
                    type="text"
                    placeholder="pk_live_... ou pk_test_..."
                    value={form.stripe_publishable_key}
                    onChange={(e) => setForm({ ...form, stripe_publishable_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Stripe Webhook Signing Secret (`whsec_...`)
                  </label>
                  <input
                    type="password"
                    placeholder="whsec_..."
                    value={form.stripe_webhook_secret}
                    onChange={(e) => setForm({ ...form, stripe_webhook_secret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Webhook URL para configurar no Dashboard do Stripe: <strong className="text-slate-300">/api/webhooks/stripe</strong> (eventos: <code className="text-indigo-300">checkout.session.completed</code>, <code className="text-indigo-300">invoice.payment_succeeded</code>, <code className="text-indigo-300">customer.subscription.deleted</code>)
              </p>
            </div>

            {/* Botão de Salvar Exclusivo: Pagamentos */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSavePayments}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer disabled:opacity-50 min-h-[44px] active:scale-98"
              >
                {savingSection === 'payments' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Salvando Pagamentos...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Salvar Integração de Pagamentos</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bloco 2: Regras e Prazos do Sistema */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <Settings size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚙️ Automação e Regras de Negócio</span>
                </h2>
                <p className="text-xs text-slate-400">Prazos padrão de preventivas e período de degustação trial</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Intervalo de Manutenção Preventiva (Meses)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="24"
                  value={form.maintenance_interval_months}
                  onChange={(e) => setForm({ ...form, maintenance_interval_months: parseInt(e.target.value) || 6 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[44px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Padrão em meses para agendamento automático após conclusão do serviço.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Dias de Teste Grátis (Trial)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="90"
                  value={form.free_trial_days}
                  onChange={(e) => setForm({ ...form, free_trial_days: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[44px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dias de degustação das funções VIP para novos cadastros.
                </p>
              </div>
            </div>

            {/* Botão de Salvar Exclusivo: Automação e Regras */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAutomation}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.25)] cursor-pointer disabled:opacity-50 min-h-[44px] active:scale-98"
              >
                {savingSection === 'automation' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Salvando Regras...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Salvar Automação e Regras de Negócio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bloco 3: Disparo de WhatsApp do Sistema */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <MessageSquare size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>💬 API do WhatsApp Master (Sistema)</span>
                </h2>
                <p className="text-xs text-slate-400">Integração com Evolution API ou Z-API para alertas de cobrança</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  URL do Servidor de WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="https://api.seu-whatsapp.com"
                  value={form.whatsapp_api_url}
                  onChange={(e) => setForm({ ...form, whatsapp_api_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Chave Global da API
                </label>
                <input
                  type="password"
                  placeholder="Chave secreta de autenticação do servidor"
                  value={form.whatsapp_api_key}
                  onChange={(e) => setForm({ ...form, whatsapp_api_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nome da Instância Master
                </label>
                <input
                  type="text"
                  placeholder="Ex: amigo_master_bot"
                  value={form.whatsapp_instance_name}
                  onChange={(e) => setForm({ ...form, whatsapp_instance_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                />
              </div>
            </div>

            {/* Botão de Salvar Exclusivo: WhatsApp Master */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveWhatsApp}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50 min-h-[44px] active:scale-98"
              >
                {savingSection === 'whatsapp' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Salvando WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Salvar API do WhatsApp Master</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botão de Salvar Geral */}
          <button
            type="submit"
            disabled={savingSection !== null}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-700 text-slate-200 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 min-h-[50px] active:scale-98"
          >
            {savingSection === 'all' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                <span>Salvando Todas as Configurações...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 text-amber-400" />
                <span>Salvar Todas as Configurações de Uma Vez</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function CrownIcon() {
  return (
    <svg className="w-3 h-3 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
    </svg>
  );
}
