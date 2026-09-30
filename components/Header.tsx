'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headset, ShieldCheck, Snowflake, Bell, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  unreadCount?: number;
}

export function Header({ onOpenNotifications, onOpenSettings, unreadCount = 0 }: HeaderProps) {
  const router = useRouter();
  const { user, profile, isSupportOrAdmin, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada com sucesso!');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    }
  };

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Técnico';
  const avatarUrl = user?.photoURL || (displayName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff&size=80&bold=true` : null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#070e1c]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Lado Esquerdo: Marca & Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_18px_rgba(14,165,233,0.4)] group-hover:scale-105 transition-transform shrink-0">
            <Snowflake size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-black tracking-tight text-sm sm:text-base font-sans leading-none">
                Amigo <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">Refrigerista</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[9px] font-black tracking-widest uppercase">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block leading-tight mt-0.5">
              Solução Inteligente para HVAC-R
            </span>
          </div>
        </Link>
      </div>

      {/* Lado Direito: Ações Administrativas & Perfil */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Botão de Suporte Central */}
        <Link
          href="/suporte-central"
          className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.2)] active:scale-95 cursor-pointer select-none"
          title="Acessar Central de Atendimento ao Assinante"
        >
          <Headset size={16} className="text-indigo-400 shrink-0" />
          <span className="hidden sm:inline font-bold">Suporte Central</span>
          <span className="sm:hidden font-bold">Suporte</span>
        </Link>

        {/* Botão de Painel de Administração */}
        <Link
          href="/admin"
          className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 cursor-pointer select-none"
          title="Acessar Painel Geral de Administração"
        >
          <ShieldCheck size={16} className="text-amber-400 shrink-0" />
          <span className="hidden sm:inline font-bold">Painel Admin</span>
          <span className="sm:hidden font-bold">Admin</span>
        </Link>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition relative cursor-pointer"
            title="Notificações"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-200 transition-all cursor-pointer group shadow-sm"
            title="Configurações e Perfil do Técnico"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-sky-400/40 shrink-0 bg-sky-950 flex items-center justify-center">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <Settings size={15} className="text-sky-400" />
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold text-slate-200 max-w-[120px] truncate">
              {displayName}
            </span>
            <Settings size={14} className="text-slate-400 group-hover:text-sky-400 group-hover:rotate-45 transition-all" />
          </button>
        )}

        {/* Botão de Sair / Encerrar Sessão */}
        <button
          type="button"
          onClick={handleSignOut}
          className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.15)] active:scale-95 cursor-pointer select-none"
          title="Encerrar Sessão e Sair do Aplicativo"
        >
          <LogOut size={16} className="text-rose-400 shrink-0" />
          <span className="hidden sm:inline font-bold">Sair</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
