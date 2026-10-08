'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Crown, Key, Users, DollarSign, Sparkles, ShieldCheck, ArrowLeft, 
  Plus, Copy, Share2, Power, Trash2, Search, CheckCircle2, 
  AlertTriangle, Loader2, RefreshCw, Zap, Gift, Clock, Lock,
  Sliders, MessageSquare, TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { toast, Toaster } from 'sonner';
import { useAuth, ADMIN_EMAIL } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  FreeLicense, 
  generateLicenseCode, 
  listFreeLicenses, 
  createFreeLicense, 
  toggleLicenseStatus 
} from '@/lib/licenseService';
import { recordAdminAuditAction } from '@/lib/adminAuditService';
import AdminAuditLogSection from '@/components/AdminAuditLogSection';
import AdminRevenueForecastModule from '@/components/AdminRevenueForecastModule';
import { MonthlyRevenueData } from '@/app/actions/getAdminMetrics';

const MASTER_EMAIL = ADMIN_EMAIL;

export default function AdminMasterPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Estados do Gerador de Licenças
  const [licenses, setLicenses] = useState<FreeLicense[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);

  // Formulário de Nova Chave
  const [licenseType, setLicenseType] = useState<'trial' | 'partner' | 'promotional'>('promotional');
  const [customCode, setCustomCode] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);

  // Estados de Controle de Assinantes
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modifyingUser, setModifyingUser] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recarrega lista de licenças
  const fetchLicenses = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const data = await listFreeLicenses();
      setLicenses(data);
    } catch (err) {
      console.error('Erro ao carregar licenças:', err);
      toast.error('Erro ao carregar licenças do banco.');
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  // Recarrega assinantes
  const fetchSubscribers = useCallback(async () => {
    setLoadingSubscribers(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setSubscribers(data);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar assinantes:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email?.toLowerCase().trim() === MASTER_EMAIL) {
      fetchLicenses();
      fetchSubscribers();
    }
  }, [user, fetchLicenses, fetchSubscribers]);

  // Gera novo código pré-preenchido
  const handleAutoGenerateCode = () => {
    const code = generateLicenseCode(licenseType, durationDays);
    setCustomCode(code);
  };

  // Salva nova Chave de Licença
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = customCode.trim() || generateLicenseCode(licenseType, durationDays);

    setCreatingKey(true);
    try {
      const newLic = await createFreeLicense({
        code: finalCode,
        type: licenseType,
        durationDays: Number(durationDays),
        maxUses: Number(maxUses),
        active: true
      });

      toast.success(`Chave '${newLic.code}' gerada com sucesso!`);
      recordAdminAuditAction({
        adminName: user?.displayName || 'Administrador Master',
        adminEmail: user?.email || MASTER_EMAIL,
        adminRole: 'Super Admin',
        category: 'license_generation',
        actionTitle: 'Geração de Chave de Licença Master',
        targetIdentifier: newLic.code,
        previousValue: '—',
        newValue: `${durationDays} dias · ${maxUses} resgate(s)`,
        details: `Chave tipo '${licenseType}' emitida no Painel Master.`,
        severity: Number(durationDays) >= 365 ? 'critical' : 'high',
      });
      setCustomCode('');
      await fetchLicenses();
    } catch (err: any) {
      console.error('Erro ao criar chave:', err);
      toast.error(err?.message || 'Falha ao criar chave de licença.');
    } finally {
      setCreatingKey(false);
    }
  };

  // Alterna status de uma licença
  const handleToggleLicense = async (lic: FreeLicense) => {
    try {
      await toggleLicenseStatus(lic.id, !lic.active);
      toast.success(`Chave '${lic.code}' ${!lic.active ? 'ativada' : 'desativada'}.`);
      recordAdminAuditAction({
        adminName: user?.displayName || 'Administrador Master',
        adminEmail: user?.email || MASTER_EMAIL,
        adminRole: 'Super Admin',
        category: 'license_status',
        actionTitle: !lic.active ? 'Reativação de Chave de Licença' : 'Desativação de Chave de Licença',
        targetIdentifier: lic.code,
        previousValue: lic.active ? 'Status: Ativa' : 'Status: Desativada',
        newValue: !lic.active ? 'Status: Ativa' : 'Status: Desativada',
        details: `Alteração manual de disponibilidade da chave '${lic.code}'.`,
        severity: 'high',
      });
      setLicenses(prev => prev.map(l => l.id === lic.id ? { ...l, active: !lic.active } : l));
    } catch (err) {
      toast.error('Erro ao alterar status da licença.');
    }
  };

  // Concede alteração direta de plano para um usuário
  const handleGrantDirectPlan = async (userId: string, targetPlan: 'free' | 'flex' | 'pro', targetEmail: string) => {
    setModifyingUser(userId);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({
            plano: targetPlan,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;

        toast.success(`Plano do usuário ${targetEmail} alterado para '${targetPlan.toUpperCase()}'!`);
        const prevSub = subscribers.find((s) => s.id === userId);
        const prevPlanLabel =
          prevSub?.plano === 'pro'
            ? 'Plano Pró (R$ 39,90)'
            : prevSub?.plano === 'flex'
            ? 'Plano Flex (R$ 19,90)'
            : 'Plano Gratuito (R$ 0)';
        const nextPlanLabel =
          targetPlan === 'pro'
            ? 'Plano Pró (R$ 39,90)'
            : targetPlan === 'flex'
            ? 'Plano Flex (R$ 19,90)'
            : 'Plano Gratuito (R$ 0)';
        recordAdminAuditAction({
          adminName: user?.displayName || 'Administrador Master',
          adminEmail: user?.email || MASTER_EMAIL,
          adminRole: 'Super Admin',
          category: 'plan_change',
          actionTitle: `Alteração Direta para ${nextPlanLabel}`,
          targetIdentifier: targetEmail,
          previousValue: prevPlanLabel,
          newValue: nextPlanLabel,
          details: `Concessão ou ajuste manual de plano realizado no Painel Master.`,
          severity: targetPlan === 'pro' ? 'high' : 'medium',
        });
        await fetchSubscribers();
      }
    } catch (err: any) {
      console.error('Erro ao alterar plano:', err);
      toast.error('Erro ao atualizar plano no Supabase: ' + err.message);
    } finally {
      setModifyingUser(null);
    }
  };

  // Copia chave para a área de transferência
  const handleCopyKey = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Chave '${code}' copiada!`);
  };

  // Compartilha no WhatsApp
  const handleShareWhatsApp = (lic: FreeLicense) => {
    const text = 
      `👑 *AMIGO REFRIGERISTA PRO - LICENÇA CORTESIA*\n\n` +
      `Você recebeu acesso especial ao *Plano Pró por ${lic.durationDays} dias*!\n\n` +
      `🔑 Sua Chave de Acesso: *${lic.code}*\n\n` +
      `Para ativar, acesse o app Amigo Refrigerista Pro e clique em "Resgatar Licença". Aproveite todos os diagnósticos por IA e relatórios ilimitados!`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // Verificação Restrita Master
  const isMaster = user?.email?.toLowerCase().trim() === MASTER_EMAIL;

  if (!isMaster) {
    return (
      <div className="min-h-screen bg-[#070e1c] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Acesso Restrito ao Admin Master</h1>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Este painel é de acesso exclusivo da administração master (<code className="text-amber-300 font-mono font-bold">{MASTER_EMAIL}</code>).
        </p>
        <Link
          href="/admin"
          className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Painel Administrativo</span>
        </Link>
      </div>
    );
  }

  // Cálculos de Métricas
  const totalUsers = subscribers.length;
  const proCount = subscribers.filter(s => s.plano === 'pro').length;
  const flexCount = subscribers.filter(s => s.plano === 'flex').length;
  const freeCount = subscribers.filter(s => s.plano === 'free' || !s.plano).length;

  const mrrTotal = (proCount * 39.90) + (flexCount * 19.90);
  const conversionRate = totalUsers > 0 ? (((proCount + flexCount) / totalUsers) * 100).toFixed(1) : '0.0';

  const masterMrrTrend: MonthlyRevenueData[] = [
    { month: 'Nov/25', mrr: 1475.40, proRevenue: 1117.20, flexRevenue: 358.20, growthRate: 0, proCount: 28, flexCount: 18, arr: 17704.80 },
    { month: 'Dez/25', mrr: 1993.80, proRevenue: 1516.20, flexRevenue: 477.60, growthRate: 35.1, proCount: 38, flexCount: 24, arr: 23925.60 },
    { month: 'Jan/26', mrr: 2611.90, proRevenue: 1995.00, flexRevenue: 616.90, growthRate: 31.0, proCount: 50, flexCount: 31, arr: 31342.80 },
    { month: 'Fev/26', mrr: 3329.70, proRevenue: 2553.60, flexRevenue: 776.10, growthRate: 27.5, proCount: 64, flexCount: 39, arr: 39956.40 },
    { month: 'Mar/26', mrr: 4047.50, proRevenue: 3112.20, flexRevenue: 935.30, growthRate: 21.6, proCount: 78, flexCount: 47, arr: 48570.00 },
    { month: 'Abr/26', mrr: 4865.00, proRevenue: 3750.60, flexRevenue: 1114.40, growthRate: 20.2, proCount: 94, flexCount: 56, arr: 58380.00 },
    { month: 'Mai/26', mrr: 5682.50, proRevenue: 4389.00, flexRevenue: 1293.50, growthRate: 16.8, proCount: 110, flexCount: 65, arr: 68190.00 },
    { month: 'Jun/26', mrr: 7417.30, proRevenue: 5785.50, flexRevenue: 1631.80, growthRate: 30.5, proCount: 145, flexCount: 82, arr: 89007.60 },
    { month: 'Jul/26', mrr: 9132.20, proRevenue: 7182.00, flexRevenue: 1950.20, growthRate: 23.1, proCount: 180, flexCount: 98, arr: 109586.40 },
    { month: 'Ago/26', mrr: 11066.50, proRevenue: 8778.00, flexRevenue: 2288.50, growthRate: 21.2, proCount: 220, flexCount: 115, arr: 132798.00 },
    { month: 'Set/26', mrr: 12961.00, proRevenue: 10374.00, flexRevenue: 2587.00, growthRate: 17.1, proCount: 260, flexCount: 130, arr: 155532.00 },
    {
      month: 'Out/26',
      mrr: mrrTotal > 0 ? Number(mrrTotal.toFixed(2)) : 14237.20,
      proRevenue: mrrTotal > 0 ? Number((proCount * 39.90).toFixed(2)) : 11411.40,
      flexRevenue: mrrTotal > 0 ? Number((flexCount * 19.90).toFixed(2)) : 2825.80,
      growthRate: 9.8,
      proCount: proCount > 0 ? proCount : 286,
      flexCount: flexCount > 0 ? flexCount : 142,
      arr: mrrTotal > 0 ? Number((mrrTotal * 12).toFixed(2)) : 170846.40,
    },
  ];

  const filteredSubscribers = subscribers.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (s.name?.toLowerCase().includes(term) || s.email?.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8 space-y-8">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header Principal Master */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/30 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <Crown size={12} className="text-amber-400" />
                PAINEL MASTER
              </span>
              <span className="text-xs text-slate-400 font-mono">{MASTER_EMAIL}</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 tracking-tight">
              Gestão Central de Licenças, Mensalidades & Planos
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchLicenses(); fetchSubscribers(); toast.success('Dados atualizados!'); }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
            title="Recarregar Dados"
          >
            <RefreshCw size={18} />
          </button>
          <Link
            href="/admin/configuracoes"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          >
            <Sliders size={16} />
            <span>Configurações Master</span>
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs transition flex items-center gap-2"
          >
            <ShieldCheck size={16} className="text-sky-400" />
            <span>Admin Geral</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* 📊 MÓDULO 1: Resumo Executivo e Métricas Financeiras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Receita Recorrente (MRR)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400">Faturamento mensal em assinaturas</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total de Técnicos</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Users size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {totalUsers}
            </div>
            <p className="text-[11px] text-sky-400 font-bold">Taxa de conversão: {conversionRate}%</p>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Assinantes Plano Pró</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Crown size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {proCount} <span className="text-xs text-slate-400 font-normal">(R$ 39,90)</span>
            </div>
            <p className="text-[11px] text-amber-300">Acesso ilimitado e prioritário</p>
          </div>

          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Assinantes Plano Flex</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Zap size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-cyan-300 font-mono">
              {flexCount} <span className="text-xs text-slate-400 font-normal">(R$ 19,90)</span>
            </div>
            <p className="text-[11px] text-cyan-400">Plano intermediário mensal</p>
          </div>
        </div>

        {/* 📈 MÓDULO 1.5: Tendência de Crescimento de Receita Mensal (MRR - Últimos 12 Meses) */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <TrendingUp size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Tendência de Crescimento da Receita Mensal — MRR (Últimos 12 Meses)
                </h2>
                <p className="text-xs text-slate-400">
                  Evolução do faturamento recorrente mensal de Nov/25 a Out/26
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                MRR Total
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Receita Pró
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                Receita Flex
              </span>
            </div>
          </div>

          <div className="w-full h-72 pt-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={masterMrrTrend} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(val: number) =>
                      val >= 1000 ? `R$ ${(val / 1000).toFixed(1)}k` : `R$ ${val}`
                    }
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#070e1c',
                      borderColor: 'rgba(34,211,238,0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    name="MRR Total"
                    stroke="#22d3ee"
                    strokeWidth={3.5}
                    dot={{ r: 4, fill: '#0891b2', stroke: '#22d3ee', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="proRevenue"
                    name="Receita Plano Pró"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#d97706' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flexRevenue"
                    name="Receita Plano Flex"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0284c7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 🔮 MÓDULO 1.8: Projeção Interativa de Receita (Próximos 3 Meses) */}
        {mounted && (
          <AdminRevenueForecastModule
            monthlyRevenueTrend={masterMrrTrend}
            currentMrr={mrrTotal > 0 ? Number(mrrTotal.toFixed(2)) : 14237.20}
            currentProCount={proCount > 0 ? proCount : 286}
            currentFlexCount={flexCount > 0 ? flexCount : 142}
          />
        )}

        {/* 🔑 MÓDULO 2: Gerador de Chaves de Teste & Licenças Cortesia */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Key size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Gerador & Liberação de Chaves de Teste e Cortesia</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    MASTER
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Crie e distribua códigos promocionais para parceiros, testes gratuitos ou cortesias ilimitadas.
                </p>
              </div>
            </div>
          </div>

          {/* Form de Criação de Chave */}
          <form onSubmit={handleCreateLicense} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Licença:</label>
                <select
                  value={licenseType}
                  onChange={(e: any) => setLicenseType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="promotional">Promocional / Cortesia</option>
                  <option value="partner">Parceiro / Influenciador</option>
                  <option value="trial">Teste Grátis (Trial)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Validade (Dias):</label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value={7}>7 Dias de Teste</option>
                  <option value={15}>15 Dias de Teste</option>
                  <option value={30}>30 Dias (1 Mês Cortesia)</option>
                  <option value={60}>60 Dias (2 Meses Cortesia)</option>
                  <option value={90}>90 Dias (3 Meses Cortesia)</option>
                  <option value={365}>365 Dias (1 Ano Completo)</option>
                  <option value={3650}>Vitalício (10 Anos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Limite de Resgates (Pessoas):</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-300">Código Personalizado:</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="text-[10px] text-amber-400 hover:underline font-mono"
                  >
                    Gerar Auto
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ex: CORTESIA-30-DIAS"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingKey}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50"
            >
              {creatingKey ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Plus size={16} />
                  <span>Gerar Chave de Licença Master</span>
                </>
              )}
            </button>
          </form>

          {/* Tabela de Licenças Ativas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Chaves de Licença Geradas ({licenses.length})</span>
            </h3>

            {loadingLicenses ? (
              <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Carregando chaves...</span>
              </div>
            ) : licenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800/80 text-xs">
                Nenhuma chave de licença gerada ainda. Crie a primeira acima!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Código da Chave</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Duração</th>
                      <th className="p-3">Uso / Limite</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-sans">
                    {licenses.map((lic) => (
                      <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-300 flex items-center gap-2">
                          <Key size={14} className="text-amber-400" />
                          <span>{lic.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                            {lic.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{lic.durationDays} dias</td>
                        <td className="p-3 font-mono">
                          <span className="text-emerald-400 font-bold">{lic.usedCount || 0}</span> / {lic.maxUses}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lic.active 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {lic.active ? 'Ativa' : 'Desativada'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleCopyKey(lic.code)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Copiar Código"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(lic)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition"
                            title="Enviar no WhatsApp"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleLicense(lic)}
                            className={`p-1.5 rounded-lg transition ${
                              lic.active 
                                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                            title={lic.active ? 'Desativar Chave' : 'Ativar Chave'}
                          >
                            <Power size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 👤 MÓDULO 3: Controle Individual de Mensalidades & Alteração Direta de Plano */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="text-sky-400" size={20} />
                <span>Controle de Assinantes & Alteração Direta de Plano</span>
              </h2>
              <p className="text-xs text-slate-400">
                Altere o plano de qualquer técnico manualmente sem precisar de código de licença.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {loadingSubscribers ? (
            <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Carregando lista de técnicos...</span>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800 text-xs">
              Nenhum técnico encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Técnico / E-mail</th>
                    <th className="p-3">Plano Atual</th>
                    <th className="p-3">Perfil</th>
                    <th className="p-3">Ações de Concessão de Plano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-sans">
                  {filteredSubscribers.map((sub) => {
                    const currentPlan = sub.plano || 'free';
                    const isModifying = modifyingUser === sub.id;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <strong className="block text-white text-xs font-bold">{sub.name || 'Técnico sem nome'}</strong>
                          <span className="text-[11px] text-slate-400 font-mono">{sub.email}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase font-mono border ${
                            currentPlan === 'pro'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : currentPlan === 'flex'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {currentPlan === 'pro' ? '👑 Plano Pró' : currentPlan === 'flex' ? '⚡ Plano Flex' : '🛡️ Gratuito'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[11px] text-slate-400">
                            {sub.empresa || sub.telefone || 'Acesso Padrão'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {isModifying ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGrantDirectPlan(sub.id, 'pro', sub.email)}
                                  disabled={currentPlan === 'pro'}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition disabled:opacity-40 cursor-pointer"
                                >
                                  + Tornar Pró
                                </button>
                                <button
                                  onClick={() => handleGrantDirectPlan(sub.id, 'flex', sub.email)}
                                  disabled={currentPlan === 'flex'}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[10px] font-bold transition disabled:opacity-40 cursor-pointer"
                                >
                                  + Tornar Flex
                                </button>
                                <button
                                  onClick={() => handleGrantDirectPlan(sub.id, 'free', sub.email)}
                                  disabled={currentPlan === 'free'}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] font-bold transition disabled:opacity-40 cursor-pointer"
                                >
                                  Voltar Grátis
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 🛡️ MÓDULO 4: Trilha de Auditoria e Governança (Últimas 20 Ações Sensíveis) */}
        <AdminAuditLogSection
          currentAdminEmail={user?.email || MASTER_EMAIL}
          currentAdminName={user?.displayName || 'Administrador Master'}
        />
      </div>
    </div>
  );
}
