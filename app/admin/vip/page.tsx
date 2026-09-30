'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Gift, 
  Search, 
  CheckCircle, 
  ShieldOff, 
  Loader2, 
  UserCheck, 
  Crown, 
  Shield, 
  ArrowLeft, 
  Copy, 
  Plus, 
  Sparkles, 
  KeyRound, 
  Calendar, 
  Users, 
  Share2, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  Check, 
  MessageCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  FreeLicense, 
  UserSubscription, 
  generateLicenseCode, 
  createFreeLicense, 
  listFreeLicenses, 
  toggleLicenseStatus, 
  getSubscriptionDaysRemaining 
} from '@/lib/licenseService';

interface VipUser {
  id: string;
  name?: string;
  email: string;
  isVip?: boolean;
  subscription?: UserSubscription;
}

export default function AdminVipManagerPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [licenses, setLicenses] = useState<FreeLicense[]>([]);
  const [fetchingLicenses, setFetchingLicenses] = useState<boolean>(true);
  
  const [vipList, setVipList] = useState<VipUser[]>([]);
  const [fetchingVipList, setFetchingVipList] = useState<boolean>(true);

  // Form states para nova licença
  const [newType, setNewType] = useState<'trial' | 'partner' | 'promotional'>('promotional');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newMaxUses, setNewMaxUses] = useState<number>(50);
  const [newCode, setNewCode] = useState<string>('');
  const [newExpiresAt, setNewExpiresAt] = useState<string>('');
  const [isCreatingLicense, setIsCreatingLicense] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states para concessão direta de VIP
  const [emailToGrant, setEmailToGrant] = useState<string>('');
  const [loadingDirectGrant, setLoadingDirectGrant] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Carregar Licenças
  const loadLicenses = useCallback(async () => {
    try {
      setFetchingLicenses(true);
      const list = await listFreeLicenses();
      setLicenses(list);
    } catch (err) {
      console.error('Erro ao buscar licenças:', err);
      toast.error('Falha ao carregar cupons de licença.');
    } finally {
      setFetchingLicenses(false);
    }
  }, []);

  // Load VIP and Subscribed Users
  const loadVipUsers = useCallback(async () => {
    setFetchingVipList(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      const users: VipUser[] = [];
      (data || []).forEach((p: any) => {
        if (p.is_admin || p.plano !== 'free') {
          users.push({
            id: p.id,
            name: p.nome,
            email: p.email,
            isVip: p.is_admin || p.plano === 'pro',
            subscription: {
              userId: p.id,
              plan: p.plano || 'free',
              startDate: p.created_at?.split('T')[0] || '',
              endDate: '2099-12-31',
              status: 'active'
            }
          });
        }
      });
      setVipList(users);
    } catch (err: any) {
      console.error('Erro ao buscar parceiros e assinantes:', err);
      toast.error('Erro ao carregar a lista de assinantes.');
    } finally {
      setFetchingVipList(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && user && !authLoading) {
      loadLicenses();
      loadVipUsers();
    }
  }, [isAdmin, user, authLoading, loadLicenses, loadVipUsers]);

  // Gerar código aleatório
  const handleGenerateRandomCode = () => {
    const code = generateLicenseCode(newType, newDuration);
    setNewCode(code);
  };

  // Criar nova Licença Gratuita
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      toast.error('O código da licença não pode estar vazio.');
      return;
    }

    setIsCreatingLicense(true);
    try {
      await createFreeLicense({
        code: newCode.trim().toUpperCase(),
        type: newType,
        durationDays: Number(newDuration),
        maxUses: Number(newMaxUses),
        active: true,
        expiresAt: newExpiresAt || undefined
      });

      toast.success(`Licença "${newCode.toUpperCase()}" criada com sucesso!`);
      setNewCode(generateLicenseCode(newType, newDuration));
      await loadLicenses();
    } catch (err: any) {
      console.error('Erro ao criar licença:', err);
      toast.error('Falha ao criar licença no banco de dados.');
    } finally {
      setIsCreatingLicense(false);
    }
  };

  // Alternar ativação da licença
  const handleToggleLicense = async (license: FreeLicense) => {
    try {
      await toggleLicenseStatus(license.id, !license.active);
      toast.success(`Licença ${!license.active ? 'ativada' : 'desativada'} com sucesso.`);
      setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, active: !license.active } : l));
    } catch (err) {
      toast.error('Falha ao atualizar status da licença.');
    }
  };

  // Copiar código da licença
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Código ${code} copiado para a área de transferência!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Compartilhar no WhatsApp
  const handleShareWhatsApp = (license: FreeLicense) => {
    const text = `🎉 *Presente Exclusivo Amigo Refrigerista PRO!*\n\n` +
      `Você ganhou acesso ao *Plano Pró por ${license.durationDays} dias*!\n\n` +
      `🔑 Seu Código de Licença: *${license.code}*\n\n` +
      `Acesse a plataforma e resgate no botão "Upgrade / Resgatar Licença".`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Conceder Acesso Total Ilimitado (VIP por e-mail)
  const handleGrantVipAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToGrant.trim()) {
      toast.error('Por favor, informe um e-mail válido.');
      return;
    }

    setLoadingDirectGrant(true);
    try {
      const normalizedEmail = emailToGrant.trim().toLowerCase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error || !data) {
        toast.error('Usuário não encontrado. Peça para o parceiro criar uma conta gratuita no app primeiro com este e-mail.');
        setLoadingDirectGrant(false);
        return;
      }

      await supabase
        .from('profiles')
        .update({
          plano: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      toast.success(`Acesso Total Vitalício concedido com sucesso para ${normalizedEmail}!`);
      setEmailToGrant('');
      loadVipUsers();
    } catch (error) {
      console.error('Erro ao conceder acesso VIP:', error);
      toast.error('Falha ao conceder permissão VIP. Tente novamente.');
    } finally {
      setLoadingDirectGrant(false);
    }
  };

  // Revogar Acesso VIP
  const handleRevokeVip = async (userId: string, userEmail: string) => {
    const confirm = window.confirm(`Deseja remover o acesso VIP de ${userEmail}? A conta voltará ao Plano Gratuito básico.`);
    if (!confirm) return;

    try {
      await supabase
        .from('profiles')
        .update({
          plano: 'free',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      toast.success('Acesso VIP revogado com sucesso.');
      loadVipUsers();
    } catch (err) {
      console.error('Erro ao revogar VIP:', err);
      toast.error('Falha ao revogar acesso VIP.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070e1c] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldOff size={28} />
          </div>
          <h1 className="text-xl font-bold">Acesso Restrito ao Administrador</h1>
          <p className="text-xs text-slate-400">Esta página de gerenciamento de cupons e acessos VIP é exclusiva para o administrador principal.</p>
          <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition">
            Voltar para o Aplicativo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8 space-y-8">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                PAINEL VIP & LICENÇAS
              </span>
              <span className="text-xs text-slate-400">{user?.email}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Gerenciador de Cupons e Acessos Pró</h1>
          </div>
        </div>

        <Link href="/" className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition">
          Ver App
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Seção 1: Concessão Direta de VIP */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Crown size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Conceder Acesso Total (VIP Vitalício)</h2>
              <p className="text-xs text-slate-400">Liberar Plano Pró de forma imediata para o e-mail de um parceiro ou técnico</p>
            </div>
          </div>

          <form onSubmit={handleGrantVipAccess} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="E-mail do técnico cadastrado no app..."
              value={emailToGrant}
              onChange={(e) => setEmailToGrant(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loadingDirectGrant}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {loadingDirectGrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={16} />}
              <span>Liberar Acesso Pró Imediato</span>
            </button>
          </form>
        </div>

        {/* Seção 2: Gerador de Cupons de Licença */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Criar Novo Cupom</h3>
                <p className="text-xs text-slate-400">Gere códigos promocionais de teste para técnicos</p>
              </div>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tipo de Licença</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    setNewType(e.target.value as any);
                    setTimeout(handleGenerateRandomCode, 50);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="promotional">Promocional (PROMO)</option>
                  <option value="trial">Período de Testes (TRIAL)</option>
                  <option value="partner">Parceiro Comercial (PARCEIRO)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Duração (Dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newDuration}
                    onChange={(e) => {
                      setNewDuration(Number(e.target.value));
                      setTimeout(handleGenerateRandomCode, 50);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Limite de Usos</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Código do Cupom</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={10} />
                    <span>Gerar Outro</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase font-bold text-sky-300"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingLicense}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isCreatingLicense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                <span>Salvar e Publicar Cupom</span>
              </button>
            </form>
          </div>

          {/* Lista de Cupons Ativos */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-sky-400" />
                  <span>Cupons de Licença Ativos ({licenses.length})</span>
                </h3>
                <p className="text-xs text-slate-400">Gerencie e compartilhe códigos com sua base de técnicos</p>
              </div>
              <button
                type="button"
                onClick={loadLicenses}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Atualizar lista"
              >
                <RefreshCw size={14} className={fetchingLicenses ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {fetchingLicenses ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                </div>
              ) : licenses.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Nenhum cupom de licença cadastrado. Crie o primeiro ao lado!
                </div>
              ) : (
                licenses.map((lic) => (
                  <div key={lic.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sky-300 text-sm tracking-wider">{lic.code}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          lic.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {lic.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>Duração: <strong className="text-white">{lic.durationDays} dias</strong></span>
                        <span>•</span>
                        <span>Usos: <strong className="text-white">{lic.usedCount || 0} / {lic.maxUses}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(lic.code)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Copiar código"
                      >
                        {copiedCode === lic.code ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(lic)}
                        className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition cursor-pointer"
                        title="Compartilhar WhatsApp"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleLicense(lic)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        title={lic.active ? 'Desativar cupom' : 'Ativar cupom'}
                      >
                        {lic.active ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-slate-500" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Seção 3: Lista de Usuários VIP & Assinantes Atuais */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Parceiros VIP e Assinantes Ativos ({vipList.length})</span>
              </h3>
              <p className="text-xs text-slate-400">Lista de contas com acesso Pró liberado ou vitalício</p>
            </div>
            <button
              type="button"
              onClick={loadVipUsers}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Atualizar lista"
            >
              <RefreshCw size={14} className={fetchingVipList ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-3">
            {fetchingVipList ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : vipList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Nenhum usuário VIP ou assinante registrado no momento.
              </div>
            ) : (
              vipList.map((vUser) => (
                <div key={vUser.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{vUser.name || 'Técnico'}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {vUser.subscription?.plan?.toUpperCase() || 'VIP'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{vUser.email} · ID: {vUser.id}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleRevokeVip(vUser.id, vUser.email)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition cursor-pointer"
                    >
                      Revogar VIP
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
