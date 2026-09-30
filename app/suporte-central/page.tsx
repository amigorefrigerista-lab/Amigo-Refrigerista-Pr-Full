'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  limit, 
  query 
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
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
  Sparkles,
  Copy,
  ExternalLink,
  Globe,
  Mail
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'support' | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<SubscriberUser | null>(null);
  const [updating, setUpdating] = useState(false);
  const [recentUsers, setRecentUsers] = useState<SubscriberUser[]>([]);
  const [loginEmail, setLoginEmail] = useState('amigorefrigerista@gmail.com');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDomainHelper, setShowDomainHelper] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        const normalizedEmail = user.email?.toLowerCase().trim() || '';
        const isAdminEmail = normalizedEmail === 'amigorefrigerista@gmail.com' || normalizedEmail.endsWith('@amigorefrigerista.com.br');
        
        let role = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            role = userDoc.data()?.role;
          }
        } catch (e) {
          console.warn('Doc check on support page:', e);
        }

        if (isAdminEmail || role === 'admin' || role === 'support') {
          const finalRole = isAdminEmail || role === 'admin' ? 'admin' : 'support';
          setCurrentUserRole(finalRole);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Erro ao verificar credenciais de suporte:', err);
        if (user.email?.toLowerCase().trim() === 'amigorefrigerista@gmail.com') {
          setCurrentUserRole('admin');
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Digite um e-mail ou UID de usuário');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      // 1. Tenta buscar direto por UID
      const docRef = doc(db, 'users', searchTerm.trim());
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setFoundUser({ uid: snap.id, ...snap.data() } as SubscriberUser);
        toast.success('Assinante localizado por UID!');
        setSearching(false);
        return;
      }

      // 2. Busca na lista de usuários
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      let match: SubscriberUser | null = null;

      usersSnap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as SubscriberUser;
        if (
          u.email?.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          u.name?.toLowerCase().includes(searchTerm.trim().toLowerCase())
        ) {
          match = u;
        }
      });

      if (match) {
        setFoundUser(match);
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
      const userRef = doc(db, 'users', foundUser.uid);
      await updateDoc(userRef, {
        lastActiveDevice: null,
        deviceInfo: null,
      });

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
      const userRef = doc(db, 'users', foundUser.uid);
      await updateDoc(userRef, {
        'subscription.plan': newPlan,
        'subscription.status': 'active',
        'subscription.updatedAt': new Date().toISOString()
      });

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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-300 text-sm font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          Verificando credenciais de suporte...
        </p>
      </div>
    );
  }

  if (!isAuthorized || !currentUser) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center p-4 text-white">
        <Toaster position="top-center" richColors theme="dark" />
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Headset className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Central de Atendimento & Suporte
            </h1>
            <p className="text-xs text-slate-400">
              Acesso exclusivo para atendentes e administradores do <strong className="text-slate-200">Amigo Refrigerista</strong>.
            </p>
          </div>

          <div className="space-y-4">
            {!currentUser ? (
              <>
                <button
                  onClick={async () => {
                    try {
                      setIsLoggingIn(true);
                      setShowDomainHelper(false);
                      const provider = new GoogleAuthProvider();
                      await signInWithPopup(auth, provider);
                    } catch (e: any) {
                      if (e?.code === 'auth/unauthorized-domain') {
                        setShowDomainHelper(true);
                        toast.error('Domínio não autorizado no Firebase Auth.', { duration: 5000 });
                      } else {
                        toast.error(e.message || 'Erro ao autenticar');
                      }
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Entrar com Google (1 Clique)</span>
                </button>

                {showDomainHelper && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 text-left">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Autorizar Domínio no Firebase</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Copie o domínio abaixo e adicione em <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>:
                    </p>
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[10px] text-cyan-300 break-all justify-between">
                      <span>{typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const host = typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app';
                          navigator.clipboard.writeText(host);
                          setCopiedDomain(true);
                          setTimeout(() => setCopiedDomain(false), 2000);
                        }}
                        className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 shrink-0 cursor-pointer hover:bg-amber-400"
                      >
                        <Copy size={12} />
                        <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <a
                      href="https://console.firebase.google.com/project/celestial-fragment-rpnh2/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-bold underline flex items-center gap-1 pt-1"
                    >
                      <span>Abrir Firebase Console</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">ou com e-mail e senha</span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!loginEmail.trim() || !loginPass) {
                      toast.error('Informe e-mail e senha');
                      return;
                    }
                    try {
                      setIsLoggingIn(true);
                      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPass);
                      toast.success('Login efetuado com sucesso!');
                    } catch (err: any) {
                      toast.error(err.message || 'Falha ao autenticar.');
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  className="space-y-3 text-left"
                >
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">E-mail de Atendimento</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="amigorefrigerista@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Senha de Acesso</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs border border-indigo-500/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>Acessar com Senha</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-rose-300 text-center bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                  A conta <strong>{currentUser.email}</strong> não possui permissão de atendente.
                </p>
                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      const provider = new GoogleAuthProvider();
                      await signInWithPopup(auth, provider);
                    } catch (e: any) {
                      toast.error(e.message || 'Erro ao trocar de conta');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  <span>Trocar de Conta</span>
                </button>
              </div>
            )}

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Aplicativo Principal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <Toaster position="top-center" richColors theme="dark" />
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link 
                href="/" 
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao App</span>
              </Link>
              {currentUserRole === 'admin' && (
                <Link 
                  href="/admin" 
                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 transition flex items-center gap-1.5 text-xs font-medium"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Painel Admin Geral</span>
                </Link>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Headset className="w-8 h-8 text-indigo-400" />
              Central de Atendimento ao Assinante
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Desbloqueio de aparelhos, suporte a técnicos e troca rápida de planos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              {currentUser?.email}
            </span>
          </div>
        </div>

        {/* Barra de Busca de Usuário */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            <span>Localizar Assinante</span>
          </h2>
          <form onSubmit={handleSearchUser} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o e-mail do técnico ou o UID da conta..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Buscar</span>
            </button>
          </form>
        </div>

        {/* Detalhes do Usuário Localizado */}
        {foundUser && (
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-400">UID: {foundUser.uid}</span>
                <h3 className="text-xl font-bold text-white mt-1">{foundUser.name || 'Sem nome cadastrado'}</h3>
                <p className="text-sm text-indigo-300">{foundUser.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-200">
                  Plano: {foundUser.subscription?.plan?.toUpperCase() || 'FREE'}
                </span>
              </div>
            </div>

            {/* Gerenciamento de Aparelho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Status do Aparelho Vinculado
                  </span>
                  {foundUser.lastActiveDevice ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Dispositivo Vinculado
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Liberado para Novo Login
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  ID: <span className="font-mono text-slate-300">{foundUser.lastActiveDevice || 'Nenhum aparelho ativo'}</span>
                </p>

                {foundUser.lastActiveDevice && (
                  <button
                    onClick={handleResetDevice}
                    disabled={updating}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Desvincular Aparelho (Permitir Novo Celular)</span>
                  </button>
                )}
              </div>

              {/* Troca de Plano */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Gerenciar Plano de Acesso
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleChangePlan('free')}
                    disabled={updating}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      foundUser.subscription?.plan === 'free'
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Gratuito
                  </button>
                  <button
                    onClick={() => handleChangePlan('flex')}
                    disabled={updating}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      foundUser.subscription?.plan === 'flex'
                        ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Flex (19,90)
                  </button>
                  <button
                    onClick={() => handleChangePlan('pro')}
                    disabled={updating}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      foundUser.subscription?.plan === 'pro'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Pró (39,90)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
