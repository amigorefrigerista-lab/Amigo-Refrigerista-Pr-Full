'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConfigAlert } from '@/components/ConfigAlert';
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
  Sparkles,
  ShieldAlert,
  Shield,
  RefreshCw,
  CalendarCheck,
  BadgePercent,
  Mail,
  Clock,
  Send,
  BellRing,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  Phone,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  CalendarClock
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { recordAdminAuditAction } from '@/lib/adminAuditService';
import {
  WhatsAppRenewalSequenceStep,
  WhatsAppStepDispatchMode,
  DEFAULT_WHATSAPP_RENEWAL_SEQUENCE,
  MercadoPagoConnectionTestLog,
  isMaskedMpToken,
  maskMpAccessToken,
} from '@/lib/appSettingsConstants';
import { normalizeProPlanPrice, normalizeFlexPlanPrice } from '@/lib/pricing';

const MASTER_EMAIL = 'amigorefrigerista@gmail.com';

const DEFAULT_RENEWAL_TEMPLATES = {
  preventive: {
    subject: '❄️ Lembrete: Sua assinatura {plano} vence em {dias_restantes} dias — Amigo Refrigerista Pro',
    body: 'Olá, {nome}!\n\nSua assinatura do {plano} no Amigo Refrigerista Pro está programada para renovar em {data_vencimento} (faltam {dias_restantes} dias).\n\nValor da renovação: {valor}\n\nMantenha seu acesso ilimitado às Ordens de Serviço com QR Code PMOC, Calculadora de Superaquecimento e Diagnóstico por IA renovando pelo link abaixo:\n{link_renovacao}\n\nQualquer dúvida, nossa equipe está à disposição!',
  },
  urgent: {
    subject: '⚠️ Urgente: Sua assinatura {plano} vence amanhã ({data_vencimento})!',
    body: 'Olá, {nome}!\n\nPassando para avisar que sua assinatura do {plano} vence amanhã ({data_vencimento}).\n\nPara evitar qualquer interrupção na emissão das suas Ordens de Serviço, laudos PMOC e consultas de IA em campo, garanta sua renovação agora por apenas {valor}:\n{link_renovacao}\n\nConte sempre com o Amigo Refrigerista Pro!',
  },
  expired: {
    subject: '🔄 Sentimos sua falta, {nome}! Reative seu {plano} no Amigo Refrigerista Pro',
    body: 'Olá, {nome}!\n\nNotamos que sua assinatura do {plano} venceu em {data_vencimento}. Seus clientes, histórico de manutenções e equipamentos continuam salvos com segurança na sua conta.\n\nReative agora mesmo seu acesso completo por {valor} clicando no link abaixo:\n{link_renovacao}\n\nBoas manutenções e ótimos negócios!',
  },
};

export default function AdminSettingsPage() {
  const pathname = usePathname();
  const embedded = Boolean(pathname && pathname !== '/admin/configuracoes');
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const hasLoadedSettingsRef = useRef(false);
  const [savingSection, setSavingSection] = useState<
    'all' | 'payments' | 'mercadopago' | 'automation' | 'whatsapp' | 'smtp_renewal' | 'whatsapp_renewal' | null
  >(null);
  const [showMpAccessToken, setShowMpAccessToken] = useState(false);
  const [rawMpAccessToken, setRawMpAccessToken] = useState('');
  const [mpValidationStage, setMpValidationStage] = useState<
    'idle' | 'testing_connection' | 'saving_credentials' | 'verified' | 'error'
  >('idle');
  const [mpLiveLatencyMs, setMpLiveLatencyMs] = useState<number>(0);
  const [mpValidationMeta, setMpValidationMeta] = useState<{
    latencyMs?: number;
    accountLabel?: string;
    environment?: 'production' | 'sandbox';
    verifiedAt?: string;
  } | null>(null);

  useEffect(() => {
    if (mpValidationStage !== 'testing_connection' && mpValidationStage !== 'saving_credentials') {
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setMpLiveLatencyMs(Math.max(1, Math.round(performance.now() - startedAt)));
    }, 35);
    return () => window.clearInterval(timer);
  }, [mpValidationStage]);
  const [hideMpTokenPermanentlyAfterValidation, setHideMpTokenPermanentlyAfterValidation] =
    useState(true);
  const [isMpTokenPermanentlyHidden, setIsMpTokenPermanentlyHidden] = useState(false);
  const [mpTestLogs, setMpTestLogs] = useState<MercadoPagoConnectionTestLog[]>([]);
  const [showClearMpLogsModal, setShowClearMpLogsModal] = useState(false);
  const [isClearingMpLogs, setIsClearingMpLogs] = useState(false);
  const [mpStatusMessage, setMpStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
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
    stripe_currency: 'BRL',
    credit_card_enabled: true,
    credit_card_recurring_enabled: true,
    credit_card_max_installments: 12,
    credit_card_gateway: 'auto',
    pix_enabled: true,
    pro_plan_price: 39.90,
    flex_plan_price: 19.90,
    maintenance_interval_months: 6,
    free_trial_days: 7,
    whatsapp_api_url: '',
    whatsapp_api_key: '',
    whatsapp_instance_name: '',
    stripe_connect_client_id: '',
    stripe_connect_secret_key: '',
    stripe_webhook_url: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_renewal_enabled: true,
    smtp_renewal_days_before: 7,
    smtp_renewal_urgent_days_before: 1,
    smtp_renewal_expired_days_after: 2,
    smtp_renewal_send_time: '09:00',
    smtp_renewal_target_plans: 'all' as 'all' | 'pro' | 'flex',
    smtp_renewal_copy_admin: true,
    smtp_renewal_subject_preventive: DEFAULT_RENEWAL_TEMPLATES.preventive.subject,
    smtp_renewal_body_preventive: DEFAULT_RENEWAL_TEMPLATES.preventive.body,
    smtp_renewal_subject_urgent: DEFAULT_RENEWAL_TEMPLATES.urgent.subject,
    smtp_renewal_body_urgent: DEFAULT_RENEWAL_TEMPLATES.urgent.body,
    smtp_renewal_subject_expired: DEFAULT_RENEWAL_TEMPLATES.expired.subject,
    smtp_renewal_body_expired: DEFAULT_RENEWAL_TEMPLATES.expired.body,
    whatsapp_renewal_sequence_enabled: true,
    whatsapp_renewal_send_time: '10:00',
    whatsapp_renewal_target_plans: 'all' as 'all' | 'pro' | 'flex',
    whatsapp_renewal_sequence: DEFAULT_WHATSAPP_RENEWAL_SEQUENCE,
  });

  // Estados de Templates de E-mail de Renovação e Teste SMTP
  const [activeEmailTemplateTab, setActiveEmailTemplateTab] = useState<'preventive' | 'urgent' | 'expired'>('preventive');
  const [smtpTestRecipient, setSmtpTestRecipient] = useState('amigorefrigerista@gmail.com');
  const [testingSmtpRenewal, setTestingSmtpRenewal] = useState(false);

  // Estados da Sequência de Lembretes de Renovação via WhatsApp
  const [activeWaStepId, setActiveWaStepId] = useState<string>(
    DEFAULT_WHATSAPP_RENEWAL_SEQUENCE[0]?.id || 'wa-step-1-preventive'
  );
  const [waTestPhone, setWaTestPhone] = useState('');
  const [testingWaSequence, setTestingWaSequence] = useState(false);
  const [waFallbackPreviewLink, setWaFallbackPreviewLink] = useState<string | null>(null);

  // Estados de Simulação / Escolha de Plano (Flex ou Pró), Intervalo (Recorrente vs Anual 2 meses grátis) e Método
  const [selectedPreviewPlan, setSelectedPreviewPlan] = useState<'flex' | 'pro'>('pro');
  const [selectedPreviewInterval, setSelectedPreviewInterval] = useState<'recurring' | 'annual'>('recurring');
  const [selectedPreviewMethod, setSelectedPreviewMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [testingCheckout, setTestingCheckout] = useState(false);
  const [syncingOfficialPrices, setSyncingOfficialPrices] = useState(false);
  const [officialPricesSyncedAt, setOfficialPricesSyncedAt] = useState<string | null>(null);
  const [checkoutPreviewResult, setCheckoutPreviewResult] = useState<{
    init_point?: string | null;
    pix?: { copy_paste: string; qr_code_url: string } | null;
    message?: string;
    plan?: string;
    amount?: number;
    payment_method?: string;
  } | null>(null);

  // Sincroniza backup local das credenciais do Mercado Pago para nunca perder o que foi digitado
  const updateMercadoPagoField = (
    field: 'mercadopago_access_token' | 'mercadopago_public_key' | 'webhook_secret',
    value: string
  ) => {
    // Ao alterar o Access Token ou Public Key, exige nova confirmação do teste de conexão antes de exibir sucesso
    if (field === 'mercadopago_access_token' || field === 'mercadopago_public_key') {
      setMpValidationStage('idle');
      setMpStatusMessage(null);
    }
    if (field === 'mercadopago_access_token' && !isMaskedMpToken(value)) {
      setRawMpAccessToken(value);
    }
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (typeof window !== 'undefined') {
        try {
          const nextRawToken =
            field === 'mercadopago_access_token' && !isMaskedMpToken(value)
              ? value
              : rawMpAccessToken;
          localStorage.setItem(
            'amigo_mp_credentials_backup',
            JSON.stringify({
              mercadopago_access_token: next.mercadopago_access_token,
              mercadopago_access_token_raw: nextRawToken,
              mercadopago_public_key: next.mercadopago_public_key,
              webhook_secret: next.webhook_secret,
              verified: false,
              permanentlyHidden: isMpTokenPermanentlyHidden,
              hideAfterValidationPref: hideMpTokenPermanentlyAfterValidation,
            })
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  const handleReplacePermanentlyHiddenMpToken = () => {
    setIsMpTokenPermanentlyHidden(false);
    setShowMpAccessToken(false);
    setRawMpAccessToken('');
    setMpValidationStage('idle');
    setMpValidationMeta(null);
    setMpStatusMessage(null);
    setForm((prev) => {
      const next = { ...prev, mercadopago_access_token: '' };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'amigo_mp_credentials_backup',
            JSON.stringify({
              mercadopago_access_token: '',
              mercadopago_access_token_raw: '',
              mercadopago_public_key: next.mercadopago_public_key,
              webhook_secret: next.webhook_secret,
              verified: false,
              permanentlyHidden: false,
              hideAfterValidationPref: hideMpTokenPermanentlyAfterValidation,
            })
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const appendMpTestLog = (
    entry: Omit<MercadoPagoConnectionTestLog, 'id' | 'timestamp'> & { timestamp?: string }
  ): MercadoPagoConnectionTestLog[] => {
    const nowFormatted =
      entry.timestamp ||
      new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    const fullEntry: MercadoPagoConnectionTestLog = {
      id: `mp-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowFormatted,
      ...entry,
    };

    let updatedLogs: MercadoPagoConnectionTestLog[] = [];
    setMpTestLogs((prev) => {
      updatedLogs = [fullEntry, ...prev].slice(0, 5);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('amigo_mp_test_logs', JSON.stringify(updatedLogs));
        } catch {
          // ignore
        }
      }
      return updatedLogs;
    });
    return updatedLogs;
  };

  useEffect(() => {
    if (hasLoadedSettingsRef.current) return;
    hasLoadedSettingsRef.current = true;

    async function loadSettings() {
      let localMpBackup: {
        mercadopago_access_token?: string;
        mercadopago_access_token_raw?: string;
        mercadopago_public_key?: string;
        webhook_secret?: string;
        verified?: boolean;
        permanentlyHidden?: boolean;
        hideAfterValidationPref?: boolean;
        latencyMs?: number;
        accountLabel?: string;
        environment?: 'production' | 'sandbox';
        verifiedAt?: string;
      } = {};

      if (typeof window !== 'undefined') {
        try {
          const rawLogs = localStorage.getItem('amigo_mp_test_logs');
          if (rawLogs) {
            const parsedLogs = JSON.parse(rawLogs);
            if (Array.isArray(parsedLogs)) {
              setMpTestLogs(parsedLogs.slice(0, 5));
            }
          }
          const rawBackup = localStorage.getItem('amigo_mp_credentials_backup');
          if (rawBackup) {
            localMpBackup = JSON.parse(rawBackup) || {};
            if (typeof localMpBackup.hideAfterValidationPref === 'boolean') {
              setHideMpTokenPermanentlyAfterValidation(localMpBackup.hideAfterValidationPref);
            }
            const backupRawCandidate =
              localMpBackup.mercadopago_access_token_raw ||
              (!isMaskedMpToken(localMpBackup.mercadopago_access_token)
                ? localMpBackup.mercadopago_access_token
                : '');
            if (backupRawCandidate) {
              setRawMpAccessToken(backupRawCandidate);
            }
            if (localMpBackup.verified) {
              setMpValidationStage('verified');
              setMpValidationMeta({
                latencyMs: localMpBackup.latencyMs,
                accountLabel: localMpBackup.accountLabel,
                environment: localMpBackup.environment,
                verifiedAt: localMpBackup.verifiedAt,
              });
            }
            if (localMpBackup.permanentlyHidden && localMpBackup.mercadopago_access_token) {
              setIsMpTokenPermanentlyHidden(true);
              setShowMpAccessToken(false);
            }
          }
        } catch {
          // ignore
        }
      }

      try {
        const headers: Record<string, string> = {};
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
          if (user?.id) headers['x-amigo-uid'] = user.id;
          headers['x-amigo-email'] = user?.email || MASTER_EMAIL;
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
            const resolvedRawToken =
              data.mercadopago_access_token_raw ||
              (!isMaskedMpToken(data.mercadopago_access_token)
                ? data.mercadopago_access_token
                : '') ||
              localMpBackup.mercadopago_access_token_raw ||
              (!isMaskedMpToken(localMpBackup.mercadopago_access_token)
                ? localMpBackup.mercadopago_access_token
                : '') ||
              '';
            if (resolvedRawToken) {
              setRawMpAccessToken(resolvedRawToken);
            }
            const resolvedToken =
              resolvedRawToken ||
              data.mercadopago_access_token ||
              localMpBackup.mercadopago_access_token ||
              '';
            const serverOrLocalLocked = Boolean(
              (data.mercadopago_token_permanently_masked ||
                localMpBackup.permanentlyHidden ||
                isMaskedMpToken(data.mercadopago_access_token)) &&
                resolvedToken
            );
            const serverOrLocalVerified = Boolean(
              (data.mercadopago_connection_verified || localMpBackup.verified) && resolvedToken
            );

            if (serverOrLocalVerified) {
              setMpValidationStage('verified');
            }
            if (serverOrLocalLocked) {
              setIsMpTokenPermanentlyHidden(true);
              setShowMpAccessToken(false);
            }
            if (Array.isArray(data.mercadopago_test_logs) && data.mercadopago_test_logs.length > 0) {
              setMpTestLogs((prev) =>
                prev.length > 0 ? prev.slice(0, 5) : data.mercadopago_test_logs.slice(0, 5)
              );
            }

            setForm((prev) => ({
              ...prev,
              ...data,
              mercadopago_access_token: serverOrLocalLocked
                ? maskMpAccessToken(resolvedToken)
                : resolvedToken || prev.mercadopago_access_token || '',
              mercadopago_public_key:
                data.mercadopago_public_key ||
                prev.mercadopago_public_key ||
                localMpBackup.mercadopago_public_key ||
                '',
              webhook_secret:
                data.webhook_secret ||
                prev.webhook_secret ||
                localMpBackup.webhook_secret ||
                '',
              credit_card_enabled:
                data.credit_card_enabled !== undefined ? Boolean(data.credit_card_enabled) : prev.credit_card_enabled,
              credit_card_recurring_enabled:
                data.credit_card_recurring_enabled !== undefined
                  ? Boolean(data.credit_card_recurring_enabled)
                  : prev.credit_card_recurring_enabled,
              pro_plan_price: normalizeProPlanPrice(data.pro_plan_price ?? prev.pro_plan_price),
              flex_plan_price: normalizeFlexPlanPrice(data.flex_plan_price ?? prev.flex_plan_price),
              maintenance_interval_months: data.maintenance_interval_months
                ? Number(data.maintenance_interval_months)
                : prev.maintenance_interval_months,
              free_trial_days: data.free_trial_days ? Number(data.free_trial_days) : prev.free_trial_days,
            }));

            // Garante sincronização do preço oficial R$ 39,90 na tabela app_settings do Supabase caso estivesse com 49,90 legado
            if (isSupabaseConfigured) {
              supabase
                .from('app_settings')
                .select('id, pro_plan_price, flex_plan_price')
                .eq('id', 1)
                .maybeSingle()
                .then(
                  ({ data: sbRow }) => {
                    if (sbRow && Math.abs(Number(sbRow.pro_plan_price) - 49.9) < 0.05) {
                      supabase
                        .from('app_settings')
                        .update({
                          pro_plan_price: 39.9,
                          flex_plan_price: normalizeFlexPlanPrice(sbRow.flex_plan_price),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', 1)
                        .then(
                          () => {},
                          () => {}
                        );
                    }
                  },
                  () => {}
                );
            }
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        if (
          localMpBackup.mercadopago_access_token ||
          localMpBackup.mercadopago_public_key ||
          localMpBackup.webhook_secret
        ) {
          setForm((prev) => ({
            ...prev,
            mercadopago_access_token:
              prev.mercadopago_access_token || localMpBackup.mercadopago_access_token || '',
            mercadopago_public_key:
              prev.mercadopago_public_key || localMpBackup.mercadopago_public_key || '',
            webhook_secret: prev.webhook_secret || localMpBackup.webhook_secret || '',
          }));
        }
        setLoading(false);
      }
    }
    loadSettings();
  }, [user?.email, user?.id]);

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
    section:
      | 'all'
      | 'payments'
      | 'mercadopago'
      | 'automation'
      | 'whatsapp'
      | 'smtp_renewal'
      | 'whatsapp_renewal',
    payload: Partial<typeof form>,
    successLabel: string
  ): Promise<boolean> => {
    setSavingSection(section);
    setMessage('');

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
        if (user?.id) headers['x-amigo-uid'] = user.id;
        headers['x-amigo-email'] = user?.email || MASTER_EMAIL;
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
        return false;
      } else {
        if (
          payload.mercadopago_access_token !== undefined ||
          payload.mercadopago_public_key !== undefined ||
          payload.webhook_secret !== undefined
        ) {
          try {
            localStorage.setItem(
              'amigo_mp_credentials_backup',
              JSON.stringify({
                mercadopago_access_token:
                  payload.mercadopago_access_token ?? form.mercadopago_access_token,
                mercadopago_public_key:
                  payload.mercadopago_public_key ?? form.mercadopago_public_key,
                webhook_secret: payload.webhook_secret ?? form.webhook_secret,
              })
            );
          } catch {
            // ignore
          }
        }
        if (isSupabaseConfigured && (payload.pro_plan_price !== undefined || payload.flex_plan_price !== undefined)) {
          supabase
            .from('app_settings')
            .upsert({
              id: 1,
              pro_plan_price: normalizeProPlanPrice(payload.pro_plan_price ?? form.pro_plan_price),
              flex_plan_price: normalizeFlexPlanPrice(payload.flex_plan_price ?? form.flex_plan_price),
              updated_at: new Date().toISOString(),
            })
            .then(
              () => {},
              () => {}
            );
        }
        setMessageType('success');
        setMessage(`${successLabel} salvas com sucesso no servidor!`);
        return true;
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || `Erro de conexão ao salvar ${successLabel.toLowerCase()} no servidor.`);
      return false;
    } finally {
      setSavingSection(null);
    }
  };

  const handleTestAndSaveMercadoPago = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const formTokenTrimmed = form.mercadopago_access_token.trim();
    const cleanToken =
      isMaskedMpToken(formTokenTrimmed) && rawMpAccessToken.trim()
        ? rawMpAccessToken.trim()
        : formTokenTrimmed;
    const cleanPublicKey = form.mercadopago_public_key.trim();
    const cleanWebhook = form.webhook_secret.trim();

    if (!cleanToken) {
      const errMsg =
        'Por favor, informe o Mercado Pago Access Token (ex: APP_USR-...) antes de testar e salvar.';
      setMpValidationStage('error');
      setMpStatusMessage({ type: 'error', text: errMsg });
      setMessageType('error');
      setMessage(errMsg);
      appendMpTestLog({
        status: 'error',
        message: 'Teste abortado: Access Token não informado.',
        errorDetail: 'ERR_EMPTY_ACCESS_TOKEN: O campo Mercado Pago Access Token estava vazio.',
      });
      return;
    }

    // Pré-validação instantânea no cliente (0ms) antes da chamada de rede
    if (
      !isMaskedMpToken(cleanToken) &&
      ((!cleanToken.startsWith('APP_USR-') && !cleanToken.startsWith('TEST-')) ||
        cleanToken.length < 20)
    ) {
      const formatErr =
        'Formato inválido: o Access Token do Mercado Pago deve iniciar com APP_USR- ou TEST- e estar completo.';
      setMpValidationStage('error');
      setMpStatusMessage({ type: 'error', text: formatErr });
      setMessageType('error');
      setMessage(formatErr);
      appendMpTestLog({
        status: 'error',
        maskedToken: maskMpAccessToken(cleanToken),
        latencyMs: 1,
        message: 'Falha na pré-validação de formato do Access Token.',
        errorDetail: `ERR_INVALID_TOKEN_PREFIX: O token informado (${cleanToken.slice(0, 6)}...) não inicia com APP_USR- ou TEST- ou está truncado.`,
      });
      return;
    }

    if (
      cleanPublicKey &&
      !cleanPublicKey.startsWith('APP_USR-') &&
      !cleanPublicKey.startsWith('TEST-')
    ) {
      const pubKeyErr =
        'Formato inválido: a Public Key do Mercado Pago deve iniciar com APP_USR- ou TEST-.';
      setMpValidationStage('error');
      setMpStatusMessage({ type: 'error', text: pubKeyErr });
      setMessageType('error');
      setMessage(pubKeyErr);
      appendMpTestLog({
        status: 'error',
        maskedToken: maskMpAccessToken(cleanToken),
        latencyMs: 1,
        message: 'Falha na validação de formato da Public Key.',
        errorDetail: `ERR_INVALID_PUBLIC_KEY: A Public Key informada (${cleanPublicKey.slice(0, 6)}...) deve iniciar com APP_USR- ou TEST-.`,
      });
      return;
    }

    setSavingSection('mercadopago');
    setMpLiveLatencyMs(0);
    setMpValidationStage('testing_connection');
    setMpStatusMessage(null);
    setMessage('');

    const clientStart = performance.now();

    try {
      // 1. Validação assíncrona rápida na API do Mercado Pago
      const testHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('amigo_hmac_session');
        if (sessionToken) {
          testHeaders['Authorization'] = `Bearer ${sessionToken}`;
        } else {
          try {
            const { data: { session: sbSession } } = await supabase.auth.getSession();
            if (sbSession?.access_token) {
              testHeaders['Authorization'] = `Bearer ${sbSession.access_token}`;
            }
          } catch {
            // ignore
          }
        }
        if (user?.id) testHeaders['x-amigo-uid'] = user.id;
        testHeaders['x-amigo-email'] = user?.email || MASTER_EMAIL;
      }

      const testRes = await fetch('/api/admin/payments/test-mercadopago', {
        method: 'POST',
        headers: testHeaders,
        credentials: 'same-origin',
        body: JSON.stringify({
          accessToken: cleanToken,
          publicKey: cleanPublicKey,
        }),
      });
      const testJson = await testRes.json().catch(() => ({}));
      const measuredLatency =
        testJson.latencyMs || Math.max(1, Math.round(performance.now() - clientStart));
      setMpLiveLatencyMs(measuredLatency);

      if (!testRes.ok || !testJson.ok) {
        const errText = testJson.error || 'Falha ao validar Access Token do Mercado Pago.';
        setMpValidationStage('error');
        setMpValidationMeta((prev) => ({
          ...prev,
          latencyMs: measuredLatency,
          environment: cleanToken.startsWith('TEST-') ? 'sandbox' : 'production',
        }));
        setMpStatusMessage({ type: 'error', text: errText });
        setMessageType('error');
        setMessage(errText);
        appendMpTestLog({
          status: 'error',
          environment: cleanToken.startsWith('TEST-') ? 'sandbox' : 'production',
          latencyMs: measuredLatency,
          maskedToken: maskMpAccessToken(cleanToken),
          message: 'Falha no teste de conexão com a API do Mercado Pago.',
          errorDetail: `HTTP ${testRes.status}: ${errText}`,
        });
        setSavingSection(null);
        return;
      }

      // 2. Conexão confirmada! Atualiza imediatamente os metadados da conta conectada e latência
      const shouldLockPermanently =
        hideMpTokenPermanentlyAfterValidation || isMpTokenPermanentlyHidden;
      const maskedTokenValue = testJson.maskedToken || maskMpAccessToken(cleanToken);
      const envType: 'production' | 'sandbox' =
        testJson.environment || (cleanToken.startsWith('TEST-') ? 'sandbox' : 'production');
      const accountName =
        testJson?.account?.nickname ||
        testJson?.account?.email ||
        (envType === 'sandbox' ? 'Sandbox / Teste' : 'Produção MLB');

      const immediateTimestamp = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setMpValidationMeta({
        latencyMs: measuredLatency,
        accountLabel: accountName,
        environment: envType,
        verifiedAt: immediateTimestamp,
      });
      setMpValidationStage('saving_credentials');

      const newLogEntry: MercadoPagoConnectionTestLog = {
        id: `mp-log-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        status: 'success',
        environment: envType,
        latencyMs: measuredLatency,
        accountLabel: accountName,
        maskedToken: maskedTokenValue,
        message:
          testJson.message ||
          `Conexão confirmada (${envType === 'sandbox' ? 'Sandbox' : 'Produção'}) e credenciais salvas.`,
        errorDetail: null,
      };

      const nextLogs = [newLogEntry, ...mpTestLogs].slice(0, 5);

      const savedOk = await saveSection(
        'mercadopago',
        {
          payment_provider: 'mercadopago',
          mercadopago_access_token: cleanToken,
          mercadopago_public_key: cleanPublicKey,
          webhook_secret: cleanWebhook,
          mercadopago_token_permanently_masked: shouldLockPermanently,
          mercadopago_connection_verified: true,
          mercadopago_test_logs: nextLogs,
        } as any,
        'Credenciais do Mercado Pago'
      );

      if (savedOk) {
        const verifiedTimestamp = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const tokenForClientState = shouldLockPermanently ? maskedTokenValue : cleanToken;
        if (!isMaskedMpToken(cleanToken)) {
          setRawMpAccessToken(cleanToken);
        }

        setMpTestLogs(nextLogs);
        setForm((prev) => ({
          ...prev,
          payment_provider: 'mercadopago',
          mercadopago_access_token: tokenForClientState,
          mercadopago_public_key: cleanPublicKey,
          webhook_secret: cleanWebhook,
        }));

        // Indica o sucesso visualmente APENAS após a confirmação do teste de conexão + salvamento
        setMpValidationStage('verified');
        setMpValidationMeta({
          latencyMs: measuredLatency,
          accountLabel: accountName,
          environment: envType,
          verifiedAt: verifiedTimestamp,
        });

        if (shouldLockPermanently) {
          setIsMpTokenPermanentlyHidden(true);
          setShowMpAccessToken(false);
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('amigo_mp_test_logs', JSON.stringify(nextLogs));
            localStorage.setItem(
              'amigo_mp_credentials_backup',
              JSON.stringify({
                mercadopago_access_token: tokenForClientState,
                mercadopago_access_token_raw: !isMaskedMpToken(cleanToken)
                  ? cleanToken
                  : rawMpAccessToken,
                mercadopago_public_key: cleanPublicKey,
                webhook_secret: cleanWebhook,
                verified: true,
                permanentlyHidden: shouldLockPermanently,
                hideAfterValidationPref: hideMpTokenPermanentlyAfterValidation,
                latencyMs: measuredLatency,
                accountLabel: accountName,
                environment: envType,
                verifiedAt: verifiedTimestamp,
              })
            );
          } catch {
            // ignore
          }
        }

        const successText = `${
          testJson.message || 'Conexão Mercado Pago confirmada!'
        } Credenciais salvas com sucesso${
          shouldLockPermanently ? ' e Access Token ocultado permanentemente por segurança.' : '.'
        }`;
        setMpStatusMessage({ type: 'success', text: successText });
        setMessageType('success');
        setMessage(successText);

        recordAdminAuditAction({
          adminName: user?.displayName || 'Administrador Master',
          adminEmail: user?.email || MASTER_EMAIL,
          adminRole: 'Super Admin',
          category: 'security_config',
          actionTitle: 'Teste e Salvamento de Credenciais Mercado Pago',
          targetIdentifier: `Mercado Pago (${cleanPublicKey ? 'Access Token + Public Key' : 'Access Token'})`,
          previousValue: 'Credenciais anteriores',
          newValue: `Token ${cleanToken.slice(0, 10)}•••• validado (${measuredLatency}ms) e salvo`,
          details: shouldLockPermanently
            ? 'Credenciais do Mercado Pago testadas, salvas e Access Token bloqueado/ocultado permanentemente após a 1ª validação.'
            : 'Credenciais do Mercado Pago testadas e salvas exclusivamente no Painel Master.',
          severity: 'critical',
        });
      } else {
        setMpValidationStage('error');
      }
    } catch (err: any) {
      const fallbackErr = err?.message || 'Erro ao testar e salvar credenciais do Mercado Pago.';
      setMpValidationStage('error');
      setMpStatusMessage({ type: 'error', text: fallbackErr });
      setMessageType('error');
      setMessage(fallbackErr);
    } finally {
      setSavingSection(null);
    }
  };

  const handleConfirmClearMpLogs = async () => {
    const previousCount = mpTestLogs.length;
    setIsClearingMpLogs(true);
    try {
      setMpTestLogs([]);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('amigo_mp_test_logs');
        } catch {
          // ignore
        }
      }

      // Sincroniza a limpeza do armazenamento de logs também no servidor
      await saveSection(
        'mercadopago',
        {
          mercadopago_test_logs: [],
        } as any,
        'Limpeza do histórico de logs do Mercado Pago'
      );

      recordAdminAuditAction({
        adminName: user?.displayName || 'Administrador Master',
        adminEmail: user?.email || MASTER_EMAIL,
        adminRole: 'Super Admin',
        category: 'security_config',
        actionTitle: 'Limpeza de Logs de Conexão Mercado Pago',
        targetIdentifier: 'Histórico de Eventos Mercado Pago',
        previousValue: `${previousCount} log(s) armazenado(s)`,
        newValue: '0 logs (armazenamento limpo)',
        details:
          'O administrador confirmou a limpeza dos logs de eventos de conexão do Mercado Pago no armazenamento local e no servidor.',
        severity: 'medium',
      });

      const clearMsg = 'Histórico de logs de conexão do Mercado Pago limpo com sucesso!';
      setMpStatusMessage({ type: 'success', text: clearMsg });
      setMessageType('success');
      setMessage(clearMsg);
      setShowClearMpLogsModal(false);
    } finally {
      setIsClearingMpLogs(false);
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
        credit_card_enabled: form.credit_card_enabled,
        credit_card_recurring_enabled: form.credit_card_recurring_enabled,
        credit_card_max_installments: form.credit_card_max_installments,
        credit_card_gateway: form.credit_card_gateway,
        pix_enabled: form.pix_enabled,
        mercadopago_access_token: form.mercadopago_access_token,
        mercadopago_public_key: form.mercadopago_public_key,
        webhook_secret: form.webhook_secret,
        stripe_secret_key: form.stripe_secret_key,
        stripe_publishable_key: form.stripe_publishable_key,
        stripe_webhook_secret: form.stripe_webhook_secret,
        stripe_currency: form.stripe_currency,
        stripe_connect_client_id: form.stripe_connect_client_id,
        stripe_connect_secret_key: form.stripe_connect_secret_key,
        stripe_webhook_url: form.stripe_webhook_url,
      },
      'Configurações de Integração de Pagamentos e Cartão de Crédito'
    );
  };

  const handleSyncOfficialPrices = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSyncingOfficialPrices(true);
    setMessage('');

    const prevPro = form.pro_plan_price;
    const prevFlex = form.flex_plan_price;
    const nowIso = new Date().toISOString();

    setForm((prev) => ({
      ...prev,
      pro_plan_price: 39.9,
      flex_plan_price: 19.9,
    }));

    try {
      // 1. Força a atualização direta na tabela app_settings do Supabase no cliente (id = 1 + todas as linhas)
      if (isSupabaseConfigured) {
        try {
          const { error: upsertErr } = await supabase.from('app_settings').upsert(
            {
              id: 1,
              pro_plan_price: 39.9,
              flex_plan_price: 19.9,
              updated_at: nowIso,
            },
            { onConflict: 'id' }
          );
          if (upsertErr) {
            await supabase
              .from('app_settings')
              .update({
                pro_plan_price: 39.9,
                flex_plan_price: 19.9,
                updated_at: nowIso,
              })
              .eq('id', 1);
          }
          await supabase
            .from('app_settings')
            .update({
              pro_plan_price: 39.9,
              flex_plan_price: 19.9,
              updated_at: nowIso,
            })
            .gte('id', 1);
        } catch {
          // Segue para sincronização via Service Role no servidor
        }
      }

      // 2. Força a atualização via API Admin Settings (Service Role no Supabase + Cloud SQL PostgreSQL + Cache)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('amigo_hmac_session');
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        } else {
          try {
            const {
              data: { session: sbSession },
            } = await supabase.auth.getSession();
            if (sbSession?.access_token) {
              headers['Authorization'] = `Bearer ${sbSession.access_token}`;
            }
          } catch {
            // ignore
          }
        }
        if (user?.id) headers['x-amigo-uid'] = user.id;
        headers['x-amigo-email'] = user?.email || MASTER_EMAIL;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          force_sync_official_prices: true,
          pro_plan_price: 39.9,
          flex_plan_price: 19.9,
        }),
      });

      const json = await res.json().catch(() => ({}));
      const syncedTime = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setOfficialPricesSyncedAt(syncedTime);

      if (!res.ok || !json?.ok) {
        setMessageType('error');
        setMessage(
          json?.error ||
            'Não foi possível concluir a sincronização no servidor, mas os valores locais foram definidos para R$ 39,90 e R$ 19,90.'
        );
        return;
      }

      setMessageType('success');
      setMessage(
        'Preços oficiais sincronizados com sucesso na tabela app_settings do Supabase e em toda a base de dados (Plano Pró: R$ 39,90 | Plano Flex: R$ 19,90)!'
      );

      recordAdminAuditAction({
        adminName: user?.displayName || 'Administrador Master',
        adminEmail: user?.email || MASTER_EMAIL,
        adminRole: 'Super Admin',
        category: 'plan_change',
        actionTitle: 'Sincronização de Preços Oficiais (app_settings Supabase)',
        targetIdentifier: 'Tabela app_settings (Plano Pró & Plano Flex)',
        previousValue: `Pró: R$ ${Number(prevPro).toFixed(2).replace('.', ',')} | Flex: R$ ${Number(prevFlex).toFixed(2).replace('.', ',')}`,
        newValue: 'Pró: R$ 39,90 | Flex: R$ 19,90',
        details:
          'Atualização forçada da tabela app_settings no Supabase e no banco principal para garantir os valores oficiais dos planos Pró (39,90) e Flex (19,90).',
        severity: 'high',
      });
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || 'Erro ao sincronizar os preços oficiais na tabela app_settings.');
    } finally {
      setSyncingOfficialPrices(false);
    }
  };

  const handleGenerateWebhookSecret = () => {
    const newSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
    setForm({ ...form, webhook_secret: newSecret });
  };

  const handleTestStripeConnection = async () => {
    if (!form.stripe_secret_key) {
      setMessage('Por favor, informe a Stripe Secret Key para testar.');
      setMessageType('error');
      return;
    }

    setSavingSection('payments'); // Reutiliza estado de loading
    try {
      const response = await fetch('/api/admin/payments/test-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: form.stripe_secret_key }),
      });
      const data = await response.json();
      if (data.ok) {
        setMessage(data.message);
        setMessageType('success');
      } else {
        setMessage(data.error || 'Erro ao testar conexão.');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Erro de conexão com servidor.');
      setMessageType('error');
    } finally {
      setSavingSection(null);
    }
  };

  const handleTestCheckoutFlow = async (planToTest: 'flex' | 'pro', methodToTest: 'credit_card' | 'pix') => {
    setTestingCheckout(true);
    setCheckoutPreviewResult(null);
    setMessage('');
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
        if (user?.id) headers['x-amigo-uid'] = user.id;
        if (user?.email) headers['x-amigo-email'] = user.email;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userName: user?.displayName || 'Administrador Teste',
          planType: planToTest,
          paymentMethod: methodToTest,
          installments: form.credit_card_max_installments || 12,
          billingCycle: form.credit_card_recurring_enabled ? 'recurring' : 'single_30d',
          provider: form.payment_provider === 'stripe' || form.credit_card_gateway === 'stripe' ? 'stripe' : undefined,
          returnUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCheckoutPreviewResult(data);
        setMessageType('success');
        setMessage(
          `Link de pagamento (${planToTest === 'flex' ? 'Plano Flex' : 'Plano Pró'} via ${
            methodToTest === 'credit_card' ? 'Cartão de Crédito' : 'PIX'
          }) gerado com sucesso!`
        );
      } else {
        setMessageType('error');
        setMessage(data.error || 'Erro ao gerar sessão de checkout.');
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || 'Erro de conexão ao testar checkout.');
    } finally {
      setTestingCheckout(false);
    }
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

  // Renderiza o assunto e o corpo do template ativo com variáveis de exemplo reais
  const getRenderedRenewalPreview = (stage: 'preventive' | 'urgent' | 'expired' = activeEmailTemplateTab) => {
    const rawSubject =
      stage === 'preventive'
        ? form.smtp_renewal_subject_preventive
        : stage === 'urgent'
        ? form.smtp_renewal_subject_urgent
        : form.smtp_renewal_subject_expired;

    const rawBody =
      stage === 'preventive'
        ? form.smtp_renewal_body_preventive
        : stage === 'urgent'
        ? form.smtp_renewal_body_urgent
        : form.smtp_renewal_body_expired;

    const daysValue =
      stage === 'preventive'
        ? String(form.smtp_renewal_days_before || 7)
        : stage === 'urgent'
        ? String(form.smtp_renewal_urgent_days_before || 1)
        : '0';

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (stage === 'expired' ? -(form.smtp_renewal_expired_days_after || 2) : Number(daysValue)));
    const formattedDue = dueDate.toLocaleDateString('pt-BR');

    const replacements: Record<string, string> = {
      '{nome}': 'Carlos Refrigerista',
      '{plano}': 'Plano Pró VIP',
      '{valor}': `R$ ${Number(form.pro_plan_price || 39.9).toFixed(2).replace('.', ',')}`,
      '{data_vencimento}': formattedDue,
      '{dias_restantes}': daysValue,
      '{link_renovacao}': typeof window !== 'undefined' ? `${window.location.origin}/?renovar=pro` : 'https://amigorefrigerista.com.br/?renovar=pro',
    };

    let subject = rawSubject || '';
    let body = rawBody || '';
    for (const [token, val] of Object.entries(replacements)) {
      subject = subject.split(token).join(val);
      body = body.split(token).join(val);
    }
    return { subject, body };
  };

  const handleInsertTemplateVariable = (variableToken: string) => {
    if (activeEmailTemplateTab === 'preventive') {
      setForm((prev) => ({
        ...prev,
        smtp_renewal_body_preventive: `${prev.smtp_renewal_body_preventive} ${variableToken}`,
      }));
    } else if (activeEmailTemplateTab === 'urgent') {
      setForm((prev) => ({
        ...prev,
        smtp_renewal_body_urgent: `${prev.smtp_renewal_body_urgent} ${variableToken}`,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        smtp_renewal_body_expired: `${prev.smtp_renewal_body_expired} ${variableToken}`,
      }));
    }
  };

  const handleRestoreDefaultRenewalTemplates = () => {
    setForm((prev) => ({
      ...prev,
      smtp_renewal_subject_preventive: DEFAULT_RENEWAL_TEMPLATES.preventive.subject,
      smtp_renewal_body_preventive: DEFAULT_RENEWAL_TEMPLATES.preventive.body,
      smtp_renewal_subject_urgent: DEFAULT_RENEWAL_TEMPLATES.urgent.subject,
      smtp_renewal_body_urgent: DEFAULT_RENEWAL_TEMPLATES.urgent.body,
      smtp_renewal_subject_expired: DEFAULT_RENEWAL_TEMPLATES.expired.subject,
      smtp_renewal_body_expired: DEFAULT_RENEWAL_TEMPLATES.expired.body,
    }));
    setMessageType('success');
    setMessage('Templates padrão de renovação de assinatura restaurados!');
  };

  const handleSaveSmtpRenewal = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    await saveSection(
      'smtp_renewal',
      {
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_user: form.smtp_user,
        smtp_pass: form.smtp_pass,
        smtp_from: form.smtp_from,
        smtp_renewal_enabled: form.smtp_renewal_enabled,
        smtp_renewal_days_before: form.smtp_renewal_days_before,
        smtp_renewal_urgent_days_before: form.smtp_renewal_urgent_days_before,
        smtp_renewal_expired_days_after: form.smtp_renewal_expired_days_after,
        smtp_renewal_send_time: form.smtp_renewal_send_time,
        smtp_renewal_target_plans: form.smtp_renewal_target_plans,
        smtp_renewal_copy_admin: form.smtp_renewal_copy_admin,
        smtp_renewal_subject_preventive: form.smtp_renewal_subject_preventive,
        smtp_renewal_body_preventive: form.smtp_renewal_body_preventive,
        smtp_renewal_subject_urgent: form.smtp_renewal_subject_urgent,
        smtp_renewal_body_urgent: form.smtp_renewal_body_urgent,
        smtp_renewal_subject_expired: form.smtp_renewal_subject_expired,
        smtp_renewal_body_expired: form.smtp_renewal_body_expired,
      },
      'Templates de E-mail e Regras de Disparo Automático de Renovação (SMTP)'
    );

    recordAdminAuditAction({
      adminName: user?.displayName || 'Administrador Master',
      adminEmail: user?.email || MASTER_EMAIL,
      adminRole: 'Super Admin',
      category: 'security_config',
      actionTitle: 'Atualização de Templates e Automação SMTP de Renovação',
      targetIdentifier: `SMTP (${form.smtp_host || 'Servidor Padrão'}) · Disparo ${form.smtp_renewal_enabled ? 'Ativo' : 'Pausado'}`,
      previousValue: 'Configuração anterior',
      newValue: `Preventivo: ${form.smtp_renewal_days_before}d | Urgente: ${form.smtp_renewal_urgent_days_before}d | Pós: ${form.smtp_renewal_expired_days_after}d`,
      details: 'Regras e templates de lembrete automático de renovação de assinaturas atualizados em Configurações Master.',
      severity: 'high',
    });
  };

  const handleTestSmtpRenewalDispatch = async () => {
    setTestingSmtpRenewal(true);
    setMessage('');
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
        if (user?.id) headers['x-amigo-uid'] = user.id;
        if (user?.email) headers['x-amigo-email'] = user.email;
      }

      const rendered = getRenderedRenewalPreview(activeEmailTemplateTab);
      const res = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_user: form.smtp_user,
          smtp_pass: form.smtp_pass,
          smtp_from: form.smtp_from,
          test_recipient: smtpTestRecipient || user?.email || MASTER_EMAIL,
          custom_subject: rendered.subject,
          custom_body: rendered.body,
          copy_admin: form.smtp_renewal_copy_admin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessageType('success');
        setMessage(data.message || `E-mail de teste do template enviado para ${smtpTestRecipient}!`);
      } else {
        setMessageType('error');
        setMessage(data.error || 'Falha ao disparar e-mail de teste SMTP. Verifique Host, Usuário e Senha.');
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || 'Erro de conexão ao testar disparo SMTP.');
    } finally {
      setTestingSmtpRenewal(false);
    }
  };

  // =========================================================================
  // FUNÇÕES DA SEQUÊNCIA DE LEMBRETES AUTOMÁTICOS DE RENOVAÇÃO VIA WHATSAPP
  // =========================================================================
  const sequenceSteps: WhatsAppRenewalSequenceStep[] = (
    Array.isArray(form.whatsapp_renewal_sequence) && form.whatsapp_renewal_sequence.length > 0
      ? form.whatsapp_renewal_sequence
      : DEFAULT_WHATSAPP_RENEWAL_SEQUENCE
  ).map((step, idx) => {
    const defaultMatch =
      DEFAULT_WHATSAPP_RENEWAL_SEQUENCE.find((d) => d.id === step.id) ||
      DEFAULT_WHATSAPP_RENEWAL_SEQUENCE[idx];
    const resolvedDispatchMode: WhatsAppStepDispatchMode =
      step.dispatchMode === 'immediate' || step.dispatchMode === 'scheduled'
        ? step.dispatchMode
        : defaultMatch?.dispatchMode || 'scheduled';
    return {
      ...step,
      dispatchMode: resolvedDispatchMode,
    };
  });

  const activeWaStep =
    sequenceSteps.find((s) => s.id === activeWaStepId) || sequenceSteps[0];

  const handleUpdateWaStep = (
    stepId: string,
    patch: Partial<WhatsAppRenewalSequenceStep>
  ) => {
    setForm((prev) => ({
      ...prev,
      whatsapp_renewal_sequence: sequenceSteps.map((step) =>
        step.id === stepId ? { ...step, ...patch } : step
      ),
    }));
  };

  const handleSelectWaStepDispatchMode = (
    stepId: string,
    mode: WhatsAppStepDispatchMode,
    stepTitle?: string
  ) => {
    handleUpdateWaStep(stepId, { dispatchMode: mode });
    setMessageType('success');
    setMessage(
      mode === 'immediate'
        ? `Etapa "${stepTitle || stepId}" configurada para Disparo Imediato (envio manual direto via WhatsApp).`
        : `Etapa "${stepTitle || stepId}" configurada para Disparo Agendado (envio automático via API no gatilho da etapa).`
    );
  };

  const handleAddWaSequenceStep = () => {
    const nextIdx = sequenceSteps.length + 1;
    const newStep: WhatsAppRenewalSequenceStep = {
      id: `wa-step-${Date.now()}`,
      title: `${nextIdx}ª Etapa: Lembrete Personalizado`,
      triggerType: 'before_due',
      daysOffset: 3,
      enabled: true,
      dispatchMode: 'scheduled',
      template:
        'Olá *{nome}*! ❄️\n\nLembrete automático: sua assinatura do *{plano}* vence em *{dias_restantes} dia(s)* ({data_vencimento}).\n\nGaranta a continuidade do seu acesso por *{valor}*:\n👉 {link_renovacao}',
    };
    setForm((prev) => ({
      ...prev,
      whatsapp_renewal_sequence: [...sequenceSteps, newStep],
    }));
    setActiveWaStepId(newStep.id);
    setMessageType('success');
    setMessage(`Nova etapa "${newStep.title}" adicionada à sequência de WhatsApp!`);
  };

  const handleRemoveWaSequenceStep = (stepId: string) => {
    if (sequenceSteps.length <= 1) {
      setMessageType('error');
      setMessage('A sequência deve manter pelo menos 1 etapa configurada.');
      return;
    }
    const remaining = sequenceSteps.filter((s) => s.id !== stepId);
    setForm((prev) => ({
      ...prev,
      whatsapp_renewal_sequence: remaining,
    }));
    if (activeWaStepId === stepId && remaining[0]) {
      setActiveWaStepId(remaining[0].id);
    }
  };

  const handleInsertWaVariable = (variableToken: string) => {
    if (!activeWaStep) return;
    handleUpdateWaStep(activeWaStep.id, {
      template: `${activeWaStep.template} ${variableToken}`,
    });
  };

  const handleRestoreDefaultWaSequence = () => {
    setForm((prev) => ({
      ...prev,
      whatsapp_renewal_sequence: DEFAULT_WHATSAPP_RENEWAL_SEQUENCE,
    }));
    setActiveWaStepId(DEFAULT_WHATSAPP_RENEWAL_SEQUENCE[0].id);
    setMessageType('success');
    setMessage('Sequência padrão de 4 etapas do WhatsApp restaurada!');
  };

  const getRenderedWaStepPreview = (step: WhatsAppRenewalSequenceStep = activeWaStep) => {
    if (!step) return '';
    const dueDate = new Date();
    const signedOffset =
      step.triggerType === 'before_due'
        ? Number(step.daysOffset || 0)
        : step.triggerType === 'after_due'
        ? -Number(step.daysOffset || 0)
        : 0;
    dueDate.setDate(dueDate.getDate() + signedOffset);
    const formattedDue = dueDate.toLocaleDateString('pt-BR');

    const replacements: Record<string, string> = {
      '{nome}': 'Carlos Refrigerista',
      '{plano}': 'Plano Pró VIP',
      '{valor}': `R$ ${Number(form.pro_plan_price || 39.9).toFixed(2).replace('.', ',')}`,
      '{data_vencimento}': formattedDue,
      '{dias_restantes}': String(step.daysOffset || 0),
      '{link_renovacao}':
        typeof window !== 'undefined'
          ? `${window.location.origin}/?renovar=pro`
          : 'https://amigorefrigerista.com.br/?renovar=pro',
    };

    let msg = step.template || '';
    for (const [token, val] of Object.entries(replacements)) {
      msg = msg.split(token).join(val);
    }
    return msg;
  };

  const getDirectWhatsAppManualUrl = (
    step: WhatsAppRenewalSequenceStep = activeWaStep,
    rawPhone: string = waTestPhone
  ) => {
    const renderedText = getRenderedWaStepPreview(step);
    let cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(renderedText)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(renderedText)}`;
  };

  const handleSaveWhatsAppRenewalSequence = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const immediateCount = sequenceSteps.filter(
      (s) => s.enabled && s.dispatchMode === 'immediate'
    ).length;
    const scheduledCount = sequenceSteps.filter(
      (s) => s.enabled && s.dispatchMode !== 'immediate'
    ).length;

    await saveSection(
      'whatsapp_renewal',
      {
        whatsapp_api_url: form.whatsapp_api_url,
        whatsapp_api_key: form.whatsapp_api_key,
        whatsapp_instance_name: form.whatsapp_instance_name,
        whatsapp_renewal_sequence_enabled: form.whatsapp_renewal_sequence_enabled,
        whatsapp_renewal_send_time: form.whatsapp_renewal_send_time,
        whatsapp_renewal_target_plans: form.whatsapp_renewal_target_plans,
        whatsapp_renewal_sequence: sequenceSteps,
      },
      'Sequência de Templates de Lembretes Automáticos de Renovação via WhatsApp'
    );

    recordAdminAuditAction({
      adminName: user?.displayName || 'Administrador Master',
      adminEmail: user?.email || MASTER_EMAIL,
      adminRole: 'Super Admin',
      category: 'security_config',
      actionTitle: 'Atualização da Sequência de Renovação via WhatsApp',
      targetIdentifier: `Instância: ${form.whatsapp_instance_name || 'Master'} · ${sequenceSteps.filter((s) => s.enabled).length} etapas ativas (${scheduledCount} agendadas API / ${immediateCount} imediatas WhatsApp)`,
      previousValue: 'Sequência anterior',
      newValue: `${sequenceSteps.length} etapas configuradas (${form.whatsapp_renewal_send_time})`,
      details: 'Régua de lembretes de renovação de assinatura (Disparo Imediato Manual vs Disparo Agendado API) salva no Painel Master.',
      severity: 'high',
    });
  };

  const handleTestWaRenewalSequenceStep = async () => {
    if (!waTestPhone.trim()) {
      setMessageType('error');
      setMessage('Informe o número de WhatsApp com DDD para testar o disparo da etapa.');
      return;
    }

    setTestingWaSequence(true);
    setWaFallbackPreviewLink(null);
    setMessage('');

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
        if (user?.id) headers['x-amigo-uid'] = user.id;
        if (user?.email) headers['x-amigo-email'] = user.email;
      }

      const renderedMessage = getRenderedWaStepPreview(activeWaStep);
      const stepMode: WhatsAppStepDispatchMode =
        activeWaStep?.dispatchMode === 'immediate' ? 'immediate' : 'scheduled';

      const res = await fetch('/api/whatsapp/renewal-sequence', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: waTestPhone.trim(),
          message: renderedMessage,
          stepTitle: activeWaStep?.title || 'Etapa de Renovação',
          dispatchMode: stepMode,
          whatsapp_api_url: form.whatsapp_api_url,
          whatsapp_api_key: form.whatsapp_api_key,
          whatsapp_instance_name: form.whatsapp_instance_name,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessageType('success');
        setMessage(
          data.message ||
            (stepMode === 'immediate'
              ? 'Disparo imediato preparado com sucesso! Você também pode abrir direto no WhatsApp.'
              : 'Disparo agendado testado com sucesso na API do WhatsApp!')
        );
        if (data.waLink) {
          setWaFallbackPreviewLink(data.waLink);
        }
      } else {
        setMessageType('error');
        setMessage(data.error || 'Falha ao testar disparo na API do WhatsApp.');
      }
    } catch (err: any) {
      setMessageType('error');
      setMessage(err?.message || 'Erro de conexão ao acionar API do WhatsApp.');
    } finally {
      setTestingWaSequence(false);
    }
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
    <div className={embedded ? "text-slate-100 space-y-6" : "min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-6 lg:p-10"}>
      <div className={embedded ? "w-full space-y-6" : "w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto space-y-6"}>
        <ConfigAlert />
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            {!embedded && (
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  href="/admin" 
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar à Central Unificada Admin</span>
                </Link>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                  <CrownIcon />
                  Painel Master Unificado
                </span>
                <ThemeToggle showLabel />
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>⚙️ Configurações Master: Planos (R$ 19,90 / R$ 39,90), Gateways & Automações</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Central única de credenciais de pagamento (Mercado Pago & Stripe), valores oficiais dos planos (Flex R$ 19,90 e Pró R$ 39,90) e automações do sistema.
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
          <div className="config-card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-900/90 border border-slate-800 rounded-3xl max-[400px]:px-2 p-4 sm:p-6 shadow-xl">
            <div className="col-span-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>💳 Integração de Pagamentos</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Escolha de planos (Flex ou Pró), configuração para Cartão de Crédito, PIX e chaves de API
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  form.credit_card_enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {form.credit_card_enabled ? '✓ Cartão de Crédito Habilitado' : 'Cartão Desabilitado'}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  form.credit_card_recurring_enabled
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {form.credit_card_recurring_enabled ? '✓ Recorrência no Cartão Ativa' : 'Recorrência Desativada'}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Planos Flex & Pró Ativos
                </span>
              </div>
            </div>

            {/* 1.1 Escolha de Plano (Flex ou Pró) e Contratação / Checkout Rápido */}
            <div className="col-span-full p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    ESCOLHA DO PLANO PELO USUÁRIO (FLEX OU PRÓ)
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Selecione o Plano para Assinatura ou Teste de Checkout
                  </h3>
                  <p className="text-xs text-slate-400">
                    O usuário pode escolher livremente entre o Plano Flex (R$ 19,90) ou o Plano Pró (R$ 39,90) e pagar via Cartão de Crédito ou PIX.
                  </p>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={syncingOfficialPrices}
                    onClick={handleSyncOfficialPrices}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-95"
                  >
                    {syncingOfficialPrices ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-slate-950" />
                        <span>Sincronizando app_settings...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="text-slate-950" />
                        <span>Sincronizar Preços Oficiais</span>
                      </>
                    )}
                  </button>
                  {officialPricesSyncedAt && (
                    <span className="text-[10px] font-bold text-emerald-300 font-mono flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-400" />
                      <span>
                        Sincronizado no Supabase (Pró 39,90 | Flex 19,90) às {officialPricesSyncedAt}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Card Plano Flex */}
                <div
                  onClick={() => setSelectedPreviewPlan('flex')}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedPreviewPlan === 'flex'
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Plano Flex VIP
                      </span>
                      <input
                        type="radio"
                        name="selected_plan_choice"
                        checked={selectedPreviewPlan === 'flex'}
                        onChange={() => setSelectedPreviewPlan('flex')}
                        className="w-4 h-4 text-cyan-400 bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="flex items-baseline gap-1 pt-1">
                      <span className="text-2xl font-black text-cyan-400 font-mono">
                        R$ {Number(form.flex_plan_price || 19.9).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Ferramentas essenciais de campo, Calculadora Superaquecimento/Sub-resfriamento e Gestão de OS.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-cyan-300 font-bold">
                      {selectedPreviewPlan === 'flex' ? '✓ Plano Flex Selecionado' : 'Clique para selecionar Flex'}
                    </span>
                    <span className="text-slate-400 font-mono">Cartão ou PIX</span>
                  </div>
                </div>

                {/* Card Plano Pró */}
                <div
                  onClick={() => setSelectedPreviewPlan('pro')}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedPreviewPlan === 'pro'
                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Plano Pró Completo (Recomendado)
                      </span>
                      <input
                        type="radio"
                        name="selected_plan_choice"
                        checked={selectedPreviewPlan === 'pro'}
                        onChange={() => setSelectedPreviewPlan('pro')}
                        className="w-4 h-4 text-amber-400 bg-slate-900 border-slate-700"
                      />
                    </div>
                    <div className="flex items-baseline gap-1 pt-1">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        R$ {Number(form.pro_plan_price || 39.9).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-xs text-slate-400">/ mês</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Ordens de Serviço ilimitadas com QR Code PMOC, Diagnóstico IA ilimitado, Leitor OCR e WhatsApp.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-amber-300 font-bold">
                      {selectedPreviewPlan === 'pro' ? '✓ Plano Pró Selecionado' : 'Clique para selecionar Pró'}
                    </span>
                    <span className="text-slate-400 font-mono">Cartão ou PIX</span>
                  </div>
                </div>
              </div>

              {/* Escolha do Método (Cartão de Crédito ou PIX) e Botão de Gerar Checkout */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewMethod('credit_card')}
                    className={`flex-1 sm:flex-none px-4 py-3 min-h-[48px] rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-98 ${
                      selectedPreviewMethod === 'credit_card'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Pagar no Cartão de Crédito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewMethod('pix')}
                    className={`flex-1 sm:flex-none px-4 py-3 min-h-[48px] rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-98 ${
                      selectedPreviewMethod === 'pix'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <DollarSign size={16} />
                    <span>Pagar via PIX</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={testingCheckout}
                  onClick={() => handleTestCheckoutFlow(selectedPreviewPlan, selectedPreviewMethod)}
                  className="w-full sm:w-auto px-5 py-3.5 min-h-[50px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 touch-manipulation active:scale-98"
                >
                  {testingCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gerando Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-slate-950" />
                      <span>
                        Assinar / Testar {selectedPreviewPlan === 'flex' ? 'Plano Flex' : 'Plano Pró'} (
                        {selectedPreviewMethod === 'credit_card' ? 'Cartão de Crédito' : 'PIX'})
                      </span>
                    </>
                  )}
                </button>
              </div>

              {checkoutPreviewResult && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">
                      ✓ Sessão de Pagamento pronta ({checkoutPreviewResult.plan === 'flex' ? 'Plano Flex' : 'Plano Pró'})
                    </span>
                    <span className="font-mono text-slate-300">
                      R$ {Number(checkoutPreviewResult.amount || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {checkoutPreviewResult.init_point && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <span className="text-slate-300 text-[11px]">
                        Checkout seguro de Cartão de Crédito gerado pelo gateway:
                      </span>
                      <a
                        href={checkoutPreviewResult.init_point}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-5 py-3.5 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm text-center transition flex items-center justify-center"
                      >
                        Abrir Pagamento no Cartão de Crédito →
                      </a>
                    </div>
                  )}
                  {checkoutPreviewResult.pix && (
                    <div className="space-y-2 pt-1">
                      {checkoutPreviewResult.message && (
                        <p className="text-[11px] text-amber-300">{checkoutPreviewResult.message}</p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          readOnly
                          value={checkoutPreviewResult.pix.copy_paste}
                          className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs font-mono text-slate-300 min-h-[48px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(checkoutPreviewResult.pix!.copy_paste);
                            setMessageType('success');
                            setMessage('Código PIX Copia e Cola copiado!');
                          }}
                          className="w-full sm:w-auto px-5 py-3.5 min-h-[48px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer shrink-0 flex items-center justify-center gap-2 active:scale-98"
                        >
                          Copiar Código PIX
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 1.2 Configuração de Preços e Gateway Principal */}
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Gateway Principal de Pagamento
                </label>
                <select
                  value={form.payment_provider}
                  onChange={(e) => setForm({ ...form, payment_provider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[50px] cursor-pointer"
                >
                  <option value="mercadopago">Mercado Pago (Cartão de Crédito & Pix)</option>
                  <option value="stripe">Stripe (Cartão de Crédito Nacional & Internacional)</option>
                  <option value="asaas">Asaas (Cartão, Boleto & Pix)</option>
                  <option value="manual">Transferência Pix Direta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Valor do Plano Flex (Mensal R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-cyan-400 pointer-events-none">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.flex_plan_price}
                    onChange={(e) => setForm({ ...form, flex_plan_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 min-h-[50px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Valor do Plano Pró VIP (Mensal R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400 pointer-events-none">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.pro_plan_price}
                    onChange={(e) => setForm({ ...form, pro_plan_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[50px]"
                  />
                </div>
              </div>
            </div>

            {/* 1.3 Configuração para Pagamento no Cartão de Crédito & Recorrência */}
            <div className="col-span-full p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-sky-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    CONFIGURAÇÃO DE CARTÃO DE CRÉDITO & RECORRÊNCIA (STRIPE / MERCADO PAGO)
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    <CreditCard size={16} className="text-sky-400" />
                    <span>Opções de Recebimento e Assinatura Recorrente no Cartão de Crédito</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Habilite ou desabilite pagamentos recorrentes por cartão de crédito para os planos Flex e Pró e escolha o gateway (Stripe ou Mercado Pago).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer min-h-[48px] w-full sm:w-auto touch-manipulation">
                    <input
                      type="checkbox"
                      checked={Boolean(form.credit_card_enabled)}
                      onChange={(e) => setForm({ ...form, credit_card_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs font-bold text-white">Habilitar Cartão de Crédito</span>
                  </label>

                  <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 cursor-pointer min-h-[48px] w-full sm:w-auto touch-manipulation">
                    <input
                      type="checkbox"
                      disabled={!form.credit_card_enabled}
                      checked={Boolean(form.credit_card_recurring_enabled)}
                      onChange={(e) =>
                        setForm({ ...form, credit_card_recurring_enabled: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-700 disabled:opacity-40"
                    />
                    <span className="text-xs font-bold text-indigo-300">
                      Pagamentos Recorrentes no Cartão
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Processador do Cartão de Crédito
                  </label>
                  <select
                    value={form.credit_card_gateway || 'auto'}
                    onChange={(e) => setForm({ ...form, credit_card_gateway: e.target.value })}
                    disabled={!form.credit_card_enabled}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-medium focus:outline-none focus:border-sky-500 disabled:opacity-50 cursor-pointer min-h-[50px]"
                  >
                    <option value="auto">Automático (Segue Gateway Principal)</option>
                    <option value="stripe">Stripe (Cartão Recorrente Nacional & Internacional)</option>
                    <option value="mercadopago">Mercado Pago (Cartão Nacional / Recorrente)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Modo de Cobrança no Cartão
                  </label>
                  <select
                    value={form.credit_card_recurring_enabled ? 'recurring' : 'single_30d'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        credit_card_recurring_enabled: e.target.value === 'recurring',
                      })
                    }
                    disabled={!form.credit_card_enabled}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-50 cursor-pointer min-h-[50px]"
                  >
                    <option value="recurring">Assinatura Recorrente Mensal (Automática)</option>
                    <option value="single_30d">Cobrança Avulsa de 30 Dias (Sem Recorrência)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Parcelamento Máximo no Cartão
                  </label>
                  <select
                    value={form.credit_card_max_installments || 12}
                    onChange={(e) =>
                      setForm({ ...form, credit_card_max_installments: Number(e.target.value) || 12 })
                    }
                    disabled={!form.credit_card_enabled}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 disabled:opacity-50 cursor-pointer min-h-[50px]"
                  >
                    <option value={1}>À vista (1x no Cartão / Assinatura Mensal)</option>
                    <option value={2}>Até 2x no Cartão</option>
                    <option value={3}>Até 3x no Cartão</option>
                    <option value={6}>Até 6x no Cartão</option>
                    <option value={10}>Até 10x no Cartão</option>
                    <option value={12}>Até 12x no Cartão</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Pagamento via PIX Instantâneo
                  </label>
                  <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer min-h-[50px]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.pix_enabled)}
                      onChange={(e) => setForm({ ...form, pix_enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">Habilitar PIX em paralelo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 1.4 Credenciais Mercado Pago (Cartão & PIX) */}
            <div
              id="mercadopago-credentials-section"
              className={`col-span-full p-4 sm:p-5 rounded-2xl bg-slate-950/90 border space-y-4 shadow-lg transition-all duration-300 ${
                mpValidationStage === 'verified'
                  ? 'border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                  : mpValidationStage === 'error'
                    ? 'border-rose-500/50'
                    : 'border-amber-500/35'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <CreditCard size={15} />
                    <span>Credenciais Mercado Pago (Cartão de Crédito &amp; PIX)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Informe suas chaves de produção ou teste (`APP_USR-...` / `TEST-...`). O status de sucesso só é ativado após a confirmação real do teste de conexão.
                  </p>
                </div>

                {/* Badge indica sucesso APENAS após confirmação do teste de conexão */}
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border shrink-0 self-start sm:self-center flex items-center gap-1.5 transition-all ${
                    mpValidationStage === 'verified'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : mpValidationStage === 'testing_connection' ||
                          mpValidationStage === 'saving_credentials'
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                        : mpValidationStage === 'error'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          : form.mercadopago_access_token?.trim()
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {mpValidationStage === 'verified' ? (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>
                        Conexão Confirmada &amp; Salva
                        {mpValidationMeta?.latencyMs ? ` (${mpValidationMeta.latencyMs}ms)` : ''}
                      </span>
                    </>
                  ) : mpValidationStage === 'testing_connection' ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-sky-400" />
                      <span className="font-mono">
                        Em verificação • {mpLiveLatencyMs}ms
                      </span>
                    </>
                  ) : mpValidationStage === 'saving_credentials' ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-emerald-400" />
                      <span className="font-mono">
                        Em verificação (Salvando) • {mpValidationMeta?.latencyMs || mpLiveLatencyMs}ms
                      </span>
                    </>
                  ) : mpValidationStage === 'error' ? (
                    <>
                      <AlertCircle size={12} className="text-rose-400" />
                      <span>
                        Falha no Teste de Conexão
                        {mpValidationMeta?.latencyMs ? ` (${mpValidationMeta.latencyMs}ms)` : ''}
                      </span>
                    </>
                  ) : form.mercadopago_access_token?.trim() ? (
                    <>
                      <Clock size={12} className="text-amber-400" />
                      <span>Pendente: Teste a Conexão para Validar</span>
                    </>
                  ) : (
                    <span>Aguardando Credenciais</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between min-h-[48px] sm:min-h-0 mb-1.5 gap-2">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>Mercado Pago Access Token (Privado) *</span>
                      {isMpTokenPermanentlyHidden && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                          <Lock size={10} />
                          <span>Oculto Permanentemente</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowMpAccessToken((v) => !v)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                        title={
                          showMpAccessToken
                            ? 'Ocultar temporariamente o Access Token'
                            : 'Alternar temporariamente a visibilidade do Access Token'
                        }
                      >
                        {showMpAccessToken ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showMpAccessToken ? 'Ocultar' : 'Mostrar Token'}</span>
                      </button>

                      {isMpTokenPermanentlyHidden && (
                        <button
                          type="button"
                          onClick={handleReplacePermanentlyHiddenMpToken}
                          className="text-[11px] text-slate-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer border-l border-slate-800 pl-2.5"
                          title="Limpa o token atual bloqueado para cadastrar um novo"
                        >
                          <RotateCcw size={12} />
                          <span>Substituir Token</span>
                        </button>
                      )}
                    </div>
                  </label>

                  {isMpTokenPermanentlyHidden && form.mercadopago_access_token ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        aria-label="Access Token protegido pela política de segurança permanente"
                        value={
                          showMpAccessToken
                            ? rawMpAccessToken || form.mercadopago_access_token
                            : maskMpAccessToken(rawMpAccessToken || form.mercadopago_access_token)
                        }
                        className={`w-full bg-slate-900/70 rounded-xl pl-3.5 pr-40 py-3 text-sm sm:text-xs font-mono min-h-[50px] transition-colors ${
                          showMpAccessToken
                            ? 'border border-amber-500/45 text-amber-200 select-all'
                            : 'border border-emerald-500/35 text-emerald-300 select-none cursor-not-allowed'
                        }`}
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 bg-slate-950/90 px-2 py-1 rounded-lg border ${
                            showMpAccessToken
                              ? 'text-amber-300 border-amber-500/35'
                              : 'text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <ShieldCheck
                            size={12}
                            className={showMpAccessToken ? 'text-amber-400' : 'text-emerald-400'}
                          />
                          <span>{showMpAccessToken ? 'Visível Temp.' : 'Mascarado'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMpAccessToken((v) => !v)}
                          aria-label={
                            showMpAccessToken
                              ? 'Ocultar Access Token novamente'
                              : 'Alternar temporariamente a visibilidade do Access Token'
                          }
                          title={
                            showMpAccessToken
                              ? 'Ocultar novamente o Access Token'
                              : 'Visualizar temporariamente o Access Token completo'
                          }
                          className={`p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                            showMpAccessToken
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/40'
                          }`}
                        >
                          {showMpAccessToken ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type={showMpAccessToken ? 'text' : 'password'}
                        autoComplete="off"
                        placeholder="APP_USR-..."
                        value={form.mercadopago_access_token}
                        onChange={(e) =>
                          updateMercadoPagoField('mercadopago_access_token', e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-11 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[50px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpAccessToken((v) => !v)}
                        aria-label={
                          showMpAccessToken
                            ? 'Ocultar Access Token'
                            : 'Mostrar Access Token temporariamente'
                        }
                        title={
                          showMpAccessToken
                            ? 'Ocultar Access Token'
                            : 'Mostrar Access Token temporariamente'
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition flex items-center justify-center cursor-pointer"
                      >
                        {showMpAccessToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  )}

                  {/* Indicador de status 'Em verificação' com latência e Conta Conectada logo abaixo do campo de Token */}
                  <div className="mt-2 min-h-[28px]">
                    {mpValidationStage === 'testing_connection' ||
                    mpValidationStage === 'saving_credentials' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200 animate-pulse">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Loader2 size={13} className="animate-spin text-sky-400 shrink-0" />
                          <span>Em verificação</span>
                          <span className="text-sky-400/80 font-normal">
                            {mpValidationStage === 'testing_connection'
                              ? '• Testando autenticidade do Token na API...'
                              : `• Conta ${mpValidationMeta?.accountLabel || 'identificada'} validada, salvando...`}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-sky-500/30 font-mono text-[10px] font-bold text-sky-300">
                          Latência:{' '}
                          {mpValidationStage === 'saving_credentials' && mpValidationMeta?.latencyMs
                            ? mpValidationMeta.latencyMs
                            : mpLiveLatencyMs}
                          ms
                        </span>
                      </div>
                    ) : mpValidationStage === 'verified' && mpValidationMeta?.accountLabel ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-300/90 font-medium">Conta conectada:</span>
                          <span className="font-bold text-white font-mono">
                            {mpValidationMeta.accountLabel}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                              mpValidationMeta.environment === 'sandbox'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {mpValidationMeta.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {typeof mpValidationMeta.latencyMs === 'number' && (
                            <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-300">
                              Latência: {mpValidationMeta.latencyMs}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ) : mpValidationStage === 'error' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-rose-400 shrink-0" />
                          <span className="font-semibold">
                            Verificação recusada pela API do Mercado Pago
                          </span>
                        </div>
                        {typeof mpValidationMeta?.latencyMs === 'number' && (
                          <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-rose-500/30 font-mono text-[10px] font-bold text-rose-300">
                            Latência: {mpValidationMeta.latencyMs}ms
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 px-1">
                        <Clock size={11} className="text-slate-500 shrink-0" />
                        <span>
                          Clique em <strong className="text-slate-400">Testar e Salvar Mercado Pago</strong> para verificar a latência e exibir a conta conectada.
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Mercado Pago Public Key (Pública - Checkout Cartão)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="APP_USR-..."
                    value={form.mercadopago_public_key}
                    onChange={(e) =>
                      updateMercadoPagoField('mercadopago_public_key', e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[50px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Segredo do Webhook Mercado Pago (Opcional)
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Segredo de validação de eventos do gateway"
                    value={form.webhook_secret}
                    onChange={(e) => updateMercadoPagoField('webhook_secret', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 min-h-[50px]"
                  />
                </div>

                {/* Opção de Segurança: Ocultar Access Token permanentemente após a confirmação do teste de conexão */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 min-h-[50px]">
                  <label className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={hideMpTokenPermanentlyAfterValidation}
                      disabled={isMpTokenPermanentlyHidden}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHideMpTokenPermanentlyAfterValidation(checked);
                        const shouldMaskNow =
                          checked &&
                          mpValidationStage === 'verified' &&
                          Boolean(form.mercadopago_access_token);

                        if (shouldMaskNow) {
                          if (!isMaskedMpToken(form.mercadopago_access_token)) {
                            setRawMpAccessToken(form.mercadopago_access_token);
                          }
                          const maskedVal = maskMpAccessToken(
                            rawMpAccessToken || form.mercadopago_access_token
                          );
                          setIsMpTokenPermanentlyHidden(true);
                          setShowMpAccessToken(false);
                          setForm((prev) => ({
                            ...prev,
                            mercadopago_access_token: maskedVal,
                          }));
                        }

                        if (typeof window !== 'undefined') {
                          try {
                            const raw = localStorage.getItem('amigo_mp_credentials_backup');
                            const parsed = raw ? JSON.parse(raw) : {};
                            localStorage.setItem(
                              'amigo_mp_credentials_backup',
                              JSON.stringify({
                                ...parsed,
                                mercadopago_access_token: shouldMaskNow
                                  ? maskMpAccessToken(
                                      rawMpAccessToken || form.mercadopago_access_token
                                    )
                                  : parsed.mercadopago_access_token,
                                mercadopago_access_token_raw: !isMaskedMpToken(
                                  form.mercadopago_access_token
                                )
                                  ? form.mercadopago_access_token
                                  : rawMpAccessToken || parsed.mercadopago_access_token_raw,
                                hideAfterValidationPref: checked,
                                permanentlyHidden: shouldMaskNow
                                  ? true
                                  : parsed.permanentlyHidden,
                              })
                            );
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 mt-0.5 sm:mt-0 shrink-0 disabled:opacity-60"
                    />
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <Lock size={11} className="text-amber-400 shrink-0" />
                        <span>
                          Ocultar Access Token permanentemente após confirmação do teste
                        </span>
                      </span>
                      <span className="text-slate-400 block mt-0.5">
                        {isMpTokenPermanentlyHidden
                          ? 'Valor mascarado permanentemente após confirmação da conexão.'
                          : 'Mascara o valor do token automaticamente assim que o teste de conexão é confirmado.'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Barra visual de progresso assíncrono durante o teste / confirmação */}
              {(mpValidationStage === 'testing_connection' ||
                mpValidationStage === 'saving_credentials' ||
                mpValidationStage === 'verified') && (
                <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span
                      className={`flex items-center gap-1.5 font-bold ${
                        mpValidationStage === 'testing_connection'
                          ? 'text-sky-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      {mpValidationStage === 'testing_connection' ? (
                        <Loader2 size={13} className="animate-spin text-sky-400" />
                      ) : (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      )}
                      <span>1. Teste de Conexão API Mercado Pago</span>
                    </span>

                    <span className="text-slate-600">→</span>

                    <span
                      className={`flex items-center gap-1.5 font-bold ${
                        mpValidationStage === 'saving_credentials'
                          ? 'text-amber-300'
                          : mpValidationStage === 'verified'
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {mpValidationStage === 'saving_credentials' ? (
                        <Loader2 size={13} className="animate-spin text-amber-400" />
                      ) : mpValidationStage === 'verified' ? (
                        <CheckCircle2 size={13} className="text-emerald-400" />
                      ) : (
                        <Clock size={13} />
                      )}
                      <span>2. Persistência Segura &amp; Ativação</span>
                    </span>
                  </div>

                  {mpValidationStage === 'verified' && mpValidationMeta && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300/90">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                        {mpValidationMeta.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
                      </span>
                      {mpValidationMeta.accountLabel && (
                        <span>Conta: {mpValidationMeta.accountLabel}</span>
                      )}
                      {mpValidationMeta.latencyMs && (
                        <span>• {mpValidationMeta.latencyMs}ms</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mpStatusMessage && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                    mpStatusMessage.type === 'success' && mpValidationStage === 'verified'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {mpStatusMessage.type === 'success' && mpValidationStage === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{mpStatusMessage.text}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Valida a conexão na API do Mercado Pago e salva exclusivamente esta seção após confirmação.
                  </span>
                  {mpTestLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearMpLogsModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-[11px] font-bold text-slate-300 hover:text-rose-300 transition inline-flex items-center gap-1.5 cursor-pointer"
                      title="Gerenciar e limpar armazenamento de logs de conexão do Mercado Pago"
                    >
                      <Trash2 size={12} className="text-rose-400" />
                      <span>Limpar Logs ({mpTestLogs.length}/5)</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestAndSaveMercadoPago}
                  disabled={savingSection !== null}
                  className={`w-full sm:w-auto py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 min-h-[50px] touch-manipulation active:scale-98 shrink-0 ${
                    mpValidationStage === 'verified'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {savingSection === 'mercadopago' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>
                        {mpValidationStage === 'testing_connection'
                          ? 'Validando Conexão Mercado Pago...'
                          : 'Conexão Confirmada! Salvando...'}
                      </span>
                    </>
                  ) : mpValidationStage === 'verified' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Conexão Validada e Salva (Revalidar Mercado Pago)</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Testar Conexão e Salvar Credenciais Mercado Pago</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1.4.1 Histórico de Eventos de Conexão — Mercado Pago (Últimos 5 Logs de Teste) */}
            <div
              id="mercadopago-events-history-section"
              className="col-span-full p-4 sm:p-5 rounded-2xl bg-slate-950/85 border border-slate-800/90 space-y-4 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 flex-wrap">
                      <span>Histórico de Eventos Mercado Pago (Últimos 5 Testes de Conexão)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-amber-300">
                        {mpTestLogs.length}/5 logs armazenados
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Registro técnico de diagnóstico com status, data/hora exata, latência e detalhes de possíveis erros para suporte técnico.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  {mpTestLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const report = mpTestLogs
                          .map(
                            (log, idx) =>
                              `#${idx + 1} [${log.timestamp}] Status: ${log.status.toUpperCase()} | Ambiente: ${
                                log.environment || 'N/A'
                              } | Latência: ${log.latencyMs ? `${log.latencyMs}ms` : 'N/A'} | Token: ${
                                log.maskedToken || 'N/A'
                              } | Msg: ${log.message}${
                                log.errorDetail ? ` | Erro: ${log.errorDetail}` : ''
                              }`
                          )
                          .join('\n');
                        navigator.clipboard.writeText(report);
                        setMessageType('success');
                        setMessage('Relatório dos últimos 5 testes do Mercado Pago copiado para suporte!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={12} className="text-amber-400" />
                      <span>Copiar Logs p/ Suporte</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={mpTestLogs.length === 0 || isClearingMpLogs}
                    onClick={() => setShowClearMpLogsModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-[11px] font-bold text-slate-300 hover:text-rose-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    title="Limpar logs de conexão armazenados com confirmação prévia"
                  >
                    <Trash2 size={12} className="text-rose-400" />
                    <span>Limpar Logs</span>
                  </button>
                </div>
              </div>

              {/* Modal de Confirmação Prévia para Limpar Logs de Conexão do Mercado Pago */}
              {showClearMpLogsModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="clear-mp-logs-modal-title"
                >
                  <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3
                          id="clear-mp-logs-modal-title"
                          className="text-sm sm:text-base font-black text-white flex items-center gap-2"
                        >
                          Confirmar Limpeza de Logs do Mercado Pago?
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Você está prestes a remover permanentemente{' '}
                          <strong className="text-rose-300 font-bold">
                            {mpTestLogs.length} {mpTestLogs.length === 1 ? 'registro' : 'registros'} de evento
                          </strong>{' '}
                          do histórico de testes de conexão do Mercado Pago.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-300">Armazenamento ocupado:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {mpTestLogs.length}/5 slots de diagnóstico
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        • Os logs serão apagados do armazenamento local e sincronizados com o servidor.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        • Suas credenciais salvas (Access Token, Public Key e Webhook) <strong className="text-emerald-300">não serão afetadas</strong>.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        disabled={isClearingMpLogs}
                        onClick={() => setShowClearMpLogsModal(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isClearingMpLogs}
                        onClick={handleConfirmClearMpLogs}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-black text-white shadow-lg shadow-rose-950/50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isClearingMpLogs ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Limpando Armazenamento...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={14} />
                            <span>Confirmar e Limpar Logs</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mpTestLogs.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    Nenhum teste de conexão registrado nesta sessão.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Clique em &ldquo;Testar Conexão e Salvar Credenciais Mercado Pago&rdquo; acima para gerar logs de diagnóstico para o suporte técnico.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mpTestLogs.slice(0, 5).map((log, index) => (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col gap-2 ${
                        log.status === 'success'
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : 'bg-rose-950/20 border-rose-500/35'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            #{index + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                              log.status === 'success'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {log.status === 'success' ? (
                              <>
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                <span>Sucesso</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle size={11} className="text-rose-400" />
                                <span>Erro de Conexão</span>
                              </>
                            )}
                          </span>

                          {log.environment && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                              {log.environment === 'sandbox' ? 'SANDBOX' : 'PRODUÇÃO'}
                            </span>
                          )}

                          {log.latencyMs !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ⚡ {log.latencyMs}ms
                            </span>
                          )}

                          {log.accountLabel && (
                            <span className="text-[10px] font-semibold text-emerald-300/90">
                              • Conta: {log.accountLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                          <Clock size={11} className="text-slate-500" />
                          <span>{log.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span
                          className={
                            log.status === 'success' ? 'text-slate-200 font-medium' : 'text-rose-200 font-medium'
                          }
                        >
                          {log.message}
                        </span>
                        {log.maskedToken && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 self-start sm:self-center shrink-0">
                            Token: {log.maskedToken}
                          </span>
                        )}
                      </div>

                      {log.errorDetail && (
                        <div className="p-2.5 rounded-lg bg-slate-950/90 border border-rose-500/25 text-[11px] font-mono text-rose-300 flex items-start gap-2">
                          <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 break-all">
                            <span className="text-[10px] uppercase font-bold text-rose-400 block">
                              Diagnóstico Técnico do Erro:
                            </span>
                            <span>{log.errorDetail}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1.5 Credenciais Stripe (Cartão de Crédito Nacional & Internacional) */}
            <div className="col-span-full space-y-4 pt-3 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Credenciais Gateway Stripe (Cartão de Crédito Recorrente & Internacional)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Endpoint de Webhook Stripe: <code className="text-sky-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">/api/webhooks/stripe</code>
                  </p>
                </div>
                <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-sky-500/10 border border-sky-500/30 cursor-pointer w-full sm:w-auto min-h-[48px] touch-manipulation">
                  <input
                    type="checkbox"
                    checked={Boolean(form.credit_card_recurring_enabled)}
                    onChange={(e) =>
                      setForm({ ...form, credit_card_recurring_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs sm:text-[11px] font-bold text-sky-300">
                    Habilitar Cobrança Recorrente no Cartão (Stripe)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Secret Key (Chave Secreta Cartão)
                  </label>
                  <input
                    type="password"
                    placeholder="sk_live_... ou sk_test_..."
                    value={form.stripe_secret_key}
                    onChange={(e) => setForm({ ...form, stripe_secret_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[50px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Publishable Key (Chave Pública Cartão)
                  </label>
                  <input
                    type="text"
                    placeholder="pk_live_... ou pk_test_..."
                    value={form.stripe_publishable_key}
                    onChange={(e) => setForm({ ...form, stripe_publishable_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[50px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Webhook Secret (whsec_...)
                  </label>
                  <input
                    type="text"
                    placeholder="whsec_..."
                    value={form.stripe_webhook_secret}
                    onChange={(e) => setForm({ ...form, stripe_webhook_secret: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[50px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Moeda de Cobrança no Cartão (Stripe)
                  </label>
                  <select
                    value={form.stripe_currency || 'BRL'}
                    onChange={(e) => setForm({ ...form, stripe_currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 min-h-[50px] cursor-pointer"
                  >
                    <option value="BRL">BRL (Real Brasileiro - R$)</option>
                    <option value="USD">USD (Dólar Americano - US$)</option>
                    <option value="EUR">EUR (Euro - €)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="col-span-full bg-slate-900 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
              <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                <Sparkles size={16} /> Stripe Connect (Configuração Personalizada)
              </h4>
              <p className="text-xs text-slate-400">
                Configure suas próprias credenciais Stripe para receber pagamentos diretamente em sua conta Connect.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Connect Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="ca_..."
                    value={form.stripe_connect_client_id}
                    onChange={(e) => setForm({ ...form, stripe_connect_client_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[50px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Connect Secret Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk_..."
                    value={form.stripe_connect_secret_key}
                    onChange={(e) => setForm({ ...form, stripe_connect_secret_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[50px]"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Webhook URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://sua-url.com/api/webhooks/stripe"
                    value={form.stripe_webhook_url}
                    onChange={(e) => setForm({ ...form, stripe_webhook_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[50px]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                    Stripe Webhook Secret (whsec_...)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      placeholder="whsec_..."
                      value={form.stripe_webhook_secret}
                      onChange={(e) => setForm({ ...form, stripe_webhook_secret: e.target.value })}
                      className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[50px]"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateWebhookSecret}
                      className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md cursor-pointer min-h-[52px] flex items-center justify-center gap-2 active:scale-98 touch-manipulation"
                    >
                      <Sparkles size={16} />
                      <span>Gerar Novo Segredo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Salvar Exclusivo: Pagamentos */}
            <div className="col-span-full pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={handleTestStripeConnection}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-50 min-h-[52px] touch-manipulation active:scale-98"
              >
                {savingSection === 'payments' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Testar Conexão Stripe</span>
              </button>

              <button
                type="button"
                onClick={handleSavePayments}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer disabled:opacity-50 min-h-[52px] touch-manipulation active:scale-98"
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
          <div className="config-card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-[400px]:px-2 p-4 sm:p-6 shadow-xl">
            <div className="col-span-full flex items-center gap-3 border-b border-slate-800 pb-4">
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

            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Intervalo de Manutenção Preventiva (Meses)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="24"
                  value={form.maintenance_interval_months}
                  onChange={(e) => setForm({ ...form, maintenance_interval_months: parseInt(e.target.value) || 6 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[48px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Padrão em meses para agendamento automático após conclusão do serviço.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Dias de Teste Grátis (Trial)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="90"
                  value={form.free_trial_days}
                  onChange={(e) => setForm({ ...form, free_trial_days: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[48px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dias de degustação das funções VIP para novos cadastros.
                </p>
              </div>
            </div>

            {/* Botão de Salvar Exclusivo: Automação e Regras */}
            <div className="col-span-full pt-2 border-t border-slate-800/80 flex justify-end">
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
          <div className="config-card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-slate-900/90 border border-slate-800 rounded-3xl max-[400px]:px-2 p-4 sm:p-6 shadow-xl">
            <div className="col-span-full flex items-center gap-3 border-b border-slate-800 pb-4">
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

            <div className="col-span-full grid grid-cols-1 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  URL do Servidor de WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="https://api.seu-whatsapp.com"
                  value={form.whatsapp_api_url}
                  onChange={(e) => setForm({ ...form, whatsapp_api_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[48px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Chave Global da API
                </label>
                <input
                  type="password"
                  placeholder="Chave secreta de autenticação do servidor"
                  value={form.whatsapp_api_key}
                  onChange={(e) => setForm({ ...form, whatsapp_api_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[48px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center min-h-[48px] sm:min-h-0 sm:block mb-1.5">
                  Nome da Instância Master
                </label>
                <input
                  type="text"
                  placeholder="Ex: amigo_master_bot"
                  value={form.whatsapp_instance_name}
                  onChange={(e) => setForm({ ...form, whatsapp_instance_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[48px]"
                />
              </div>
            </div>

            {/* Botão de Salvar Exclusivo: WhatsApp Master */}
            <div className="col-span-full pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveWhatsApp}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50 min-h-[48px] active:scale-98"
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

          {/* Bloco 4: Templates de E-mail & Regras de Disparo Automático de Lembretes de Renovação (SMTP) */}
          <div
            id="smtp-renewal-automation-section"
            className="config-card-container grid grid-cols-1 gap-6 bg-slate-900/95 border border-purple-500/35 rounded-3xl max-[400px]:px-2 p-4 sm:p-6 shadow-xl"
          >
            {/* Cabeçalho da Seção SMTP de Renovação */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Mail size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      📧 Templates de E-mail & Disparo Automático de Renovação (SMTP)
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        form.smtp_renewal_enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {form.smtp_renewal_enabled ? '✓ Disparo Automático Ativo' : 'Disparo Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure templates personalizados e regras de envio automático de lembretes de renovação de assinaturas via servidor SMTP.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/40 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(form.smtp_renewal_enabled)}
                  onChange={(e) => setForm({ ...form, smtp_renewal_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-500 bg-slate-950 border-slate-700"
                />
                <span className="text-xs font-black text-purple-200">
                  Ativar Disparo Automático SMTP
                </span>
              </label>
            </div>

            {/* 4.1 Regras de Gatilho e Janelas de Disparo Automático */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <BellRing size={15} className="text-purple-400" />
                  <span>1. Regras de Gatilho & Agendamento de Disparo</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Rotina diária via SMTP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    1º Aviso Preventivo (Dias antes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.smtp_renewal_days_before}
                    onChange={(e) =>
                      setForm({ ...form, smtp_renewal_days_before: parseInt(e.target.value) || 7 })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Ex: 7 dias antes de vencer
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    2º Alerta Urgente (Dias antes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={form.smtp_renewal_urgent_days_before}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        smtp_renewal_urgent_days_before: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Ex: 1 dia antes (véspera)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    3º Pós-Vencimento (Dias após)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.smtp_renewal_expired_days_after}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        smtp_renewal_expired_days_after: parseInt(e.target.value) || 2,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Ex: 2 dias após vencer
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Horário do Disparo Diário
                  </label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="time"
                      value={form.smtp_renewal_send_time}
                      onChange={(e) =>
                        setForm({ ...form, smtp_renewal_send_time: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Horário oficial de Brasília
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Planos Monitorados
                  </label>
                  <select
                    value={form.smtp_renewal_target_plans}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        smtp_renewal_target_plans: e.target.value as 'all' | 'pro' | 'flex',
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">Todos (Plano Pró & Flex)</option>
                    <option value="pro">Somente Assinantes Pró</option>
                    <option value="flex">Somente Assinantes Flex</option>
                  </select>
                  <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.smtp_renewal_copy_admin)}
                      onChange={(e) =>
                        setForm({ ...form, smtp_renewal_copy_admin: e.target.checked })
                      }
                      className="w-3.5 h-3.5 rounded text-purple-500 bg-slate-950 border-slate-700"
                    />
                    <span className="text-[10px] text-slate-400">
                      Cópia oculta (BCC) p/ Admin
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 4.2 Editor de Templates de E-mail com Variáveis Dinâmicas e Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-2">
                    <FileText size={15} className="text-sky-400" />
                    <span>2. Editor de Templates de E-mail de Renovação</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultRenewalTemplates}
                    className="text-[11px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>

                {/* Abas de Seleção do Estágio do Template */}
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      id: 'preventive',
                      label: `1. Preventivo (${form.smtp_renewal_days_before}d antes)`,
                      badgeClass: 'bg-sky-500 text-slate-950',
                    },
                    {
                      id: 'urgent',
                      label: `2. Urgente / Véspera (${form.smtp_renewal_urgent_days_before}d antes)`,
                      badgeClass: 'bg-amber-500 text-slate-950',
                    },
                    {
                      id: 'expired',
                      label: `3. Pós-Vencimento (+${form.smtp_renewal_expired_days_after}d)`,
                      badgeClass: 'bg-rose-500 text-white',
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setActiveEmailTemplateTab(tab.id as 'preventive' | 'urgent' | 'expired')
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                        activeEmailTemplateTab === tab.id
                          ? tab.badgeClass
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Pílulas de Variáveis Dinâmicas para Inserção em 1 Clique */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Clique para inserir variável dinâmica no corpo do e-mail:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { token: '{nome}', desc: 'Nome do Técnico' },
                      { token: '{plano}', desc: 'Nome do Plano' },
                      { token: '{valor}', desc: 'Valor da Mensalidade' },
                      { token: '{data_vencimento}', desc: 'Data de Vencimento' },
                      { token: '{dias_restantes}', desc: 'Dias Restantes' },
                      { token: '{link_renovacao}', desc: 'Link Direto Checkout' },
                    ].map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => handleInsertTemplateVariable(v.token)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-500/20 border border-slate-800 hover:border-purple-500/40 text-[11px] font-mono text-purple-300 transition cursor-pointer"
                        title={`Inserir ${v.desc}`}
                      >
                        + {v.token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campos Assunto e Corpo do Template Ativo */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Assunto do E-mail:
                    </label>
                    <input
                      type="text"
                      value={
                        activeEmailTemplateTab === 'preventive'
                          ? form.smtp_renewal_subject_preventive
                          : activeEmailTemplateTab === 'urgent'
                          ? form.smtp_renewal_subject_urgent
                          : form.smtp_renewal_subject_expired
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeEmailTemplateTab === 'preventive') {
                          setForm({ ...form, smtp_renewal_subject_preventive: val });
                        } else if (activeEmailTemplateTab === 'urgent') {
                          setForm({ ...form, smtp_renewal_subject_urgent: val });
                        } else {
                          setForm({ ...form, smtp_renewal_subject_expired: val });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Corpo da Mensagem de Renovação:
                    </label>
                    <textarea
                      rows={7}
                      value={
                        activeEmailTemplateTab === 'preventive'
                          ? form.smtp_renewal_body_preventive
                          : activeEmailTemplateTab === 'urgent'
                          ? form.smtp_renewal_body_urgent
                          : form.smtp_renewal_body_expired
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeEmailTemplateTab === 'preventive') {
                          setForm({ ...form, smtp_renewal_body_preventive: val });
                        } else if (activeEmailTemplateTab === 'urgent') {
                          setForm({ ...form, smtp_renewal_body_urgent: val });
                        } else {
                          setForm({ ...form, smtp_renewal_body_expired: val });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4.3 Pré-visualização em Tempo Real + Credenciais SMTP & Disparo de Teste */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                      Pré-visualização do E-mail (Variáveis Aplicadas)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-mono">
                      HTML / SMTP
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Assunto Renderizado:</span>
                      <strong className="text-white block mt-0.5">
                        {getRenderedRenewalPreview().subject}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 whitespace-pre-line text-[11px] leading-relaxed max-h-52 overflow-y-auto">
                      {getRenderedRenewalPreview().body}
                    </div>
                  </div>
                </div>

                {/* Configuração Rápida do Servidor SMTP Existente + Botão de Disparo de Teste */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Mail size={14} className="text-emerald-400" />
                      <span>Conexão SMTP Master & Disparo de Teste</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {form.smtp_host ? `${form.smtp_host}:${form.smtp_port}` : 'SMTP Integrado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Host SMTP (ex: smtp.gmail.com)"
                      value={form.smtp_host}
                      onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Porta (587 ou 465)"
                      value={form.smtp_port}
                      onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Usuário SMTP (E-mail)"
                      value={form.smtp_user}
                      onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Senha / App Password SMTP"
                      value={form.smtp_pass}
                      onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="email"
                      placeholder="E-mail destinatário para teste..."
                      value={smtpTestRecipient}
                      onChange={(e) => setSmtpTestRecipient(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleTestSmtpRenewalDispatch}
                      disabled={testingSmtpRenewal}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {testingSmtpRenewal ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Testar Template via SMTP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Salvar Seção de Templates e Regras SMTP */}
            <div className="pt-3 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSmtpRenewal}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {savingSection === 'smtp_renewal' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Salvando Templates e Regras SMTP...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>Salvar Templates e Disparo Automático SMTP</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bloco 5: Sequência de Templates de Lembretes Automáticos de Renovação via WhatsApp */}
          <div
            id="whatsapp-renewal-sequence-section"
            className="config-card-container grid grid-cols-1 gap-6 bg-slate-900/95 border border-emerald-500/40 rounded-3xl max-[400px]:px-2 p-4 sm:p-6 shadow-xl"
          >
            {/* Cabeçalho do Módulo de Sequência de Renovação WhatsApp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      📲 Sequência de Lembretes Automáticos de Renovação via WhatsApp
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        form.whatsapp_renewal_sequence_enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {form.whatsapp_renewal_sequence_enabled
                        ? `✓ ${sequenceSteps.filter((s) => s.enabled).length} Etapas Ativas`
                        : 'Sequência Pausada'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                      ⚡ {sequenceSteps.filter((s) => s.dispatchMode === 'immediate').length} Imediato(s) · 📅{' '}
                      {sequenceSteps.filter((s) => s.dispatchMode !== 'immediate').length} Agendado(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina a régua sequencial de mensagens de renovação escolhendo entre{' '}
                    <strong className="text-amber-300">Disparo Imediato (envio manual via WhatsApp)</strong> ou{' '}
                    <strong className="text-emerald-300">Disparo Agendado (automático via API)</strong> em cada etapa ({form.whatsapp_instance_name || 'Instância Padrão'}).
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(form.whatsapp_renewal_sequence_enabled)}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp_renewal_sequence_enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700"
                />
                <span className="text-xs font-black text-emerald-200">
                  Ativar Sequência no WhatsApp
                </span>
              </label>
            </div>

            {/* 5.1 Configurações Gerais da Régua & Linha do Tempo de Etapas */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    <BellRing size={15} className="text-emerald-400" />
                    <span>1. Linha do Tempo da Sequência de Renovação ({sequenceSteps.length} etapas)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Use o seletor visual em cada etapa para alternar entre <strong className="text-amber-300">Disparo Imediato (Manual WhatsApp)</strong> e <strong className="text-emerald-300">Disparo Agendado (Automático API)</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultWaSequence}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Restaurar 4 Etapas</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddWaSequenceStep}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar Etapa na Sequência</span>
                  </button>
                </div>
              </div>

              {/* Cards da Sequência (Régua Cronológica) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {sequenceSteps.map((step, idx) => {
                  const isSelected = activeWaStep?.id === step.id;
                  const stepDispatchMode: WhatsAppStepDispatchMode =
                    step.dispatchMode === 'immediate' ? 'immediate' : 'scheduled';
                  const isImmediate = stepDispatchMode === 'immediate';

                  const timingBadge =
                    step.triggerType === 'before_due'
                      ? `${step.daysOffset} dia(s) antes`
                      : step.triggerType === 'on_due'
                      ? 'No dia do vencimento'
                      : `${step.daysOffset} dia(s) após vencer`;

                  return (
                    <div
                      key={step.id}
                      onClick={() => setActiveWaStepId(step.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-950/35 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                          : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                              Passo #{idx + 1}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                                isImmediate
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                              }`}
                            >
                              {isImmediate ? '⚡ Manual' : '🤖 API Auto'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={step.enabled}
                              onChange={(e) =>
                                handleUpdateWaStep(step.id, { enabled: e.target.checked })
                              }
                              className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-700"
                              title="Ativar ou pausar esta etapa"
                            />
                            {sequenceSteps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveWaSequenceStep(step.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                                title="Remover etapa"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <strong className="block text-xs font-bold text-white truncate">
                            {step.title}
                          </strong>
                          <span className="inline-block text-[11px] font-mono font-bold text-amber-300 mt-0.5">
                            ⏱ {timingBadge}
                          </span>
                        </div>

                        {/* Seletor Visual de Modo de Disparo Individual da Etapa */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              Modo de Disparo da Etapa
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold ${
                                isImmediate ? 'text-amber-300' : 'text-emerald-300'
                              }`}
                            >
                              {isImmediate ? 'WhatsApp Manual' : `API (${form.whatsapp_renewal_send_time || '10:00'})`}
                            </span>
                          </div>

                          <div
                            role="group"
                            aria-label={`Modo de disparo para ${step.title}`}
                            className="grid grid-cols-2 gap-1"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectWaStepDispatchMode(step.id, 'immediate', step.title)
                              }
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer border ${
                                isImmediate
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-amber-200 hover:border-amber-500/40'
                              }`}
                              title="Disparo Imediato: envio manual direto via WhatsApp Web/App"
                            >
                              <Zap size={11} className="shrink-0" />
                              <span className="truncate">Disparo Imediato</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSelectWaStepDispatchMode(step.id, 'scheduled', step.title)
                              }
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer border ${
                                !isImmediate
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-emerald-200 hover:border-emerald-500/40'
                              }`}
                              title="Disparo Agendado: envio automático via API no dia configurado"
                            >
                              <CalendarClock size={11} className="shrink-0" />
                              <span className="truncate">Disparo Agendado</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-slate-800/80 pt-2">
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {step.template}
                        </p>
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={`font-semibold ${
                              isImmediate ? 'text-amber-300/90' : 'text-emerald-300/90'
                            }`}
                          >
                            {isImmediate
                              ? '👉 Envio manual 1-clique no WhatsApp'
                              : `🤖 Disparo via API (${timingBadge})`}
                          </span>
                          {isImmediate && (
                            <a
                              href={getDirectWhatsAppManualUrl(step)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1 transition shrink-0"
                              title="Abrir no WhatsApp para disparo manual imediato"
                            >
                              <span>Enviar</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Horário e Filtro de Planos da Fila Automática */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Horário Diário de Disparo (WhatsApp)
                  </label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="time"
                      value={form.whatsapp_renewal_send_time}
                      onChange={(e) =>
                        setForm({ ...form, whatsapp_renewal_send_time: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Planos Alvo da Sequência
                  </label>
                  <select
                    value={form.whatsapp_renewal_target_plans}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        whatsapp_renewal_target_plans: e.target.value as 'all' | 'pro' | 'flex',
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Todos os Assinantes (Pró & Flex)</option>
                    <option value="pro">Somente Assinantes Plano Pró</option>
                    <option value="flex">Somente Assinantes Plano Flex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Status da API WhatsApp Master Vinculada
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate font-mono">
                      {form.whatsapp_api_url
                        ? form.whatsapp_api_url
                        : 'Modo Híbrido (API + Link Direto)'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                      Integrada
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5.2 Editor da Etapa Selecionada + Simulador de Mensagem no WhatsApp */}
            {activeWaStep && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                        2. Editando: {activeWaStep.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                          activeWaStep.dispatchMode === 'immediate'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {activeWaStep.dispatchMode === 'immediate'
                          ? '⚡ Disparo Imediato (Manual WhatsApp)'
                          : '📅 Disparo Agendado (Automático API)'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {activeWaStep.id}
                    </span>
                  </div>

                  {/* Seletor Visual Detalhado na Etapa Selecionada */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-200">
                        Modalidade de Envio desta Etapa ({activeWaStep.title}):
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Escolha entre envio manual via WhatsApp ou disparo agendado via API
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectWaStepDispatchMode(
                            activeWaStep.id,
                            'immediate',
                            activeWaStep.title
                          )
                        }
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                          activeWaStep.dispatchMode === 'immediate'
                            ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.18)]'
                            : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            activeWaStep.dispatchMode === 'immediate'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 text-amber-400 border border-slate-800'
                          }`}
                        >
                          <Zap size={15} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white">
                              Disparo Imediato
                            </span>
                            {activeWaStep.dispatchMode === 'immediate' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-950">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 leading-snug">
                            Envio manual direto via WhatsApp Web/App ou disparo imediato sob demanda pelo administrador.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleSelectWaStepDispatchMode(
                            activeWaStep.id,
                            'scheduled',
                            activeWaStep.title
                          )
                        }
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                          activeWaStep.dispatchMode !== 'immediate'
                            ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                            : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            activeWaStep.dispatchMode !== 'immediate'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-900 text-emerald-400 border border-slate-800'
                          }`}
                        >
                          <CalendarClock size={15} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white">
                              Disparo Agendado
                            </span>
                            {activeWaStep.dispatchMode !== 'immediate' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-400 text-slate-950">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 leading-snug">
                            Envio 100% automático via API do WhatsApp Master na regra de dias e horário ({form.whatsapp_renewal_send_time || '10:00'}).
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Título da Etapa:
                      </label>
                      <input
                        type="text"
                        value={activeWaStep.title}
                        onChange={(e) =>
                          handleUpdateWaStep(activeWaStep.id, { title: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Momento do Gatilho:
                      </label>
                      <select
                        value={activeWaStep.triggerType}
                        onChange={(e) =>
                          handleUpdateWaStep(activeWaStep.id, {
                            triggerType: e.target.value as 'before_due' | 'on_due' | 'after_due',
                            daysOffset: e.target.value === 'on_due' ? 0 : activeWaStep.daysOffset || 1,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="before_due">Antes do Vencimento</option>
                        <option value="on_due">No Dia do Vencimento</option>
                        <option value="after_due">Após o Vencimento</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Quantidade de Dias:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        disabled={activeWaStep.triggerType === 'on_due'}
                        value={activeWaStep.triggerType === 'on_due' ? 0 : activeWaStep.daysOffset}
                        onChange={(e) =>
                          handleUpdateWaStep(activeWaStep.id, {
                            daysOffset: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Variáveis Dinâmicas do Template WhatsApp */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Inserir variável dinâmica na mensagem do WhatsApp:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{nome}', label: 'Nome do Técnico' },
                        { token: '{plano}', label: 'Plano (Pró/Flex)' },
                        { token: '{valor}', label: 'Valor R$' },
                        { token: '{data_vencimento}', label: 'Data Vencimento' },
                        { token: '{dias_restantes}', label: 'Dias' },
                        { token: '{link_renovacao}', label: 'Link Checkout' },
                      ].map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          onClick={() => handleInsertWaVariable(v.token)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-500/40 text-[11px] font-mono text-emerald-300 transition cursor-pointer"
                          title={`Inserir ${v.label}`}
                        >
                          + {v.token}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mensagem do Template WhatsApp (Suporta *negrito* e emojis):
                    </label>
                    <textarea
                      rows={6}
                      value={activeWaStep.template}
                      onChange={(e) =>
                        handleUpdateWaStep(activeWaStep.id, { template: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Preview Estilo Balão do WhatsApp + Teste de Disparo via API Configurada */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0b141a] border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Preview Real no WhatsApp do Técnico
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono">
                        {activeWaStep.title}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#005c4b] text-white text-xs whitespace-pre-line leading-relaxed shadow-md max-h-56 overflow-y-auto">
                      {getRenderedWaStepPreview(activeWaStep)}
                      <div className="text-right text-[10px] text-emerald-200/80 mt-1.5 font-mono">
                        {activeWaStep.dispatchMode === 'immediate'
                          ? 'Disparo Imediato (Manual) ✓✓'
                          : `${form.whatsapp_renewal_send_time || '10:00'} (API Agendada) ✓✓`}
                      </div>
                    </div>
                  </div>

                  {/* Card de Disparo de Teste / Envio Manual conforme o Modo Selecionado */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Phone size={14} className="text-emerald-400" />
                        <span>
                          {activeWaStep.dispatchMode === 'immediate'
                            ? 'Executar Disparo Imediato (Manual ou API)'
                            : 'Testar Disparo Agendado na API WhatsApp'}
                        </span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          activeWaStep.dispatchMode === 'immediate'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {activeWaStep.dispatchMode === 'immediate'
                          ? 'Modo: Imediato'
                          : 'Modo: Agendado'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="WhatsApp c/ DDD (ex: 11999999999)"
                        value={waTestPhone}
                        onChange={(e) => setWaTestPhone(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestWaRenewalSequenceStep}
                        disabled={testingWaSequence}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {testingWaSequence ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Disparando...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>
                              {activeWaStep.dispatchMode === 'immediate'
                                ? 'Disparar Agora (API)'
                                : 'Testar Etapa na API'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-[11px] border-t border-slate-800/80">
                      <span className="text-slate-400">
                        {activeWaStep.dispatchMode === 'immediate'
                          ? 'Etapa em Disparo Imediato — envie manualmente pelo WhatsApp:'
                          : 'Ou envie manualmente pelo WhatsApp Web/App se preferir:'}
                      </span>
                      <a
                        href={waFallbackPreviewLink || getDirectWhatsAppManualUrl(activeWaStep)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3 py-1.5 rounded-xl font-black flex items-center justify-center gap-1.5 shrink-0 transition ${
                          activeWaStep.dispatchMode === 'immediate'
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        <Zap size={12} />
                        <span>Enviar Manualmente via WhatsApp</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Salvar Sequência de Renovação WhatsApp */}
            <div className="pt-3 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={handleSaveWhatsAppRenewalSequence}
                disabled={savingSection !== null}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {savingSection === 'whatsapp_renewal' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Salvando Sequência de Renovação WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Salvar Sequência de Lembretes via WhatsApp</span>
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
