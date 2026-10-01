'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Crown, 
  Key, 
  Users, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  ArrowLeft, 
  Plus, 
  Copy, 
  Share2, 
  Power, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Zap, 
  Gift, 
  Clock, 
  Lock,
  TrendingUp,
  Sliders,
  Send,
  Calendar
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  FreeLicense, 
  generateLicenseCode, 
  listFreeLicenses, 
  createFreeLicense, 
  toggleLicenseStatus 
} from '@/lib/licenseService';

const MASTER_EMAIL = 'amigorefrigerista@gmail.com';

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
          href="/"
          className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Aplicativo</span>
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
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Recarregar Dados"
          >
            <RefreshCw size={18} />
          </button>
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

        {/* 📋 MÓDULO 4: Informações e Comparativo de Recursos dos Planos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400">
            <Sliders size={20} />
            <h2 className="text-base font-bold text-white">Informações de Distribuição dos Planos do Sistema</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Gratuito */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">Plano Gratuito</span>
                <span className="text-xs font-mono text-slate-400">R$ 0/mês</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 font-medium">
                <li>• Até 5 Ordens de Serviço/mês</li>
                <li>• Diagnósticos Básicos de Falhas por IA</li>
                <li>• Tabela de Pressão x Temperatura</li>
                <li>• Cálculo de Superaquecimento/Subresfriamento</li>
              </ul>
            </div>

            {/* Flex */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-sky-500/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sky-300 text-sm">Plano Flex</span>
                <span className="text-xs font-mono font-bold text-sky-400">R$ 19,90/mês</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 font-medium">
                <li>• Ordens de Serviço Ilimitadas</li>
                <li>• Disparo Automático de PDFs via WhatsApp</li>
                <li>• Leituras OCR de Placas por Câmera</li>
                <li>• Suporte Prioritário</li>
              </ul>
            </div>

            {/* Pró */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-300 text-sm">Plano Pró</span>
                <span className="text-xs font-mono font-bold text-amber-400">R$ 39,90/mês</span>
              </div>
              <ul className="text-xs text-slate-200 space-y-1.5 font-medium">
                <li>• Tudo do Plano Flex inclusivo</li>
                <li>• Diagnósticos Ilimitados de IA (Gemini 2.5)</li>
                <li>• Relatórios Fotográficos com Logo Própria</li>
                <li>• Atendimento Master & Consultoria Técnica</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
