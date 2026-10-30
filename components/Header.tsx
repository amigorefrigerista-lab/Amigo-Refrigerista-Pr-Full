'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Snowflake, Bell, Settings, LogOut, Download, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenSupportModal?: () => void;
  onOpenUpgradeModal?: () => void;
  onOpenAdminHub?: () => void;
  unreadCount?: number;
}

export function Header({ onOpenNotifications, onOpenSettings, onOpenUpgradeModal, onOpenAdminHub, unreadCount = 0 }: HeaderProps) {
  const router = useRouter();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { isInstalled, install } = usePWAInstall();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sessão encerrada!');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Técnico';
  const avatarUrl = user?.photoURL || (displayName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0284c7&color=fff&size=80&bold=true` : null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#070e1c]/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-sm transition-colors duration-200">
      {/* Marca / Logo Compacto e Limpo */}
      <Link href="/" className="flex items-center gap-2 group min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
          <Snowflake size={17} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-900 dark:text-white font-black tracking-tight text-sm sm:text-base truncate">
            Amigo <span className="text-sky-500 dark:text-sky-400">Refrigerista</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-black tracking-wider uppercase shrink-0">
            PRO
          </span>
        </div>
      </Link>

      {/* Ações Direitas Simplificadas */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isAdmin && onOpenAdminHub && (
          <button
            type="button"
            onClick={onOpenAdminHub}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Central do Criador & Admin SaaS"
          >
            <ShieldCheck size={15} />
            <span className="hidden sm:inline">Painel Criador</span>
          </button>
        )}

        {!isInstalled && (
          <button
            type="button"
            onClick={() => void install()}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Instalar Aplicativo no Android ou iPhone (iOS)"
          >
            <Download size={14} strokeWidth={2.5} />
            <span className="inline">Instalar App</span>
          </button>
        )}

        <ThemeToggle />

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition relative cursor-pointer"
            title="Notificações"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        )}



        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Configurações e Perfil"
          >
            <div className="w-6 h-6 rounded-md overflow-hidden bg-sky-950 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <Settings size={13} className="text-sky-400" />
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold max-w-[100px] truncate">
              {displayName}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition cursor-pointer"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default Header;
