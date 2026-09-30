'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getAdminMetrics, AdminMetrics } from '@/app/actions/getAdminMetrics';
import { 
  DollarSign, 
  Users, 
  Crown, 
  Zap, 
  Shield, 
  FileText, 
  Bot, 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  TrendingUp, 
  Lock,
  LogOut,
  ShieldAlert,
  Headset,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const ADMIN_EMAIL = 'amigorefrigerista@gmail.com';

const CustomSubscriptionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#070e1c]/95 border border-sky-500/30 p-3 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs space-y-1 font-mono">
        <p className="font-bold text-white text-xs border-b border-sky-500/20 pb-1 flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className="text-[10px] text-emerald-400 font-normal">Assinaturas Pagas</span>
        </p>
        <div className="space-y-1 text-[11px] pt-0.5">
          <p className="text-amber-400 font-bold flex items-center justify-between gap-4">
            <span>👑 Plano Pró (R$ 39,90):</span>
            <span>{data.pro} assinantes</span>
          </p>
          <p className="text-sky-400 font-bold flex items-center justify-between gap-4">
            <span>⚡ Plano Flex (R$ 19,90):</span>
            <span>{data.flex} assinantes</span>
          </p>
          <p className="text-emerald-400 font-extrabold flex items-center justify-between gap-4 border-t border-sky-500/20 pt-1">
            <span>📊 Total Pagantes:</span>
            <span>{data.totalPaid} assinantes</span>
          </p>
          <p className="text-cyan-300 font-extrabold flex items-center justify-between gap-4">
            <span>💰 Receita Recorrente (MRR):</span>
            <span>R$ {data.mrr?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminPage() {
  const router = useRouter();
  const { user: authUser, profile, isAdmin: isAuthAdmin, signInWithGoogle, signInWithEmail, signOut: authSignOut, isSupabaseActive } = useAuth();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [adminEmailInput, setAdminEmailInput] = useState<string>('amigorefrigerista@gmail.com');
  const [adminPassInput, setAdminPassInput] = useState<string>('');
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [showDomainHelper, setShowDomainHelper] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getAdminMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas do admin:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      if (isAuthAdmin) {
        setIsAdmin(true);
        setAuthError(null);
        handleRefresh();
      } else {
        setIsAdmin(false);
        setAuthError(`A conta conectada (${authUser.email || 'Usuário'}) não possui privilégios de administrador.`);
      }
      setLoading(false);
    } else {
      setCurrentUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [authUser, isAuthAdmin, handleRefresh]);

  const handleLoginAdmin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const { error } = await signInWithGoogle();
      if (error) {
        setAuthError(error.message || 'Falha ao autenticar com o Google.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim() || !adminPassInput) {
      setAuthError('Informe o e-mail e a senha administrativa.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const { error } = await signInWithEmail(adminEmailInput.trim(), adminPassInput);
      if (error) {
        setAuthError(error.message || 'E-mail ou senha incorretos.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao autenticar com e-mail e senha.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authSignOut();
      setCurrentUser(null);
      setIsAdmin(false);
      setMetrics(null);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="text-slate-300 text-sm font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Verificando acesso administrativo...
        </p>
      </div>
    );
  }

  if (!isAdmin || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Acesso Restrito ao Administrador
            </h1>
            <p className="text-xs text-slate-400">
              Painel de uso exclusivo da gerência do <strong className="text-slate-200">Amigo Refrigerista Pro</strong>.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <div className="space-y-3">
            {!currentUser ? (
              <button
                onClick={handleLoginAdmin}
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-950" />
                )}
                <span>Entrar como Administrador</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleLoginAdmin}
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Trocar de Conta (Login Admin)</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta Atual</span>
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

  const totalPaidUsers = metrics ? (metrics.flexCount + metrics.proCount) : 0;
  const conversionRate = metrics && metrics.totalUsers > 0
    ? ((totalPaidUsers / metrics.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
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
              <Link 
                href="/suporte-central" 
                className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <Headset className="w-4 h-4 text-indigo-400" />
                <span>Central de Suporte</span>
              </Link>
              <Link 
                href="/admin/vip" 
                className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 transition flex items-center gap-1.5 text-xs font-bold"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Gestão VIP</span>
              </Link>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Administrador ({currentUser?.email})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Painel Geral de Administração
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Visão geral de assinantes, receita e métricas do Amigo Refrigerista Pro
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar Métricas</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {metrics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg shadow-emerald-500/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-medium">Receita Mensal (MRR)</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  R$ {metrics.mrr.toFixed(2)}
                </div>
                <p className="text-slate-400 text-[11px] flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Faturamento recorrente dos planos Flex + Pró
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-medium">Total de Usuários</span>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {metrics.totalUsers}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Técnicos cadastrados no app
                </p>
              </div>

              <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-medium">Assinantes Pagantes</span>
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <Crown className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {totalPaidUsers}
                </div>
                <p className="text-sky-400 text-[11px] font-medium">
                  Taxa de conversão: {conversionRate}%
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-medium">OS Criadas no Mês</span>
                  <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {metrics.totalOrdersThisMonth}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Uso ativo das ordens de serviço
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Crescimento Histórico de Assinaturas Pagas (Últimos 6 Meses)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Evolução mensal de assinantes ativos nos planos Flex (R$ 19,90) e Pró (R$ 39,90)
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-medium bg-slate-950/60 p-2 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Total Pagantes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Plano Pró</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span>Plano Flex</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-72 pt-2">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.historicalGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomSubscriptionTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="totalPaid" 
                        name="Total Pagantes" 
                        stroke="#10b981" 
                        strokeWidth={3.5} 
                        dot={{ r: 5, fill: '#059669', stroke: '#10b981', strokeWidth: 2 }}
                        activeDot={{ r: 8, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pro" 
                        name="Plano Pró" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#d97706' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="flex" 
                        name="Plano Flex" 
                        stroke="#38bdf8" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#0284c7' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Distribuição por Planos de Assinatura</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-white">Plano Gratuito</span>
                    </div>
                    <p className="text-xs text-slate-400">R$ 0/mês</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-slate-200">{metrics.freeCount}</span>
                    <p className="text-[11px] text-slate-400">usuários</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-400" />
                      <span className="text-sm font-semibold text-white">Plano Flex</span>
                    </div>
                    <p className="text-xs text-slate-400">R$ 19,90/mês</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-sky-400">{metrics.flexCount}</span>
                    <p className="text-[11px] text-slate-400">assinantes</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Plano Pró</span>
                    </div>
                    <p className="text-xs text-slate-400">R$ 39,90/mês</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-amber-400">{metrics.proCount}</span>
                    <p className="text-[11px] text-slate-400">assinantes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">
                      Consumo de Consultas à IA (Gemini)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total de diagnósticos e leituras efetuados este mês
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-2xl font-black text-purple-300">
                    {metrics.totalAiQueriesThisMonth}
                  </span>
                  <p className="text-[11px] text-slate-400 font-medium">requisições este mês</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
