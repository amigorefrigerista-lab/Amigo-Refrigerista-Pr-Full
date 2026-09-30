'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  Headset, 
  Search, 
  UserCheck, 
  Smartphone, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Crown, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Lock, 
  Loader2, 
  AlertTriangle,
  History,
  Trash2,
  Sparkles
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';

interface SubscriberUser {
  uid: string;
  email: string | null;
  name?: string;
  role?: 'admin' | 'support' | 'user';
  subscription?: {
    plan: 'free' | 'flex' | 'pro';
    status: 'active' | 'cancelled' | 'past_due';
    updatedAt?: string;
  };
  lastActiveDevice?: string;
  lastLoginAt?: string;
  deviceInfo?: {
    deviceId: string;
    userAgent: string;
    platform: string;
    lastLogin: string;
  };
}

export default function CentralSuportePage() {
  const router = useRouter();
  const { user: authUser, profile, isSupportOrAdmin, role, signInWithGoogle, signInWithEmail, signOut: authSignOut } = useAuth();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'support' | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<SubscriberUser | null>(null);
  const [updating, setUpdating] = useState(false);
  const [recentUsers, setRecentUsers] = useState<SubscriberUser[]>([]);

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      if (isSupportOrAdmin) {
        setCurrentUserRole(role === 'admin' ? 'admin' : 'support');
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
      setLoading(false);
    } else {
      setCurrentUser(null);
      setIsAuthorized(false);
      setLoading(false);
    }
  }, [authUser, isSupportOrAdmin, role]);

  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Digite um e-mail ou ID de usuário');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const term = searchTerm.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${term},email.ilike.%${term}%,nome.ilike.%${term}%`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const p = data[0];
        setFoundUser({
          uid: p.id,
          email: p.email,
          name: p.nome,
          role: p.role,
          subscription: {
            plan: p.plano || 'free',
            status: 'active',
            updatedAt: p.updated_at
          },
          lastActiveDevice: p.last_active_device,
          lastLoginAt: p.last_login_at,
          deviceInfo: p.device_info
        });
        toast.success('Assinante localizado!');
      } else {
        toast.error('Nenhum usuário localizado com este termo.');
      }
    } catch (err: any) {
      console.error('Erro na busca de assinante:', err);
      toast.error('Falha ao buscar no banco de dados.');
    } finally {
      setSearching(false);
    }
  };

  const handleResetDevice = async () => {
    if (!foundUser) return;
    if (!confirm(`Deseja realmente desvincular o aparelho de ${foundUser.name || foundUser.email}? O usuário poderá autenticar em um novo aparelho no próximo login.`)) {
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_active_device: null,
          device_info: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.uid);

      if (error) throw error;

      setFoundUser(prev => prev ? { ...prev, lastActiveDevice: undefined, deviceInfo: undefined } : null);
      toast.success('Aparelho desvinculado com sucesso! Acesso liberado.');
    } catch (err: any) {
      console.error('Erro ao resetar aparelho:', err);
      toast.error('Falha ao desvincular aparelho.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePlan = async (newPlan: 'free' | 'flex' | 'pro') => {
    if (!foundUser) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plano: newPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.uid);

      if (error) throw error;

      setFoundUser(prev => prev ? {
        ...prev,
        subscription: {
          plan: newPlan,
          status: 'active',
          updatedAt: new Date().toISOString()
        }
      } : null);

      toast.success(`Plano alterado para ${newPlan.toUpperCase()} com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao mudar plano:', err);
      toast.error('Falha ao atualizar plano.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8 space-y-6">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                SUPORTE TÉCNICO PRO
              </span>
              <span className="text-xs text-slate-400">{currentUser?.email}</span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Central de Atendimento ao Assinante</h1>
          </div>
        </div>

        <button
          onClick={async () => {
            await authSignOut();
            router.push('/');
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
        >
          Sair
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {!isAuthorized ? (
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Lock size={28} />
            </div>
            <h2 className="text-lg font-bold text-white">Acesso Restrito</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Esta central é exclusiva para equipe de Suporte Técnico e Administradores do Amigo Refrigerista Pro.
            </p>
            <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition">
              Voltar ao Início
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Barra de Pesquisa */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Search size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Localizar Assinante</h3>
                  <p className="text-xs text-slate-400">Busque por e-mail, nome ou ID de usuário para gerenciar acesso e planos</p>
                </div>
              </div>

              <form onSubmit={handleSearchUser} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o e-mail, nome ou ID do assinante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search size={16} />}
                  <span>Pesquisar</span>
                </button>
              </form>
            </div>

            {/* Resultado da Busca */}
            {foundUser && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{foundUser.name || 'Técnico Assinante'}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        Plano: {foundUser.subscription?.plan || 'free'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{foundUser.email} · ID: {foundUser.uid}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDevice}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>Resetar Aparelho (1 Aparelho)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>Gerenciamento de Dispositivo</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Dispositivo Ativo ID: <strong className="text-white font-mono">{foundUser.lastActiveDevice || 'Nenhum registrado'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Último login: {foundUser.lastLoginAt ? new Date(foundUser.lastLoginAt).toLocaleString('pt-BR') : 'Desconhecido'}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Alteração Manual de Plano</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      {(['free', 'flex', 'pro'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleChangePlan(p)}
                          disabled={updating || foundUser.subscription?.plan === p}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            foundUser.subscription?.plan === p
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
