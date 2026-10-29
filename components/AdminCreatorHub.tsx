'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Crown,
  Zap,
  TrendingUp,
  DollarSign,
  Search,
  RefreshCw,
  Download,
  MessageSquare,
  Phone,
  Mail,
  Wrench,
  FileText,
  Cpu,
  Database,
  Key,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Settings,
  ExternalLink,
  Copy,
  Plus,
  Filter,
  BarChart3,
  Activity,
  Sparkles,
  Building2,
  Calendar,
  CreditCard,
  Package,
  Flame,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  getAdminSystemOverviewAction,
  updateAdminUserSubscriptionAction,
  AdminSystemOverviewData,
} from '@/app/actions/dbActions';
import { getAdminMetrics, AdminMetrics } from '@/app/actions/getAdminMetrics';
import { generateLicenseCode } from '@/lib/licenseService';
import { recordAdminAuditAction } from '@/lib/adminAuditService';
import AdminRevenueForecastModule from '@/components/AdminRevenueForecastModule';
import AdminAuditLogSection from '@/components/AdminAuditLogSection';
import { AdminSupportChatView } from '@/components/AdminSupportChatView';
import AdminSettingsPage from '@/app/admin/configuracoes/page';
import SettingsTab from '@/components/tabs/SettingsTab';

interface AdminLicenseKeyRecord {
  code: string;
  notes: string;
  status: 'active' | 'redeemed' | 'revoked';
  createdAt: string;
}

const ADMIN_LICENSES_STORAGE_KEY = 'amigo_creator_generated_licenses_v1';

export type HubTab =
  | 'overview'
  | 'admin_master_settings'
  | 'company_settings'
  | 'subscriptions'
  | 'leads'
  | 'app_data'
  | 'usage'
  | 'support_audit';

interface AdminCreatorHubProps {
  onBack?: () => void;
  initialTab?: HubTab;
}

interface ManualCommercialLead {
  id: string;
  name: string;
  phone: string;
  city: string;
  source: string;
  stage: 'novo' | 'contatado' | 'negociacao' | 'fechado';
  notes: string;
  createdAt: string;
}

const MANUAL_LEADS_STORAGE_KEY = 'amigo_creator_commercial_leads_v1';

export function AdminCreatorHub({ onBack, initialTab = 'overview' }: AdminCreatorHubProps) {
  const { user, profile, isAdmin, isSupportOrAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [appDataSubTab, setAppDataSubTab] = useState<'clients' | 'installations' | 'quotes' | 'stock'>('installations');
  const [planPrices, setPlanPrices] = useState<{ flexPrice: number; proPrice: number }>({
    flexPrice: 19.9,
    proPrice: 39.9,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingUid, setIsUpdatingUid] = useState<string | null>(null);
  const [systemData, setSystemData] = useState<AdminSystemOverviewData>({
    users: [],
    clients: [],
    installations: [],
    quotes: [],
    errorDiagnoses: [],
    monthlyQuotas: [],
    processedPayments: [],
    whatsappConfirmations: [],
    licenseRedemptions: [],
    materialsStock: [],
  });
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [licenses, setLicenses] = useState<AdminLicenseKeyRecord[]>([]);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'pro' | 'flex' | 'free'>('all');
  const [leadFilter, setLeadFilter] = useState<'all' | 'hot' | 'new' | 'no_os_30d'>('all');
  const [appDataSearch, setAppDataSearch] = useState('');
  const [usageSearch, setUsageSearch] = useState('');

  // License generator state
  const [licenseNote, setLicenseNote] = useState('');
  const [licensePlan, setLicensePlan] = useState<'pro' | 'flex'>('pro');
  const [licenseDays, setLicenseDays] = useState<number>(30);

  // Manual CRM Leads state (for external leads from WhatsApp / Instagram / Ads)
  const [manualLeads, setManualLeads] = useState<ManualCommercialLead[]>([]);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('WhatsApp / Instagram');
  const [newLeadNotes, setNewLeadNotes] = useState('');

  const loadAllAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, metricsRes, checkoutRes] = await Promise.all([
        getAdminSystemOverviewAction().catch(() => null),
        getAdminMetrics().catch(() => null),
        fetch('/api/checkout').then((r) => r.json()).catch(() => null),
      ]);

      if (checkoutRes && !checkoutRes.error) {
        const flexVal = Number(checkoutRes?.plans?.flex?.price || checkoutRes?.flex_plan_price || 19.9);
        const proVal = Number(checkoutRes?.plans?.pro?.price || checkoutRes?.pro_plan_price || 39.9);
        setPlanPrices({
          flexPrice: flexVal > 0 ? flexVal : 19.9,
          proPrice: proVal > 0 ? proVal : 39.9,
        });
      }

      // Also fetch Supabase profiles if available so no user is missed
      let supabaseProfiles: any[] = [];
      try {
        const { data: sbData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (sbData && Array.isArray(sbData)) {
          supabaseProfiles = sbData.map((u: any) => ({
            uid: u.id,
            email: u.email || '',
            name: u.full_name || u.name || u.email?.split('@')[0] || 'Técnico',
            phone: u.phone || u.whatsapp || '',
            companyName: u.company_name || '',
            city: u.city || '',
            role: u.role || 'tech',
            plan: u.subscription_plan || u.plan || 'free',
            subscriptionStatus: u.subscription_status || 'active',
            createdAt: u.created_at || new Date().toISOString(),
          }));
        }
      } catch {}

      if (overviewRes) {
        const mergedUsersMap = new Map<string, any>();
        for (const u of supabaseProfiles) {
          if (u.uid) mergedUsersMap.set(String(u.uid), u);
        }
        for (const u of overviewRes.users || []) {
          if (u.uid) {
            const existing = mergedUsersMap.get(String(u.uid)) || {};
            mergedUsersMap.set(String(u.uid), { ...existing, ...u });
          }
        }
        // Ensure current logged-in user is also listed
        if (user?.uid && !mergedUsersMap.has(user.uid)) {
          mergedUsersMap.set(user.uid, {
            uid: user.uid,
            email: user.email || '',
            name: profile?.name || user.displayName || 'Administrador Master',
            phone: (profile as any)?.phone || '',
            companyName: (profile as any)?.companyName || 'Amigo Refrigerista SaaS',
            role: 'admin',
            plan: 'pro',
            subscriptionStatus: 'active',
            createdAt: new Date().toISOString(),
          });
        }

        setSystemData({
          ...overviewRes,
          users: Array.from(mergedUsersMap.values()),
        });
      }

      if (metricsRes) {
        setMetrics(metricsRes);
      }

      if (typeof window !== 'undefined') {
        const rawLic = window.localStorage.getItem(ADMIN_LICENSES_STORAGE_KEY);
        if (rawLic) {
          try {
            setLicenses(JSON.parse(rawLic));
          } catch {}
        }
        const rawLeads = window.localStorage.getItem(MANUAL_LEADS_STORAGE_KEY);
        if (rawLeads) {
          try {
            setManualLeads(JSON.parse(rawLeads));
          } catch {}
        }
      }
    } catch (error) {
      console.error('Erro ao carregar Central do Criador:', error);
      toast.error('Erro ao sincronizar alguns dados administrativos.');
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    void loadAllAdminData();
  }, [loadAllAdminData]);

  // Enrich users with their usage stats (clients count, OS count, quotes count, AI diagnoses count, monthly quota)
  const enrichedUsers = useMemo(() => {
    return systemData.users.map((u) => {
      const uid = String(u.uid || '');
      const userClients = systemData.clients.filter((c) => c.userUid === uid);
      const userInstallations = systemData.installations.filter((i) => i.userUid === uid);
      const userQuotes = systemData.quotes.filter((q) => q.userUid === uid);
      const userDiagnoses = systemData.errorDiagnoses.filter((d) => d.userUid === uid);
      const userQuotas = systemData.monthlyQuotas.filter((mq) => mq.userUid === uid);

      const currentMonthQuota = userQuotas[0] || { osCount: userInstallations.length, aiCount: userDiagnoses.length };
      const normalizedPlan = String(u.plan || 'free').toLowerCase();
      const isPaidPro = normalizedPlan === 'pro' || normalizedPlan === 'pro_paid';
      const isPaidFlex = normalizedPlan === 'flex';
      const isFreeOrTrial = !isPaidPro && !isPaidFlex;

      // Engagement score (0 - 100) to rank leads most likely to buy subscription
      const rawScore =
        userInstallations.length * 18 +
        userClients.length * 12 +
        userQuotes.length * 15 +
        userDiagnoses.length * 10 +
        (u.phone ? 10 : 0);
      const engagementScore = Math.min(100, rawScore);

      return {
        ...u,
        normalizedPlan: isPaidPro ? 'pro' : isPaidFlex ? 'flex' : 'free',
        isPaidPro,
        isPaidFlex,
        isFreeOrTrial,
        clientsCount: userClients.length,
        installationsCount: userInstallations.length,
        quotesCount: userQuotes.length,
        diagnosesCount: userDiagnoses.length,
        monthOsCount: Number(currentMonthQuota.osCount || 0),
        monthAiCount: Number(currentMonthQuota.aiCount || 0),
        engagementScore,
      };
    });
  }, [systemData]);

  // Summary KPIs
  const kpis = useMemo(() => {
    const proSubscribers = enrichedUsers.filter((u) => u.isPaidPro).length;
    const flexSubscribers = enrichedUsers.filter((u) => u.isPaidFlex).length;
    const freeLeads = enrichedUsers.filter((u) => u.isFreeOrTrial).length;
    const totalPaid = proSubscribers + flexSubscribers;

    const calculatedMrr = Number(
      (proSubscribers * planPrices.proPrice + flexSubscribers * planPrices.flexPrice).toFixed(2)
    );
    const mrr = metrics?.mrr && metrics.mrr > calculatedMrr ? metrics.mrr : calculatedMrr;
    const arr = Number((mrr * 12).toFixed(2));

    const totalOsRevenue = systemData.installations.reduce(
      (acc, item) => acc + (Number(item.totalCost) || 0),
      0
    );
    const totalQuotesValue = systemData.quotes.reduce(
      (acc, item) => acc + (Number(item.totalAmount) || 0),
      0
    );
    const totalAiQueries =
      systemData.errorDiagnoses.length +
      systemData.monthlyQuotas.reduce((acc, q) => acc + (Number(q.aiCount) || 0), 0);

    const conversionRate =
      enrichedUsers.length > 0 ? Math.round((totalPaid / enrichedUsers.length) * 100) : 0;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const registeredLast30Days = enrichedUsers.filter((u) => {
      const created = u.createdAt ? new Date(u.createdAt).getTime() : Date.now();
      return !Number.isNaN(created) && created >= thirtyDaysAgo;
    });
    const noOsLast30Days = registeredLast30Days.filter((u) => u.installationsCount === 0).length;

    return {
      totalUsers: enrichedUsers.length,
      proSubscribers,
      flexSubscribers,
      totalPaid,
      freeLeads,
      registeredLast30DaysCount: registeredLast30Days.length,
      noOsLast30Days,
      mrr,
      arr,
      conversionRate,
      totalClients: systemData.clients.length,
      totalInstallations: systemData.installations.length,
      totalQuotes: systemData.quotes.length,
      totalOsRevenue,
      totalQuotesValue,
      totalAiQueries,
      totalPayments: systemData.processedPayments.length,
    };
  }, [enrichedUsers, systemData, metrics, planPrices.proPrice, planPrices.flexPrice]);

  // Top queried HVAC brands in AI Error Diagnosis
  const topBrandsRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const diag of systemData.errorDiagnoses) {
      const brand = String(diag.brand || 'Não informada').trim().toUpperCase();
      counts[brand] = (counts[brand] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [systemData.errorDiagnoses]);

  // Handle changing a user's subscription plan (PostgreSQL + Supabase + Audit Log)
  const handleUpdateUserPlan = async (
    targetUser: any,
    newPlan: 'free' | 'flex' | 'pro',
    newStatus: 'active' | 'canceled' | 'trialing' = 'active'
  ) => {
    if (!targetUser?.uid) return;
    const previousPlan = targetUser.normalizedPlan || targetUser.plan || 'free';
    setIsUpdatingUid(targetUser.uid);

    try {
      await updateAdminUserSubscriptionAction({
        targetUid: targetUser.uid,
        plan: newPlan,
        subscriptionStatus: newStatus,
      });

      // Also sync Supabase profile if present
      try {
        await supabase
          .from('profiles')
          .update({
            subscription_plan: newPlan,
            subscription_status: newStatus,
          })
          .eq('id', targetUser.uid);
      } catch {}

      recordAdminAuditAction({
        adminName: profile?.name || 'Administrador Master',
        adminEmail: user?.email || 'amigorefrigerista@gmail.com',
        adminRole: 'Super Admin',
        category: 'plan_change',
        actionTitle: `Alteração de Plano (${previousPlan.toUpperCase()} -> ${newPlan.toUpperCase()})`,
        targetIdentifier: targetUser.email || targetUser.name || targetUser.uid,
        previousValue: previousPlan.toUpperCase(),
        newValue: newPlan.toUpperCase(),
        details: `Atualização de assinatura realizada na Central do Criador para ${targetUser.name || targetUser.uid}.`,
        severity: 'high',
      });

      setSystemData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.uid === targetUser.uid
            ? { ...u, plan: newPlan, subscriptionStatus: newStatus }
            : u
        ),
      }));

      toast.success(
        `Plano de ${targetUser.name || targetUser.email} atualizado para ${newPlan.toUpperCase()}!`
      );
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      toast.error('Não foi possível atualizar o plano deste usuário.');
    } finally {
      setIsUpdatingUid(null);
    }
  };

  // Generate VIP license key for direct WhatsApp/Pix sales
  const handleCreateLicense = () => {
    try {
      const code = generateLicenseCode('promotional', licenseDays);
      const newLic: AdminLicenseKeyRecord = {
        code,
        notes: licenseNote.trim() || `Assinatura ${licensePlan.toUpperCase()} (${licenseDays} dias)`,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const next = [newLic, ...licenses];
      setLicenses(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_LICENSES_STORAGE_KEY, JSON.stringify(next));
      }
      setLicenseNote('');
      navigator.clipboard?.writeText(code).catch(() => {});
      toast.success(`Chave ${code} gerada e copiada para a área de transferência!`);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar chave de ativação.');
    }
  };

  const handleRevokeLicense = (code: string) => {
    const next = licenses.map((l) => (l.code === code ? { ...l, status: 'revoked' as const } : l));
    setLicenses(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_LICENSES_STORAGE_KEY, JSON.stringify(next));
    }
    toast.success(`Chave ${code} revogada.`);
  };

  // Add manual commercial lead
  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      toast.error('Informe pelo menos o nome e WhatsApp do lead.');
      return;
    }
    const lead: ManualCommercialLead = {
      id: `lead-${Date.now()}`,
      name: newLeadName.trim(),
      phone: newLeadPhone.trim(),
      city: newLeadCity.trim() || 'Não informada',
      source: newLeadSource.trim() || 'WhatsApp',
      stage: 'novo',
      notes: newLeadNotes.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [lead, ...manualLeads];
    setManualLeads(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_LEADS_STORAGE_KEY, JSON.stringify(next));
    }
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadCity('');
    setNewLeadNotes('');
    setShowNewLeadForm(false);
    toast.success('Lead comercial salvo no funil de vendas!');
  };

  const handleUpdateManualLeadStage = (id: string, stage: ManualCommercialLead['stage']) => {
    const next = manualLeads.map((l) => (l.id === id ? { ...l, stage } : l));
    setManualLeads(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_LEADS_STORAGE_KEY, JSON.stringify(next));
    }
    toast.success('Estágio do lead atualizado!');
  };

  const handleDeleteManualLead = (id: string) => {
    const next = manualLeads.filter((l) => l.id !== id);
    setManualLeads(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MANUAL_LEADS_STORAGE_KEY, JSON.stringify(next));
    }
    toast.success('Lead removido.');
  };

  // Export CSV helper
  const exportUsersToCsv = (onlyLeads = false) => {
    const list = onlyLeads
      ? enrichedUsers.filter((u) => u.isFreeOrTrial)
      : enrichedUsers;

    const headers = [
      'UID',
      'Nome',
      'Email',
      'Telefone',
      'Empresa',
      'Plano',
      'Status',
      'Clientes Cadastrados',
      'OS Emitidas',
      'Orcamentos',
      'Consultas IA',
      'Score Engajamento',
      'Data Cadastro',
    ];

    const rows = list.map((u) => [
      u.uid,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      u.email || '',
      u.phone || '',
      `"${(u.companyName || '').replace(/"/g, '""')}"`,
      u.normalizedPlan.toUpperCase(),
      u.subscriptionStatus || 'active',
      u.clientsCount,
      u.installationsCount,
      u.quotesCount,
      u.diagnosesCount,
      `${u.engagementScore}%`,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      onlyLeads
        ? `leads_amigo_refrigerista_${new Date().toISOString().slice(0, 10)}.csv`
        : `assinantes_usuarios_saas_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório CSV exportado com sucesso!');
  };

  // Build WhatsApp commercial pitch URL for a lead
  const getWhatsAppSalesUrl = (lead: any) => {
    const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = String(lead.name || 'Amigo Técnico').split(' ')[0];
    const activityDetail =
      lead.installationsCount > 0
        ? `vi que você já gerou ${lead.installationsCount} Ordem(ns) de Serviço no aplicativo`
        : `vi seu cadastro no aplicativo Amigo Refrigerista`;

    const msg = `Olá ${firstName}, tudo bem? Aqui é o criador do *Amigo Refrigerista Pro*! ❄️🔧\n\n${activityDetail} e quero liberar uma condição especial para você destravar o *Plano PRO Ilimitado* (OS, PMOC, PDF com sua logo, Calculadora Técnica e Diagnóstico IA sem limites).\n\nPosso te enviar os detalhes para ativar na sua conta agora?`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q) ||
        String(u.companyName || '').toLowerCase().includes(q) ||
        String(u.uid || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (planFilter === 'all') return true;
      return u.normalizedPlan === planFilter;
    });
  }, [enrichedUsers, userSearch, planFilter]);

  const filteredLeads = useMemo(() => {
    const base = enrichedUsers
      .filter((u) => u.isFreeOrTrial)
      .sort((a, b) => b.engagementScore - a.engagementScore);

    return base.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.phone || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (leadFilter === 'hot') return u.engagementScore >= 25 || u.installationsCount >= 1;
      if (leadFilter === 'new') {
        const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return created >= sevenDaysAgo;
      }
      if (leadFilter === 'no_os_30d') {
        const created = u.createdAt ? new Date(u.createdAt).getTime() : Date.now();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return created >= thirtyDaysAgo && u.installationsCount === 0;
      }
      return true;
    });
  }, [enrichedUsers, userSearch, leadFilter]);

  if (!isAdmin && !isSupportOrAdmin) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-white">Acesso Restrito ao Criador do Sistema</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Este painel é exclusivo para o administrador master (amigorefrigerista@gmail.com) acompanhar assinaturas, leads, clientes e telemetria do SaaS.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition"
          >
            Voltar ao App
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Executive Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0b172a] to-sky-950 border border-sky-500/30 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck size={14} />
              <span>Central do Criador & Administrador SaaS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestão Comercial, Assinaturas, Leads & Telemetria
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Acompanhe em tempo real quem está usando seu aplicativo, converta técnicos gratuitos em assinantes PRO, gerencie planos, consulte dados de clientes/OS e monitore o uso da IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Voltar ao App</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadAllAdminData()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Sincronizar Dados</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin_master_settings')}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'admin_master_settings'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25 font-black'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
              }`}
            >
              <Crown size={14} />
              <span>Admin Master & Pagamentos (R$ {planPrices.flexPrice.toFixed(2).replace('.', ',')} / R$ {planPrices.proPrice.toFixed(2).replace('.', ',')})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('company_settings')}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'company_settings'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Settings size={14} />
              <span>Ajustes & Empresa</span>
            </button>

            <button
              type="button"
              onClick={() => exportUsersToCsv(false)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Exportar Base CSV</span>
            </button>
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Visão Geral & Receita', icon: BarChart3 },
            {
              id: 'admin_master_settings',
              label: `⚙️ Admin Master, Pagamentos & Planos (R$ ${planPrices.flexPrice.toFixed(2).replace('.', ',')} / R$ ${planPrices.proPrice.toFixed(2).replace('.', ',')})`,
              icon: Crown,
            },
            {
              id: 'company_settings',
              label: '🏢 Ajustes da Empresa & Checkout',
              icon: Building2,
            },
            {
              id: 'subscriptions',
              label: `Assinaturas & Licenças (${kpis.totalPaid})`,
              icon: Key,
            },
            {
              id: 'leads',
              label: `Leads & Funil Comercial (${kpis.freeLeads + manualLeads.length})`,
              icon: Flame,
            },
            {
              id: 'app_data',
              label: `Clientes & OS do App (${kpis.totalClients + kpis.totalInstallations})`,
              icon: Database,
            },
            {
              id: 'usage',
              label: `Consultas de Uso & IA (${kpis.totalAiQueries})`,
              icon: Cpu,
            },
            {
              id: 'support_audit',
              label: 'Suporte & Auditoria',
              icon: MessageSquare,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as HubTab)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. ABA: VISÃO GERAL & RECEITA SAAS                                    */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Primary Executive KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[11px] font-black uppercase tracking-wider">MRR (Receita Mensal)</span>
                <DollarSign size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {kpis.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[11px] text-slate-400">
                ARR Anual:{' '}
                <strong className="text-emerald-400">
                  {kpis.arr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-sky-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-sky-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Assinantes Ativos</span>
                <Crown size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">{kpis.totalPaid}</p>
              <p className="text-[11px] text-slate-400">
                <strong className="text-sky-400">{kpis.proSubscribers} PRO</strong> (R$ {planPrices.proPrice.toFixed(2).replace('.', ',')}) •{' '}
                <strong className="text-cyan-400">{kpis.flexSubscribers} Flex</strong> (R$ {planPrices.flexPrice.toFixed(2).replace('.', ',')})
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Leads p/ Converter</span>
                <Flame size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {kpis.freeLeads + manualLeads.length}
              </p>
              <p className="text-[11px] text-slate-400">
                {kpis.freeLeads} no plano Free • Conversão:{' '}
                <strong className="text-amber-400">{kpis.conversionRate}%</strong>
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-purple-400">
                <span className="text-[11px] font-black uppercase tracking-wider">Movimentação no App</span>
                <Activity size={18} />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {kpis.totalInstallations} OS / {kpis.totalClients} Clientes
              </p>
              <p className="text-[11px] text-slate-400">
                Volume OS:{' '}
                <strong className="text-purple-300">
                  {kpis.totalOsRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </p>
            </div>
          </div>

          {/* Funnel & Operational Snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    <span>Funil Comercial de Assinaturas (Técnicos de Refrigeração)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Jornada desde o cadastro gratuito até a assinatura recorrente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition cursor-pointer"
                >
                  Abordar Leads →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">1. Técnicos Cadastrados</span>
                  <p className="text-2xl font-black text-white mt-1">{kpis.totalUsers}</p>
                  <p className="text-[11px] text-slate-500 mt-1">100% da base registrada no app</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40">
                  <span className="text-[10px] font-black text-rose-400 uppercase">
                    2. Sem OS (Últimos 30 Dias)
                  </span>
                  <p className="text-2xl font-black text-rose-400 mt-1">{kpis.noOsLast30Days}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    De {kpis.registeredLast30DaysCount} novos cadastros (30d) sem nenhuma OS
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">
                    3. Leads Ativos (Usando o App)
                  </span>
                  <p className="text-2xl font-black text-amber-400 mt-1">
                    {
                      enrichedUsers.filter(
                        (u) => u.isFreeOrTrial && (u.installationsCount > 0 || u.clientsCount > 0 || u.diagnosesCount > 0)
                      ).length
                    }
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Técnicos Free que já criaram OS, clientes ou usaram IA
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    4. Assinantes Pagantes (Flex / PRO)
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{kpis.totalPaid}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Receita ativa:{' '}
                    {kpis.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                  </p>
                </div>
              </div>
            </div>

            {/* Operational Telemetry Summary */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Database size={16} className="text-sky-400" />
                <span>Resumo de Uso da Plataforma</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Clientes Finais Cadastrados</span>
                  <strong className="text-white font-black">{kpis.totalClients}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Ordens de Serviço / PMOC</span>
                  <strong className="text-emerald-400 font-black">{kpis.totalInstallations}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Orçamentos Gerados</span>
                  <strong className="text-sky-400 font-black">
                    {kpis.totalQuotes} ({kpis.totalQuotesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                  </strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Diagnósticos IA Realizados</span>
                  <strong className="text-purple-400 font-black">{kpis.totalAiQueries}</strong>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Chaves VIP Geradas</span>
                  <strong className="text-amber-400 font-black">{licenses.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Forecast Module */}
          <AdminRevenueForecastModule
            monthlyRevenueTrend={metrics?.monthlyRevenueTrend || []}
            currentMrr={kpis.mrr}
            currentProCount={kpis.proSubscribers}
            currentFlexCount={kpis.flexSubscribers}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. ABA: ASSINATURAS, PLANOS & CHAVES DE LICENÇA VIP                   */}
      {/* ===================================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Gerador de Chaves de Ativação VIP (Para vendas diretas via Pix / WhatsApp) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Key size={18} className="text-amber-400" />
                  <span>Gerador de Licenças VIP (Venda Direta no Pix / WhatsApp)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vendeu uma assinatura direto pelo WhatsApp? Gere um código de ativação ou ative o plano PRO direto na conta do técnico abaixo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={licenseNote}
                  onChange={(e) => setLicenseNote(e.target.value)}
                  placeholder="Nome do técnico ou observação (ex: João Silva - Pix Anual)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <select
                  value={`${licensePlan}-${licenseDays}`}
                  onChange={(e) => {
                    const [p, d] = e.target.value.split('-');
                    setLicensePlan(p as 'pro' | 'flex');
                    setLicenseDays(Number(d));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="pro-30">Plano PRO - Mensal (30 dias)</option>
                  <option value="pro-365">Plano PRO - Anual (365 dias)</option>
                  <option value="flex-30">Plano Flex - Mensal (30 dias)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleCreateLicense}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Key size={15} />
                <span>Gerar Código VIP</span>
              </button>
            </div>

            {licenses.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Chaves de Licença Geradas Recentemente ({licenses.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {licenses.slice(0, 10).map((lic) => (
                    <div
                      key={lic.code}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400">{lic.code}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              lic.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : lic.status === 'redeemed'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {lic.status === 'active'
                              ? 'Disponível'
                              : lic.status === 'redeemed'
                              ? 'Resgatada'
                              : 'Revogada'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lic.notes || 'Sem observação'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(lic.code);
                            toast.success('Código copiado!');
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                          title="Copiar código"
                        >
                          <Copy size={13} />
                        </button>
                        {lic.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeLicense(lic.code)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="Revogar chave"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gestão de Assinaturas de Todos os Técnicos */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Crown size={18} className="text-sky-400" />
                  <span>Controle de Assinantes & Técnicos Cadastrados ({filteredUsers.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ative, faça upgrade para PRO/Flex ou altere o status da assinatura de qualquer técnico em 1 clique
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pro', 'flex', 'free'] as const).map((pf) => (
                  <button
                    key={pf}
                    type="button"
                    onClick={() => setPlanFilter(pf)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                      planFilter === pf
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {pf === 'all' ? 'Todos' : pf}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar técnico por nome, e-mail, WhatsApp, empresa ou ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">Nenhum técnico encontrado para este filtro.</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{u.name || 'Técnico Sem Nome'}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            u.normalizedPlan === 'pro'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : u.normalizedPlan === 'flex'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          Plano {u.normalizedPlan.toUpperCase()}
                        </span>
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-500" />
                            {u.email}
                          </span>
                        )}
                        {u.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-emerald-400" />
                            {u.phone}
                          </span>
                        )}
                        {u.companyName && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} className="text-sky-400" />
                            {u.companyName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Clientes: <strong className="text-white">{u.clientsCount}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          OS Geradas: <strong className="text-emerald-400">{u.installationsCount}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Orçamentos: <strong className="text-sky-400">{u.quotesCount}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Consultas IA: <strong className="text-purple-400">{u.diagnosesCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* 1-Click Plan Switcher & WhatsApp Contact */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {u.phone && (
                        <a
                          href={getWhatsAppSalesUrl(u)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Phone size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                        {(['free', 'flex', 'pro'] as const).map((targetPlan) => {
                          const isCurrent = u.normalizedPlan === targetPlan;
                          return (
                            <button
                              key={targetPlan}
                              type="button"
                              disabled={isUpdatingUid === u.uid || isCurrent}
                              onClick={() => void handleUpdateUserPlan(u, targetPlan, 'active')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
                                isCurrent
                                  ? targetPlan === 'pro'
                                    ? 'bg-emerald-600 text-white'
                                    : targetPlan === 'flex'
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'bg-slate-700 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {targetPlan}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Histórico de Pagamentos Processados (Webhooks / Gateways) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              <span>Pagamentos Processados pelos Gateways ({systemData.processedPayments.length})</span>
            </h3>
            {systemData.processedPayments.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhum webhook de pagamento automático registrado ainda. Configure suas chaves do Mercado Pago ou Stripe em{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('admin_master_settings')}
                  className="text-sky-400 underline font-bold cursor-pointer"
                >
                  Admin Master & Gateways
                </button>{' '}
                ou ative assinaturas manualmente acima.
              </p>
            ) : (
              <div className="space-y-2">
                {systemData.processedPayments.map((pay: any) => (
                  <div
                    key={pay.paymentId}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-black text-white">ID: {pay.paymentId}</span>
                      <span className="text-slate-400 ml-2">Usuário: {pay.userUid}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase text-[10px]">
                        Plano {pay.plan}
                      </span>
                      <span className="font-black text-emerald-400">
                        {Number(pay.amount || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ABA: LEADS & FUNIL COMERCIAL (CONVERSÃO DE ASSINATURAS)            */}
      {/* ===================================================================== */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* CRM de Leads Externos (WhatsApp / Instagram / Tráfego Pago) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-emerald-400" />
                  <span>Funil de Vendas Diretas (Contatos Comerciais & Interessados)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cadastre técnicos interessados vindos do Instagram, anúncios ou grupos de WhatsApp para acompanhamento comercial
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewLeadForm((v) => !v)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Plus size={15} />
                <span>Adicionar Lead Comercial</span>
              </button>
            </div>

            {showNewLeadForm && (
              <form
                onSubmit={handleAddManualLead}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
              >
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="Nome do Técnico *"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="WhatsApp com DDD *"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  required
                />
                <input
                  type="text"
                  value={newLeadCity}
                  onChange={(e) => setNewLeadCity(e.target.value)}
                  placeholder="Cidade / UF"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  placeholder="Observação (ex: Quer plano anual)"
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer"
                >
                  Salvar no Funil
                </button>
              </form>
            )}

            {manualLeads.length > 0 && (
              <div className="space-y-2">
                {manualLeads.map((ml) => (
                  <div
                    key={ml.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">{ml.name}</span>
                        <span className="text-slate-400">({ml.city})</span>
                        <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold uppercase">
                          {ml.stage}
                        </span>
                      </div>
                      {ml.notes && <p className="text-slate-400 text-[11px] mt-0.5">{ml.notes}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={ml.stage}
                        onChange={(e) =>
                          handleUpdateManualLeadStage(ml.id, e.target.value as ManualCommercialLead['stage'])
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white"
                      >
                        <option value="novo">Novo Lead</option>
                        <option value="contatado">Contatado</option>
                        <option value="negociacao">Em Negociação</option>
                        <option value="fechado">Assinatura Fechada</option>
                      </select>

                      <a
                        href={getWhatsAppSalesUrl({ name: ml.name, phone: ml.phone, installationsCount: 0 })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                      >
                        <Phone size={12} />
                        <span>Chamar no WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteManualLead(ml.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads do App (Técnicos no Plano Free ordenados por Score de Uso) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Flame size={18} className="text-amber-400" />
                  <span>Leads no App Gratuito Prontos para Abordagem ({filteredLeads.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordenados automaticamente por nível de atividade no aplicativo (quem mais gera OS e cadastra clientes tem maior chance de assinar)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'Todos os Leads' },
                  { id: 'no_os_30d', label: `⚠️ 30 Dias Sem OS (${kpis.noOsLast30Days})` },
                  { id: 'hot', label: '🔥 Leads Quentes (Com Uso)' },
                  { id: 'new', label: '✨ Novos (Últimos 7 dias)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLeadFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      leadFilter === f.id
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => exportUsersToCsv(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Exportar Leads CSV</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">Nenhum lead gratuito encontrado com este filtro.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.uid}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{lead.name || 'Técnico'}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            lead.engagementScore >= 40
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Termômetro de Compra: {lead.engagementScore}%
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {lead.email && <span>{lead.email}</span>}
                        {lead.phone && <span className="text-emerald-400 font-bold">{lead.phone}</span>}
                        {lead.companyName && <span>• {lead.companyName}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          OS Emitidas: <strong className="text-white">{lead.installationsCount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Clientes: <strong className="text-white">{lead.clientsCount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Orçamentos: <strong className="text-white">{lead.quotesCount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Diagnósticos IA: <strong className="text-white">{lead.diagnosesCount}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <a
                        href={getWhatsAppSalesUrl(lead)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
                      >
                        <Phone size={14} />
                        <span>Abordar p/ Vender PRO</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => void handleUpdateUserPlan(lead, 'pro', 'active')}
                        disabled={isUpdatingUid === lead.uid}
                        className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition cursor-pointer"
                      >
                        Ativar PRO
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. ABA: DADOS DE CLIENTES, ORDENS DE SERVIÇO, ORÇAMENTOS & ESTOQUE    */}
      {/* ===================================================================== */}
      {activeTab === 'app_data' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Database size={18} className="text-sky-400" />
                  <span>Explorador de Dados dos Aplicativos & Clientes</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulte todas as Ordens de Serviço, Clientes Finais, Orçamentos e Peças registradas no banco de dados
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    id: 'installations',
                    label: `Ordens de Serviço (${systemData.installations.length})`,
                  },
                  { id: 'clients', label: `Clientes (${systemData.clients.length})` },
                  { id: 'quotes', label: `Orçamentos (${systemData.quotes.length})` },
                  { id: 'stock', label: `Estoque (${systemData.materialsStock.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setAppDataSubTab(sub.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      appDataSubTab === sub.id
                        ? 'bg-sky-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appDataSearch}
                onChange={(e) => setAppDataSearch(e.target.value)}
                placeholder="Pesquisar por cliente, número da OS, equipamento, endereço ou técnico..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* SUB-ABA: ORDENS DE SERVIÇO */}
            {appDataSubTab === 'installations' && (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {systemData.installations
                  .filter((os) => {
                    const q = appDataSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      String(os.clientName || '').toLowerCase().includes(q) ||
                      String(os.orderNumber || '').toLowerCase().includes(q) ||
                      String(os.equipment || '').toLowerCase().includes(q) ||
                      String(os.serviceType || '').toLowerCase().includes(q)
                    );
                  })
                  .map((os) => (
                    <div
                      key={os.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-sky-400">
                            {os.orderNumber || os.id}
                          </span>
                          <span className="font-bold text-white">{os.clientName}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                            {os.status || 'Pendente'}
                          </span>
                        </div>
                        <p className="text-slate-400">
                          {os.serviceType || 'Manutenção / Instalação'} • Equipamento:{' '}
                          <strong className="text-slate-200">{os.equipment || 'Ar-Condicionado'}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Técnico UID: {os.userUid} • Data: {os.serviceDate || 'Recente'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-400">
                          {Number(os.totalCost || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                        {os.clientPhone && <p className="text-[11px] text-slate-400">{os.clientPhone}</p>}
                      </div>
                    </div>
                  ))}
                {systemData.installations.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhuma Ordem de Serviço encontrada.
                  </p>
                )}
              </div>
            )}

            {/* SUB-ABA: CLIENTES FINAIS */}
            {appDataSubTab === 'clients' && (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {systemData.clients
                  .filter((c) => {
                    const q = appDataSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      String(c.name || '').toLowerCase().includes(q) ||
                      String(c.phone || '').toLowerCase().includes(q) ||
                      String(c.address || '').toLowerCase().includes(q)
                    );
                  })
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-black text-white text-sm">{c.name}</span>
                        <p className="text-slate-400">
                          Tel: {c.phone || 'Não informado'} • Endereço: {c.address || 'Não informado'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Equipamentos vinculados: {Array.isArray(c.equipment) ? c.equipment.length : 0} • Técnico UID: {c.userUid}
                        </p>
                      </div>
                    </div>
                  ))}
                {systemData.clients.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhum cliente final cadastrado ainda.
                  </p>
                )}
              </div>
            )}

            {/* SUB-ABA: ORÇAMENTOS */}
            {appDataSubTab === 'quotes' && (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {systemData.quotes
                  .filter((qt) => {
                    const q = appDataSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      String(qt.clientName || '').toLowerCase().includes(q) ||
                      String(qt.equipment || '').toLowerCase().includes(q)
                    );
                  })
                  .map((qt) => (
                    <div
                      key={qt.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-black text-white">{qt.clientName}</span>
                        <p className="text-slate-400 mt-0.5">{qt.equipment}</p>
                        <p className="text-[11px] text-slate-500">Status: {qt.status || 'pendente'}</p>
                      </div>
                      <span className="text-sm font-black text-sky-400">
                        {Number(qt.totalAmount || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ))}
                {systemData.quotes.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhum orçamento registrado ainda.
                  </p>
                )}
              </div>
            )}

            {/* SUB-ABA: ESTOQUE DE MATERIAIS */}
            {appDataSubTab === 'stock' && (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {systemData.materialsStock.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{st.name}</span>
                      <span className="text-slate-400 ml-2">({st.category})</span>
                    </div>
                    <span className="font-black text-emerald-400">
                      Qtd: {st.quantity} {st.unit}
                    </span>
                  </div>
                ))}
                {systemData.materialsStock.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhum item de estoque registrado no banco central.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. ABA: CONSULTAS DE USO, QUOTAS MENSAIS & TELEMETRIA IA              */}
      {/* ===================================================================== */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Ranking de Marcas Mais Consultadas na IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <span>Marcas Mais Consultadas (Diagnóstico IA)</span>
              </h3>
              {topBrandsRanking.length === 0 ? (
                <p className="text-xs text-slate-500">
                  As pesquisas de códigos de erro feitas pelos técnicos aparecerão aqui.
                </p>
              ) : (
                <div className="space-y-2">
                  {topBrandsRanking.map((item, idx) => (
                    <div
                      key={item.brand}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="font-bold text-white">
                        #{idx + 1} {item.brand}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-black">
                        {item.count} consulta(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consumo de Quotas Mensais por Técnico */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <span>Consumo de Limites Mensais por Técnico (OS & Consultas IA)</span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {enrichedUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{u.name || u.email}</span>
                      <span className="ml-2 text-[10px] uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                        {u.normalizedPlan}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        OS no Mês: <strong className="text-emerald-400">{u.monthOsCount}</strong>
                      </span>
                      <span className="text-slate-400">
                        Buscas IA: <strong className="text-purple-400">{u.monthAiCount}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Log Detalhado de Consultas de Códigos de Erro */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Cpu size={18} className="text-purple-400" />
                  <span>Histórico de Consultas de Códigos de Erro & IA ({systemData.errorDiagnoses.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Veja exatamente quais códigos de erro e aparelhos os técnicos estão pesquisando em campo
                </p>
              </div>
              <input
                type="text"
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                placeholder="Filtrar por marca ou código de erro..."
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {systemData.errorDiagnoses
                .filter((d) => {
                  const q = usageSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    String(d.brand || '').toLowerCase().includes(q) ||
                    String(d.errorCode || '').toLowerCase().includes(q) ||
                    String(d.probableCause || '').toLowerCase().includes(q)
                  );
                })
                .map((diag) => (
                  <div
                    key={diag.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-purple-300">
                        {diag.brand} {diag.model} — Erro: {diag.errorCode}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Acerto: {diag.successRate || 95}%
                      </span>
                    </div>
                    <p className="text-slate-300">{diag.probableCause}</p>
                    <p className="text-[11px] text-slate-500">Técnico UID: {diag.userUid}</p>
                  </div>
                ))}
              {systemData.errorDiagnoses.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  Nenhuma consulta de código de erro registrada até o momento.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. ABA: SUPORTE AO VIVO & AUDITORIA DO SISTEMA                        */}
      {/* ===================================================================== */}
      {activeTab === 'support_audit' && (
        <div className="space-y-6">
          <AdminSupportChatView onBack={() => setActiveTab('overview')} />
          <AdminAuditLogSection />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. ABA UNIFICADA: ADMIN MASTER, GATEWAYS & PLANOS (R$ 19,90 / 39,90)  */}
      {/* ===================================================================== */}
      {activeTab === 'admin_master_settings' && (
        <div className="space-y-6">
          <AdminSettingsPage />
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. ABA UNIFICADA: AJUSTES DA EMPRESA, E-MAIL SMTP & CHECKOUT          */}
      {/* ===================================================================== */}
      {activeTab === 'company_settings' && (
        <div className="space-y-6">
          <SettingsTab embeddedInAdmin />
        </div>
      )}
    </div>
  );
}

export default AdminCreatorHub;
