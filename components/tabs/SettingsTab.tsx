'use client';

import { ANNUAL_PRICE_FACTOR, SHOW_FLEX_PLAN, SHOW_SMTP_SETTINGS } from '@/lib/pricing';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw, 
  Server, 
  Building2, 
  Crown, 
  HelpCircle, 
  Phone, 
  FileText, 
  Lock, 
  Sparkles,
  QrCode,
  Gift,
  RefreshCw,
  History,
  Clock,
  Inbox,
  Trash2,
  Check,
  Shield,
  LogOut,
  CreditCard,
  Zap,
  ArrowRight,
  Copy,
  Loader2,
  CalendarCheck,
  BadgePercent
} from 'lucide-react';
import { toast } from 'sonner';
import { SmtpConfig, SmtpEmailLog, testSmtpConnectionAction } from '@/app/actions/smtpActions';
import { useAuth } from '@/hooks/useAuth';
import AdminSettingsPage from '@/app/admin/configuracoes/page';

export interface CompanySettings {
  companyName: string;
  document: string; // CNPJ / CPF
  phone: string;
  email: string;
  address: string;
  pixKey: string;
  city: string;
}

const INITIAL_DEMO_LOGS: SmtpEmailLog[] = [];

const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  enabled: false,
  senderName: '',
  senderEmail: '',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: '',
  pass: '',
  sendOnOsCreated: true,
  sendOnOsFinished: true,
  sendReminderEmail: true,
  bccTechnician: true,
};

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  pixKey: '',
  city: '',
};

interface SettingsTabProps {
  onOpenUpgradeModal?: () => void;
  onSwitchToAdminHub?: () => void;
  embeddedInAdmin?: boolean;
}

export default function SettingsTab({
  onOpenUpgradeModal,
  onSwitchToAdminHub,
  embeddedInAdmin = false,
}: SettingsTabProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [unifiedSection, setUnifiedSection] = useState<'company_checkout' | 'admin_master_config'>('company_checkout');
  const isMasterAdmin =
    isAdmin || user?.email?.toLowerCase().trim() === 'amigorefrigerista@gmail.com';

  // Estados de Configuração SMTP
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<SmtpEmailLog[]>([]);

  // Estados de Dados da Empresa
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Estados de Integração de Pagamentos (Plano Flex R$ 19,90/mês ou PRO R$ 39,90/mês + Recorrente / Anual 2 meses grátis + Cartão / PIX)
  const [selectedPlanOption, setSelectedPlanOption] = useState<'flex' | 'pro'>('pro');
  const [billingIntervalOption, setBillingIntervalOption] = useState<'recurring' | 'annual'>('recurring');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [enableCreditCardConfig, setEnableCreditCardConfig] = useState(true);
  const [enableRecurringCreditCard, setEnableRecurringCreditCard] = useState(true);
  const [selectedCardGateway, setSelectedCardGateway] = useState<'stripe' | 'mercadopago'>('stripe');
  const [maxInstallmentsConfig, setMaxInstallmentsConfig] = useState(1);
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardDocument, setCardDocument] = useState('');
  const [planPrices, setPlanPrices] = useState({ flexPrice: 19.9, proPrice: 39.9, provider: 'stripe' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pixCheckoutData, setPixCheckoutData] = useState<{
    qr_code: string;
    qr_code_base64?: string;
    qr_code_url?: string;
    amount: number;
    plan: string;
  } | null>(null);
  const [copiedPixCode, setCopiedPixCode] = useState(false);

  // Carrega configurações públicas de planos e cartão da API
  useEffect(() => {
    fetch('/api/checkout')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          const flexVal = Number(data?.plans?.flex?.price || data?.flex_plan_price || 19.9);
          const proVal = Number(data?.plans?.pro?.price || data?.pro_plan_price || 39.9);
          const providerVal = data?.paymentConfig?.provider || data?.payment_provider || 'stripe';
          setPlanPrices({
            flexPrice: flexVal,
            proPrice: proVal,
            provider: providerVal,
          });
          if (providerVal === 'stripe' || data?.paymentConfig?.creditCardGateway === 'stripe') {
            setSelectedCardGateway('stripe');
          } else if (providerVal === 'mercadopago') {
            setSelectedCardGateway('mercadopago');
          }
          if (data?.paymentConfig?.creditCardEnabled !== undefined) {
            setEnableCreditCardConfig(Boolean(data.paymentConfig.creditCardEnabled));
          } else if (typeof data.enable_credit_card === 'boolean') {
            setEnableCreditCardConfig(data.enable_credit_card);
          }
          if (data?.paymentConfig?.creditCardRecurringEnabled !== undefined) {
            setEnableRecurringCreditCard(Boolean(data.paymentConfig.creditCardRecurringEnabled));
          }
          if (data?.paymentConfig?.creditCardMaxInstallments) {
            setMaxInstallmentsConfig(Number(data.paymentConfig.creditCardMaxInstallments));
          } else if (data.max_installments) {
            setMaxInstallmentsConfig(Number(data.max_installments));
          }
        }
      })
      .catch(() => {});
  }, []);

  const isSettingsAnnual = billingIntervalOption === 'annual';

  const flexAnnualOriginal = Math.round(planPrices.flexPrice * 12 * 100) / 100;
  const flexAnnualPrice = Math.round(flexAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100; // 2 meses grátis (paga 10, usa 12)
  const flexAnnualSavings = Math.round((flexAnnualOriginal - flexAnnualPrice) * 100) / 100;
  const flexAnnualMonthlyEquiv = Math.round((flexAnnualPrice / 12) * 100) / 100;

  const proAnnualOriginal = Math.round(planPrices.proPrice * 12 * 100) / 100;
  const proAnnualPrice = Math.round(proAnnualOriginal * ANNUAL_PRICE_FACTOR * 100) / 100; // 2 meses grátis (paga 10, usa 12)
  const proAnnualSavings = Math.round((proAnnualOriginal - proAnnualPrice) * 100) / 100;
  const proAnnualMonthlyEquiv = Math.round((proAnnualPrice / 12) * 100) / 100;

  const currentFinalPrice = isSettingsAnnual
    ? (selectedPlanOption === 'pro' ? proAnnualPrice : flexAnnualPrice)
    : (selectedPlanOption === 'pro' ? planPrices.proPrice : planPrices.flexPrice);

  const handleTriggerPaymentCheckout = async () => {
    if (!user) {
      toast.error('Faça login para assinar ou alterar seu plano.');
      return;
    }

    setIsProcessingPayment(true);
    setPixCheckoutData(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('amigo_hmac_session');
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        if (user.uid) headers['x-amigo-uid'] = user.uid;
        if (user.email) headers['x-amigo-email'] = user.email;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          userName: cardHolderName.trim() || profile?.name || user.displayName || 'Técnico HVAC',
          planType: selectedPlanOption,
          plan: selectedPlanOption,
          paymentMethod: selectedPaymentMethod,
          billingInterval: isSettingsAnnual ? 'annual' : 'monthly',
          billingCycle: isSettingsAnnual
            ? 'annual'
            : selectedPaymentMethod === 'credit_card' && enableRecurringCreditCard
            ? 'recurring'
            : 'single_30d',
          installments: isSettingsAnnual ? maxInstallmentsConfig : (selectedPaymentMethod === 'credit_card' ? maxInstallmentsConfig : 1),
          provider: selectedPaymentMethod === 'credit_card' ? selectedCardGateway : undefined,
          returnUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar pagamento.');
      }

      const planTitle = selectedPlanOption === 'pro' ? 'Plano PRO' : 'Plano Flex';
      const intervalTitle = isSettingsAnnual ? 'Anual (2 meses grátis)' : 'Recorrente';

      if (data.init_point) {
        toast.success(
          `Redirecionando para pagamento seguro (${planTitle} - ${intervalTitle})...`
        );
        window.location.href = data.init_point;
        return;
      }

      if (data.pix || data.qr_code) {
        const copyPaste = data.pix?.copy_paste || data.qr_code;
        setPixCheckoutData({
          qr_code: copyPaste,
          qr_code_base64: data.qr_code_base64,
          qr_code_url: data.pix?.qr_code_url,
          amount: Number(data.amount || currentFinalPrice),
          plan: selectedPlanOption,
        });
        toast.success(`QR Code PIX gerado para o ${planTitle} (${intervalTitle})!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível iniciar o checkout.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Carregar do localStorage na inicialização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSmtp = localStorage.getItem('amigo_smtp_config');
        if (savedSmtp) {
          setSmtpConfig({ ...DEFAULT_SMTP_CONFIG, ...JSON.parse(savedSmtp) });
        } else if (user?.email) {
          setSmtpConfig(prev => ({
            ...prev,
            senderEmail: user.email || '',
            user: user.email || '',
            senderName: profile?.name || user.displayName || 'Técnico HVAC',
          }));
        }

        const savedCompany = localStorage.getItem('amigo_company_settings');
        if (savedCompany) {
          setCompanySettings({ ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(savedCompany) });
        } else {
          setCompanySettings(prev => ({
            ...prev,
            companyName: profile?.name || user?.displayName || 'Minha Empresa de Climatização',
            email: user?.email || '',
            phone: profile?.telefone || '',
          }));
        }

        const savedLogs = localStorage.getItem('amigo_smtp_email_logs');
        if (savedLogs) {
          const parsed = JSON.parse(savedLogs);
          const realOnly = Array.isArray(parsed)
            ? parsed.filter((l: any) => l?.id && !String(l.id).startsWith('log-demo-'))
            : [];
          setEmailLogs(realOnly);
          if (realOnly.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
            localStorage.setItem('amigo_smtp_email_logs', JSON.stringify(realOnly));
          }
        } else {
          setEmailLogs([]);
        }

        if (user?.email) {
          setTestEmail(user.email);
        }
      } catch (err) {
        console.warn('Erro ao carregar configurações locais:', err);
      }
    }
  }, [user, profile]);

  // Limpar logs
  const handleClearLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amigo_smtp_email_logs');
      setEmailLogs([]);
      toast.success('Histórico de envios de e-mail limpo.');
    }
  };

  // Recarregar logs do storage
  const handleReloadLogs = () => {
    if (typeof window !== 'undefined') {
      const savedLogs = localStorage.getItem('amigo_smtp_email_logs');
      if (savedLogs) {
        setEmailLogs(JSON.parse(savedLogs));
      }
      toast.info('Histórico de envios atualizado.');
    }
  };

  // Presets Rápidos de Provedores de E-mail
  const applyPreset = (preset: 'gmail' | 'outlook' | 'hostinger' | 'locaweb' | 'titan') => {
    switch (preset) {
      case 'gmail':
        setSmtpConfig(prev => ({
          ...prev,
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          enabled: true,
        }));
        toast.info('Preset Gmail aplicado (Porta 465 SSL). Utilize uma "Senha de Aplicativo" do Google.');
        break;
      case 'outlook':
        setSmtpConfig(prev => ({
          ...prev,
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          enabled: true,
        }));
        toast.info('Preset Outlook / Office 365 aplicado (Porta 587 TLS).');
        break;
      case 'hostinger':
        setSmtpConfig(prev => ({
          ...prev,
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          enabled: true,
        }));
        toast.info('Preset Hostinger aplicado (Porta 465 SSL).');
        break;
      case 'locaweb':
        setSmtpConfig(prev => ({
          ...prev,
          host: 'email-ssl.com.br',
          port: 465,
          secure: true,
          enabled: true,
        }));
        toast.info('Preset Locaweb aplicado (Porta 465 SSL).');
        break;
      case 'titan':
        setSmtpConfig(prev => ({
          ...prev,
          host: 'smtp.titan.email',
          port: 465,
          secure: true,
          enabled: true,
        }));
        toast.info('Preset Titan Mail aplicado (Porta 465 SSL).');
        break;
    }
  };

  // Salvar Configurações
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_smtp_config', JSON.stringify(smtpConfig));
        localStorage.setItem('amigo_company_settings', JSON.stringify(companySettings));
      }
      toast.success('Configurações de E-mail SMTP e Empresa salvas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Testar Conexão SMTP
  const handleTestSmtp = async () => {
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass || !smtpConfig.senderEmail) {
      toast.error('Preencha Host, Porta, Usuário, Senha e E-mail de Envio antes de testar.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testSmtpConnectionAction(smtpConfig, testEmail || smtpConfig.senderEmail);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro inesperado ao conectar ao servidor SMTP.'
      });
      toast.error('Falha no teste de conexão.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Unificada para Administrador Master (reúne Ajustes da Empresa + Admin Master + Pagamentos R$ 19,90 e R$ 39,90 em uma única tela) */}
      {isMasterAdmin && !embeddedInAdmin && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/40 border border-amber-500/40 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <Crown size={12} className="text-amber-400" />
                CENTRAL UNIFICADA DE ADMINISTRAÇÃO & PAGAMENTOS
              </span>
              <h3 className="text-sm sm:text-base font-black text-white mt-1">
                Todos os Ajustes, Planos Oficiais (R$ 19,90 e R$ 39,90) e Credenciais Master em Uma Só Página
              </h3>
            </div>
            {onSwitchToAdminHub && (
              <button
                type="button"
                onClick={onSwitchToAdminHub}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
              >
                <Shield size={14} />
                <span>Abrir Painel Geral de Assinantes & Leads</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setUnifiedSection('company_checkout')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border ${
                unifiedSection === 'company_checkout'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Building2 size={15} />
              <span>1. Dados da Empresa & Planos (Flex R$ 19,90 / Pró R$ 39,90)</span>
            </button>

            <button
              type="button"
              onClick={() => setUnifiedSection('admin_master_config')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer border ${
                unifiedSection === 'admin_master_config'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-950 text-amber-300 border-amber-500/30 hover:bg-amber-500/10'
              }`}
            >
              <Crown size={15} />
              <span>2. Configurações Admin Master & Gateways (Mercado Pago / Stripe)</span>
            </button>
          </div>
        </div>
      )}

      {isMasterAdmin && !embeddedInAdmin && unifiedSection === 'admin_master_config' ? (
        <AdminSettingsPage />
      ) : (
        <>
      {/* Cabeçalho da Aba */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
            <Mail size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                AUTOMAÇÃO & COMUNICAÇÃO
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Status: <strong className={smtpConfig.enabled ? 'text-emerald-400' : 'text-amber-400'}>
                  {smtpConfig.enabled ? 'SMTP Ativo' : 'Desativado'}
                </strong>
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">Configurações de E-mail & Empresa</h2>
            <p className="text-xs text-slate-400">
              Configure seu próprio e-mail SMTP para envio de Ordens de Serviço em PDF e Lembretes automáticos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer active:scale-95 shrink-0"
        >
          <Save size={16} />
          <span>Salvar Alterações</span>
        </button>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* 1. SEÇÃO SMTP PERSONALIZADO */}
        {SHOW_SMTP_SETTINGS && (

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server size={18} className="text-sky-400" />
                <span>Servidor de E-mail de Remetente (SMTP)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie e-mails com a sua marca e domínio próprio para passar maior profissionalismo.
              </p>
            </div>

            {/* Switch de Ativação */}
            <label className="flex items-center gap-3 cursor-pointer bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Ativar SMTP Próprio</span>
              <input
                type="checkbox"
                checked={smtpConfig.enabled}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          {/* Presets de Provedores Rápidos */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Configuração Rápida por Provedor:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('gmail')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-slate-300 hover:text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Gmail / Google Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('outlook')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-slate-300 hover:text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Outlook / Office 365</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('hostinger')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-slate-300 hover:text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Hostinger</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('locaweb')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-slate-300 hover:text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Locaweb</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('titan')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs font-bold text-slate-300 hover:text-sky-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Titan Mail</span>
              </button>
            </div>
          </div>

          {/* Grid de Campos SMTP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Nome do Remetente (De Quem):</label>
              <input
                type="text"
                placeholder="Ex: ClimaFrio - Técnico Carlos"
                value={smtpConfig.senderName}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, senderName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">E-mail do Remetente (From):</label>
              <input
                type="email"
                placeholder="exemplo@seudominio.com.br"
                value={smtpConfig.senderEmail}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, senderEmail: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Servidor SMTP (Host):</label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Porta SMTP:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="465"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
                />
                <select
                  value={smtpConfig.secure ? 'ssl' : 'tls'}
                  onChange={(e) => {
                    const isSsl = e.target.value === 'ssl';
                    setSmtpConfig(prev => ({
                      ...prev,
                      secure: isSsl,
                      port: isSsl ? 465 : 587
                    }));
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-xs"
                >
                  <option value="ssl">SSL (465)</option>
                  <option value="tls">TLS / STARTTLS (587)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Usuário de Login SMTP:</label>
              <input
                type="text"
                placeholder="seu-login@email.com"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Senha / Senha de Aplicativo:</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••••"
                  value={smtpConfig.pass}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Dica de Segurança e Senha de App */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <HelpCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-amber-300 font-bold block">Como resolver o Erro 534 (Gmail / Google Workspace):</strong>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  O Google <strong>não permite a senha comum</strong> do e-mail no SMTP por segurança. É necessário utilizar uma <strong>&quot;Senha de Aplicativo&quot; de 16 caracteres</strong> criada na sua Conta do Google com Verificação em 2 etapas ativa.
                </p>
              </div>
            </div>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <span>Gerar Senha de App no Google</span>
            </a>
          </div>

          {/* Opções de Automação de Disparo */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Regras de Envio Automático</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={smtpConfig.sendOnOsCreated}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, sendOnOsCreated: e.target.checked }))}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Enviar e-mail ao abrir Nova OS</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={smtpConfig.sendReminderEmail}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, sendReminderEmail: e.target.checked }))}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Enviar lembretes de preventiva</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={smtpConfig.bccTechnician}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, bccTechnician: e.target.checked }))}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Enviar cópia oculta (Bcc) para mim</span>
              </label>
            </div>
          </div>

          {/* Teste de Conexão SMTP */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Send size={14} className="text-emerald-400" />
              <span>Testar Servidor e Enviar E-mail de Teste</span>
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                placeholder="Digite o e-mail de destino do teste"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTesting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Enviar E-mail de Teste</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                ) : (
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                )}
                <span className="leading-relaxed">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* SEÇÃO: HISTÓRICO DE ENVIOS (ÚLTIMAS 5 ORDENS DE SERVIÇO) */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                  <History size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Histórico de Envios</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono font-bold border border-slate-700">
                      Últimas 5 Ordens de Serviço
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Acompanhe o status de entrega e o e-mail de destinatário das ordens de serviço disparadas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReloadLogs}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="Atualizar lista"
                >
                  <RefreshCw size={12} />
                  <span>Atualizar</span>
                </button>
                {emailLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 text-[11px] font-bold text-slate-400 hover:text-rose-300 transition flex items-center gap-1.5 cursor-pointer"
                    title="Limpar histórico"
                  >
                    <Trash2 size={12} />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lista das Últimas 5 Ordens de Serviço Enviadas */}
            {emailLogs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <Inbox size={28} className="mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Nenhum envio registrado recentemente</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Ao criar uma Ordem de Serviço informando o e-mail do cliente, o comprovante será enviado automaticamente e o registro aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {emailLogs.slice(0, 5).map((log) => {
                  const formattedDate = new Date(log.sentAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={log.id} 
                      className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[11px]">
                            {log.orderNumber}
                          </span>
                          <span className="font-bold text-white truncate">
                            {log.clientName}
                          </span>
                          {log.equipment && (
                            <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                              • {log.equipment}
                            </span>
                          )}
                        </div>

                        {/* E-mail do Destinatário */}
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail size={13} className="text-slate-500 shrink-0" />
                          <span className="text-slate-400 text-[11px]">Destinatário:</span>
                          <span className="font-mono font-bold text-slate-200 text-[11px] truncate select-all bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {log.recipientEmail}
                          </span>
                        </div>

                        {/* Detalhes de Erro caso falhe */}
                        {log.status === 'failed' && log.errorMessage && (
                          <div className="text-[10px] text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                            Erro: {log.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Status e Data */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                          log.status === 'success'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          {log.status === 'success' ? (
                            <>
                              <CheckCircle2 size={11} className="text-emerald-400" />
                              <span>Enviado (Sucesso)</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={11} className="text-rose-400" />
                              <span>Falha no Envio</span>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Clock size={11} className="text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}

        {/* 2. SEÇÃO DADOS DA EMPRESA */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 size={18} className="text-sky-400" />
              <span>Dados da Empresa & Cabeçalho dos Documentos</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estes dados serão impressos automaticamente nas Ordens de Serviço, Laudos PMOC e Recibos em PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Nome da Empresa / Razão Social:</label>
              <input
                type="text"
                placeholder="Ex: Master Clima Ar Condicionado"
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">CNPJ ou CPF:</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={companySettings.document}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, document: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">WhatsApp de Atendimento:</label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={companySettings.phone}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Chave PIX para Cobrança:</label>
              <input
                type="text"
                placeholder="CNPJ, E-mail ou Chave Aleatória"
                value={companySettings.pixKey}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, pixKey: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Cidade / Estado de Atuação:</label>
              <input
                type="text"
                placeholder="São Paulo - SP"
                value={companySettings.city}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, city: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Endereço da Oficina / Base:</label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000"
                value={companySettings.address}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>
        </div>

        {/* 3. SEÇÃO DE INTEGRAÇÃO DE PAGAMENTOS & PLANOS (FLEX OU PRO + CARTÃO DE CRÉDITO) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Integração de Pagamentos & Escolha de Plano</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha entre o <strong>Plano Flex</strong> ou <strong>Plano PRO</strong> e configure o pagamento via <strong>Cartão de Crédito</strong> ou PIX.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 self-start sm:self-center">
              Plano Atual: {profile?.isVip ? 'VIP Vitalício' : profile?.subscription?.plan?.toUpperCase() || 'GRÁTIS'}
            </span>
          </div>

          {/* 3.0 Escolha da Modalidade: Recorrente vs Anual (2 meses grátis) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <BadgePercent size={14} className="text-emerald-400" />
                <span>Modalidade de Faturamento</span>
              </label>
              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                2 meses grátis no Plano Anual
              </span>
            </div>

            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setBillingIntervalOption('recurring');
                  setPixCheckoutData(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  !isSettingsAnnual
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <RefreshCw size={13} className={!isSettingsAnnual ? 'text-slate-950' : 'text-slate-400'} />
                <span>Plano Recorrente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBillingIntervalOption('annual');
                  setPixCheckoutData(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden ${
                  isSettingsAnnual
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarCheck size={14} />
                <span>Plano Anual</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  isSettingsAnnual ? 'bg-slate-950 text-emerald-300 border border-emerald-400/30' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  2 meses grátis
                </span>
              </button>
            </div>
          </div>

          {/* 3.1 Escolha do Plano: Flex vs PRO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                <span>1. Escolha o Plano Desejado (Flex ou PRO)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                Selecionado: <strong className={selectedPlanOption === 'pro' ? 'text-amber-400' : 'text-sky-400'}>
                  {selectedPlanOption === 'pro'
                    ? isSettingsAnnual ? 'Plano PRO Anual (2 meses grátis)' : 'Plano PRO Ilimitado'
                    : isSettingsAnnual ? 'Plano Flex Anual (2 meses grátis)' : 'Plano Flex Intermediário'}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Plano Flex */}
              {SHOW_FLEX_PLAN && (

              <button
                type="button"
                onClick={() => {
                  setSelectedPlanOption('flex');
                  setPixCheckoutData(null);
                }}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative overflow-hidden ${
                  selectedPlanOption === 'flex'
                    ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/25 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Zap size={11} /> PLANO FLEX
                  </span>
                  {selectedPlanOption === 'flex' && (
                    <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 text-[9px] font-black uppercase">
                      SELECIONADO
                    </span>
                  )}
                </div>

                {isSettingsAnnual ? (
                  <div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xs text-slate-400 font-bold">R$</span>
                      <span className="text-2xl font-black text-white font-mono">
                        {flexAnnualPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">/ano</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 line-through">
                        R$ {flexAnnualOriginal.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        2 meses grátis (Poupa R$ {flexAnnualSavings.toFixed(2).replace('.', ',')})
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-sky-300 mt-1">
                      Equivale a R$ {flexAnnualMonthlyEquiv.toFixed(2).replace('.', ',')}/mês
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xs text-slate-400 font-bold">R$</span>
                      <span className="text-2xl font-black text-white font-mono">
                        {planPrices.flexPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">/mês</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Cobrança mensal recorrente sem fidelidade
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Ideal para técnicos em expansão: até 25 clientes, 30 Ordens de Serviço/mês, Superaquecimento e Orçamentos PDF.
                </p>
              </button>
              )}

              {/* Card Plano PRO */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanOption('pro');
                  setPixCheckoutData(null);
                }}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative overflow-hidden ${
                  selectedPlanOption === 'pro'
                    ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/25 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown size={11} /> PLANO PRO
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase">
                    {isSettingsAnnual ? '12 MESES VIP' : 'MAIS COMPLETO'}
                  </span>
                </div>

                {isSettingsAnnual ? (
                  <div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xs text-slate-400 font-bold">R$</span>
                      <span className="text-2xl font-black text-white font-mono">
                        {proAnnualPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">/ano</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 line-through">
                        R$ {proAnnualOriginal.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        2 meses grátis (Poupa R$ {proAnnualSavings.toFixed(2).replace('.', ',')})
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-amber-300 mt-1">
                      Equivale a R$ {proAnnualMonthlyEquiv.toFixed(2).replace('.', ',')}/mês
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xs text-slate-400 font-bold">R$</span>
                      <span className="text-2xl font-black text-white font-mono">
                        {planPrices.proPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold">/mês</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Cobrança mensal recorrente sem fidelidade
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Acesso 100% ilimitado: Clientes e OS sem limites, IA Diagnóstico, Leitor OCR de Placas, PMOC e Lembretes WhatsApp.
                </p>
              </button>
            </div>
          </div>

          {/* 3.2 Configuração para Pagamento no Cartão de Crédito e Escolha de Método */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={15} className="text-indigo-400" />
                  <span>2. Configuração para Pagamento no Cartão de Crédito</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Habilite e configure o pagamento com Cartão de Crédito (Visa, Mastercard, Elo, Hipercard, Amex) ou PIX.
                </p>
              </div>

              {/* Toggle Habilitar Pagamento no Cartão de Crédito */}
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900 px-3.5 py-2 rounded-xl border border-indigo-500/30 shrink-0">
                <span className="text-xs font-bold text-indigo-300">Habilitar Cartão de Crédito</span>
                <input
                  type="checkbox"
                  checked={enableCreditCardConfig}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEnableCreditCardConfig(checked);
                    if (!checked && selectedPaymentMethod === 'credit_card') {
                      setSelectedPaymentMethod('pix');
                    } else if (checked) {
                      setSelectedPaymentMethod('credit_card');
                    }
                  }}
                  className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 bg-slate-950 border-slate-700 cursor-pointer"
                />
              </label>
            </div>

            {/* Abas de Método de Pagamento: Cartão de Crédito vs PIX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!enableCreditCardConfig}
                onClick={() => {
                  setSelectedPaymentMethod('credit_card');
                  setPixCheckoutData(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedPaymentMethod === 'credit_card'
                    ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedPaymentMethod === 'credit_card' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <span className="text-xs font-black block">Cartão de Crédito</span>
                  <span className="text-[10px] text-slate-400 block">
                    Até {maxInstallmentsConfig}x ou assinatura mensal automática
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('pix')}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  selectedPaymentMethod === 'pix'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${selectedPaymentMethod === 'pix' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <QrCode size={18} />
                </div>
                <div>
                  <span className="text-xs font-black block">PIX Instantâneo</span>
                  <span className="text-[10px] text-slate-400 block">
                    QR Code e Copia e Cola com liberação na hora
                  </span>
                </div>
              </button>
            </div>

            {/* Opções de Configuração do Cartão de Crédito */}
            {selectedPaymentMethod === 'credit_card' && enableCreditCardConfig && (
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <CreditCard size={14} />
                    <span>Opções de Pagamento & Recorrência no Cartão de Crédito</span>
                  </span>

                  {/* Toggle Habilitar/Desabilitar Pagamentos Recorrentes por Cartão de Crédito */}
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-500/40">
                    <span className="text-[11px] font-bold text-indigo-200">
                      Pagamentos Recorrentes por Cartão
                    </span>
                    <input
                      type="checkbox"
                      checked={enableRecurringCreditCard}
                      onChange={(e) => setEnableRecurringCreditCard(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                      Gateway do Cartão de Crédito:
                    </label>
                    <select
                      value={selectedCardGateway}
                      onChange={(e) =>
                        setSelectedCardGateway(e.target.value as 'stripe' | 'mercadopago')
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="stripe">Stripe (Nacional & Internacional)</option>
                      <option value="mercadopago">Mercado Pago Pro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                      Nome do Titular do Cartão:
                    </label>
                    <input
                      type="text"
                      placeholder={profile?.name || user?.displayName || 'Nome impresso no cartão'}
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                      CPF / CNPJ do Titular:
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cardDocument}
                      onChange={(e) => setCardDocument(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold text-[11px]">
                      Ciclo / Parcelamento no Cartão:
                    </label>
                    <select
                      value={maxInstallmentsConfig}
                      onChange={(e) => setMaxInstallmentsConfig(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                    >
                      {isSettingsAnnual ? (
                        <>
                          <option value={1}>
                            1x de R$ {currentFinalPrice.toFixed(2).replace('.', ',')} à vista (2 meses grátis no total)
                          </option>
                          <option value={2}>
                            2x de R$ {(currentFinalPrice / 2).toFixed(2).replace('.', ',')} sem acréscimo
                          </option>
                          <option value={3}>
                            3x de R$ {(currentFinalPrice / 3).toFixed(2).replace('.', ',')} sem acréscimo
                          </option>
                          <option value={6}>
                            6x de R$ {(currentFinalPrice / 6).toFixed(2).replace('.', ',')} sem acréscimo
                          </option>
                          <option value={12}>
                            12x de R$ {(currentFinalPrice / 12).toFixed(2).replace('.', ',')} (Equivalente mensal c/ 2 meses grátis)
                          </option>
                        </>
                      ) : (
                        <>
                          <option value={1}>
                            {enableRecurringCreditCard
                              ? 'Assinatura Mensal Recorrente (1x)'
                              : 'Ciclo Avulso 30 Dias (1x sem recorrência)'}
                          </option>
                          <option value={2}>Até 2x no cartão</option>
                          <option value={3}>Até 3x no cartão</option>
                          <option value={6}>Até 6x no cartão</option>
                          <option value={10}>Até 10x no cartão</option>
                          <option value={12}>Até 12x no cartão</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Resultado QR Code PIX se gerado */}
            {pixCheckoutData && selectedPaymentMethod === 'pix' && (
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3 text-center">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400">
                    QR Code PIX — Plano {pixCheckoutData.plan.toUpperCase()} {isSettingsAnnual ? '(Anual 2 meses grátis)' : '(Recorrente)'}
                  </span>
                  <span className="font-mono font-black text-white">
                    R$ {pixCheckoutData.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {(pixCheckoutData.qr_code_base64 || pixCheckoutData.qr_code_url) && (
                  <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                    <img
                      src={
                        pixCheckoutData.qr_code_base64
                          ? `data:image/png;base64,${pixCheckoutData.qr_code_base64}`
                          : pixCheckoutData.qr_code_url
                      }
                      alt="QR Code PIX"
                      className="w-40 h-40 mx-auto"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCheckoutData.qr_code}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixCheckoutData.qr_code);
                      setCopiedPixCode(true);
                      toast.success('Código PIX copiado!');
                      setTimeout(() => setCopiedPixCode(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedPixCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPixCode ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Resumo da Cobrança e Desconto no Checkout */}
            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs relative overflow-hidden transition-all duration-300 ${
              isSettingsAnnual
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  {isSettingsAnnual ? <CalendarCheck size={14} className="text-emerald-400" /> : <RefreshCw size={13} className="text-amber-400" />}
                  <span>Resumo do Faturamento ({isSettingsAnnual ? 'Plano Anual' : 'Plano Recorrente'}):</span>
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isSettingsAnnual
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isSettingsAnnual ? '2 Meses Grátis no Total' : 'Mensal Sem Fidelidade'}
                </span>
              </div>

              {isSettingsAnnual ? (
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Subtotal 12 meses (12x de R$ {(selectedPlanOption === 'flex' ? planPrices.flexPrice : planPrices.proPrice).toFixed(2).replace('.', ',')}):</span>
                    <span className="font-mono line-through">
                      R$ {(selectedPlanOption === 'flex' ? flexAnnualOriginal : proAnnualOriginal).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span className="flex items-center gap-1">
                      <BadgePercent size={13} />
                      Desconto Anual (2 meses grátis):
                    </span>
                    <span className="font-mono">
                      - R$ {(selectedPlanOption === 'flex' ? flexAnnualSavings : proAnnualSavings).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block uppercase">Total a Pagar (12 Meses):</span>
                      <span className="text-[10px] font-bold text-emerald-300">
                        Equivalente a apenas R$ {(selectedPlanOption === 'flex' ? flexAnnualMonthlyEquiv : proAnnualMonthlyEquiv).toFixed(2).replace('.', ',')}/mês
                      </span>
                    </div>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      R$ {currentFinalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Período de Renovação:</span>
                    <span className="text-slate-300">Ciclo a cada 30 dias</span>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block uppercase">Valor Mensal:</span>
                      <span className="text-[10px] text-slate-400">Sem fidelidade ou carência</span>
                    </div>
                    <span className="text-lg font-black font-mono text-amber-400">
                      R$ {currentFinalPrice.toFixed(2).replace('.', ',')}/mês
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Principal de Pagamento */}
            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={handleTriggerPaymentCheckout}
              className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 ${
                selectedPlanOption === 'pro'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 shadow-sky-500/20'
              }`}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Iniciando Pagamento Seguro...</span>
                </>
              ) : selectedPaymentMethod === 'credit_card' ? (
                <>
                  <CreditCard size={16} />
                  <span>
                    {isSettingsAnnual
                      ? `Pagar Plano ${selectedPlanOption === 'pro' ? 'PRO' : 'Flex'} Anual (2 meses grátis) no Cartão — R$ ${currentFinalPrice.toFixed(2).replace('.', ',')}`
                      : `Pagar Plano ${selectedPlanOption === 'pro' ? 'PRO' : 'Flex'} Recorrente no Cartão — R$ ${currentFinalPrice.toFixed(2).replace('.', ',')}/mês`}
                  </span>
                  <ArrowRight size={15} />
                </>
              ) : (
                <>
                  <QrCode size={16} />
                  <span>
                    {isSettingsAnnual
                      ? `Gerar PIX do Plano ${selectedPlanOption === 'pro' ? 'PRO' : 'Flex'} Anual (2 meses grátis) — R$ ${currentFinalPrice.toFixed(2).replace('.', ',')}`
                      : `Gerar PIX do Plano ${selectedPlanOption === 'pro' ? 'PRO' : 'Flex'} Recorrente — R$ ${currentFinalPrice.toFixed(2).replace('.', ',')}`}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 block">E-mail Cadastrado:</span>
              <strong className="text-white font-mono text-sm block truncate">{user?.email}</strong>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 block">Acesso Ilimitado:</span>
              <strong className="text-emerald-400 text-sm block">Ordens de Serviço, Erros HVAC e Cálculos</strong>
            </div>
          </div>

          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift size={16} />
              <span>Abrir Modal Completo de Planos / Resgatar Código de Licença</span>
            </button>
          )}

          {/* Atalhos para WhatsApp, Painel Admin Unificado e Botão de Sair */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {isMasterAdmin && !embeddedInAdmin && (
              <button
                type="button"
                onClick={() => {
                  setUnifiedSection('admin_master_config');
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/50 text-amber-300 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              >
                <Crown size={18} className="text-amber-400" />
                <span>Abrir Configurações Admin Master & Gateways (Mercado Pago / Planos R$ 19,90 e R$ 39,90) Nesta Página</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                  toast.success('Sessão encerrada com sucesso!');
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                } catch (err) {
                  console.error('Erro ao encerrar sessão:', err);
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogOut size={16} className="text-rose-400" />
              <span>Encerrar Sessão e Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Botão de Salvar no Rodapé */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer active:scale-95"
          >
            <Save size={16} />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
