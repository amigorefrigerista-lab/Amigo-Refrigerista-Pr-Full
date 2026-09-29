'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';
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
  AlertCircle
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
  
  // Tabs: 'licenses' | 'subscribers' | 'direct_vip'
  const [activeTab, setActiveTab] = useState<'licenses' | 'subscribers' | 'direct_vip'>('licenses');

  // Direct VIP Grant State
  const [emailToGrant, setEmailToGrant] = useState('');
  const [loadingDirectGrant, setLoadingDirectGrant] = useState(false);
  const [vipList, setVipList] = useState<VipUser[]>([]);
  const [fetchingVipList, setFetchingVipList] = useState(true);

  // Free Licenses State
  const [licenses, setLicenses] = useState<FreeLicense[]>([]);
  const [fetchingLicenses, setFetchingLicenses] = useState(true);
  const [isCreatingLicense, setIsCreatingLicense] = useState(false);
  const [newCode, setNewCode] = useState('PROMO-REFRIGERACAO-30');
  const [newType, setNewType] = useState<'trial' | 'partner' | 'promotional'>('promotional');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newMaxUses, setNewMaxUses] = useState<number>(50);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load all Free Licenses from Firestore
  const loadLicenses = useCallback(async () => {
    if (!auth.currentUser) return;
    setFetchingLicenses(true);
    try {
      const data = await listFreeLicenses();
      setLicenses(data);
    } catch (err: any) {
      console.error('Erro ao carregar licenças:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.LIST, 'licenses');
      }
      toast.error('Erro ao carregar lista de licenças.');
    } finally {
      setFetchingLicenses(false);
    }
  }, []);

  // Load VIP and Subscribed Users
  const loadVipUsers = useCallback(async () => {
    if (!auth.currentUser) return;
    setFetchingVipList(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const users: VipUser[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isVip || (data.subscription && data.subscription.plan !== 'free')) {
          users.push({ id: docSnap.id, ...data } as VipUser);
        }
      });
      setVipList(users);
    } catch (err: any) {
      console.error('Erro ao buscar parceiros e assinantes:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
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
      `Acesse https://ais-pre-rt3dowy4bce2imjcgk7kq5-546064254082.us-east1.run.app e resgate no botão "Upgrade / Resgatar Licença".`;
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
      const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Usuário não encontrado. Peça para o parceiro criar uma conta gratuita no app primeiro com este e-mail.');
        setLoadingDirectGrant(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const today = new Date().toISOString().split('T')[0];
      const farFuture = '2099-12-31';

      const newSub: UserSubscription = {
        userId: userDoc.id,
        plan: 'pro_paid',
        licenseKeyUsed: 'VIP-LIFETIME-DIRECT',
        startDate: today,
        endDate: farFuture,
        isVip: true,
        status: 'active'
      };
      
      await updateDoc(doc(db, 'users', userDoc.id), {
        isVip: true,
        subscription: newSub,
        updatedAt: new Date().toISOString(),
      });

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
      await updateDoc(doc(db, 'users', userId), {
        isVip: false,
        'subscription.plan': 'free',
        'subscription.status': 'canceled',
        'subscription.isLifetimeFree': false,
        'subscription.updatedAt': new Date().toISOString(),
      });

      toast.success(`Acesso VIP revogado para ${userEmail}.`);
      loadVipUsers();
    } catch (error) {
      console.error('Erro ao revogar VIP:', error);
      toast.error('Erro ao revogar permissão VIP.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center p-4 text-white text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <Shield className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Acesso Restrito ao Administrador</h2>
          <p className="text-xs text-slate-400">
            Você precisa estar logado como administrador para gerenciar licenças e parceiros VIP.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-bold text-xs"
          >
            <ArrowLeft size={16} />
            Voltar ao Aplicativo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-white p-4 sm:p-8">
      <Toaster position="top-center" richColors theme="dark" />
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Crown size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">
                  Central de Licenças & Assinaturas VIP
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  Admin Master
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Crie códigos de licenças gratuitas (FreeLicense) com 30, 60 ou 90 dias e gerencie assinantes.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Voltar ao App
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'licenses'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <KeyRound size={16} />
            <span>Licenças Promocionais ({licenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users size={16} />
            <span>Usuários & Assinantes ({vipList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('direct_vip')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'direct_vip'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck size={16} />
            <span>Concessão Direta por E-mail</span>
          </button>
        </div>

        {/* TAB 1: GERADOR E LISTA DE LICENÇAS (FreeLicense) */}
        {activeTab === 'licenses' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Formulário de Criação de Licença */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <Plus size={18} />
                  <span>Criar Nova Licença Gratuita (FreeLicense)</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRandomCode}
                  className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Gerar Código Automático</span>
                </button>
              </div>

              <form onSubmit={handleCreateLicense} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {/* Código */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-slate-400 font-semibold block">
                    Código do Cupom / Licença:
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="Ex: PROMO-REFRIGERACAO-30"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-400 uppercase text-xs"
                  />
                </div>

                {/* Tipo de Licença */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Tipo:</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="promotional">Promocional (Promo)</option>
                    <option value="trial">Trial (Período de Teste)</option>
                    <option value="partner">Parceiro VIP</option>
                  </select>
                </div>

                {/* Duração em Dias */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Duração (dias):</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value={30}>30 Dias (1 Mês)</option>
                    <option value={60}>60 Dias (2 Meses)</option>
                    <option value={90}>90 Dias (3 Meses)</option>
                    <option value={180}>180 Dias (6 Meses)</option>
                    <option value={365}>365 Dias (1 Ano)</option>
                  </select>
                </div>

                {/* Limite Máximo de Usuários */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Limite de Usuários (maxUses):</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                {/* Data de Expiração (Opcional) */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Expira em (Opcional):</label>
                  <input
                    type="date"
                    value={newExpiresAt}
                    onChange={(e) => setNewExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                {/* Botão de Envio */}
                <div className="md:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={isCreatingLicense}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingLicense ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Criar e Ativar Licença</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Licenças Cadastradas */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound size={16} className="text-amber-400" />
                  <span>Licenças Cadastradas no Sistema</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {licenses.length} licenças
                </span>
              </div>

              {fetchingLicenses ? (
                <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-amber-400" />
                  Carregando licenças do banco...
                </div>
              ) : licenses.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <p>Nenhuma licença cadastrada ainda.</p>
                  <p className="text-slate-600">Crie o código &quot;PROMO-REFRIGERACAO-30&quot; no formulário acima para os técnicos!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {licenses.map((lic) => {
                    const progress = Math.min(100, Math.round((lic.usedCount / lic.maxUses) * 100));
                    const isExhausted = lic.usedCount >= lic.maxUses;
                    
                    return (
                      <div
                        key={lic.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          lic.active && !isExhausted
                            ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/50 border-slate-900 opacity-60'
                        } space-y-3`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-amber-400">
                                {lic.code}
                              </span>
                              <button
                                onClick={() => handleCopyCode(lic.code)}
                                title="Copiar Código"
                                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                {copiedCode === lic.code ? (
                                  <Check size={14} className="text-emerald-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                lic.type === 'partner'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : lic.type === 'trial'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {lic.type}
                              </span>

                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock size={11} className="text-amber-400" />
                                {lic.durationDays} dias grátis
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleShareWhatsApp(lic)}
                              title="Compartilhar no WhatsApp"
                              className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition cursor-pointer"
                            >
                              <MessageCircle size={15} />
                            </button>

                            <button
                              onClick={() => handleToggleLicense(lic)}
                              title={lic.active ? 'Desativar Licença' : 'Ativar Licença'}
                              className={`p-2 rounded-xl border transition cursor-pointer ${
                                lic.active
                                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/25'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {lic.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Barra de Progresso de Utilização */}
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Resgates: <strong>{lic.usedCount}</strong> de {lic.maxUses}</span>
                            <span className="font-mono">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isExhausted ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {lic.expiresAt && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar size={11} />
                            Expira em: {lic.expiresAt}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USUÁRIOS E ASSINANTES (UserSubscription) */}
        {activeTab === 'subscribers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-cyan-400" />
                  <span>Usuários com Assinaturas e Licenças Ativas</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitoramento em tempo real de planos Pró, Licenças Free e VIPs vitalícios.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {vipList.length} usuários
              </span>
            </div>

            {fetchingVipList ? (
              <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-cyan-400" />
                Carregando dados dos assinantes...
              </div>
            ) : vipList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum usuário com licença ou plano ativo encontrado no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {vipList.map((client) => {
                  const sub = client.subscription;
                  const daysLeft = sub?.endDate ? getSubscriptionDaysRemaining(sub.endDate) : 999;
                  const isTrial = sub?.plan === 'pro_trial';
                  const isPaid = sub?.plan === 'pro_paid';

                  return (
                    <div
                      key={client.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white">{client.name || 'Técnico HVAC'}</h4>
                          
                          {isTrial && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                              Licença Trial ({daysLeft} dias rest.)
                            </span>
                          )}

                          {isPaid && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                              Pró Assinante
                            </span>
                          )}

                          {client.isVip && !isTrial && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                              VIP Vitalício
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-slate-400">{client.email}</p>

                        {sub?.licenseKeyUsed && (
                          <p className="text-[11px] text-amber-400 font-mono">
                            Código Utilizado: <strong>{sub.licenseKeyUsed}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px] font-mono text-slate-400">
                          {sub?.startDate && sub?.endDate && (
                            <div>
                              <span>De: {sub.startDate}</span>
                              <span className="block text-slate-300">Até: {sub.endDate}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleRevokeVip(client.id, client.email)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <ShieldOff size={14} />
                          <span>Revogar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONCESSÃO DIRETA POR E-MAIL */}
        {activeTab === 'direct_vip' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <UserCheck size={18} />
                <span>Conceder Acesso Total Ilimitado (VIP Vitalício) por E-mail</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Utilize esta ferramenta para parceiros institucionais ou influenciadores que devam ter acesso perpétuo sem expiração.
              </p>

              <form onSubmit={handleGrantVipAccess} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="E-mail do parceiro ou técnico (ex: parceiro@refrigeracao.com)"
                    value={emailToGrant}
                    onChange={(e) => setEmailToGrant(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingDirectGrant}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {loadingDirectGrant ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <UserCheck size={16} />
                      <span>Conceder VIP Vitalício</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
