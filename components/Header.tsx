'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Snowflake, Bell, Settings, LogOut, Download, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenSupportModal?: () => void;
  onOpenUpgradeModal?: () => void;
  unreadCount?: number;
}

export function Header({ onOpenNotifications, onOpenSettings, onOpenUpgradeModal, unreadCount = 0 }: HeaderProps) {
  const router = useRouter();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { isInstalled, install } = usePWAInstall();

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

  const currentPlan = isAdmin ? 'pro' : profile?.subscription?.plan || 'free';
  const planLabel = currentPlan === 'pro' || currentPlan === 'pro_paid' ? 'Plano PRO' : currentPlan === 'flex' ? 'Plano Flex' : 'Plano Gratuito (Free)';
  const planBadgeBg = currentPlan === 'pro' || currentPlan === 'pro_paid' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' : currentPlan === 'flex' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#070e1c]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] transition-colors duration-200">
      {/* Lado Esquerdo: Marca & Logo */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_18px_rgba(14,165,233,0.4)] group-hover:scale-105 transition-transform shrink-0">
            <Snowflake size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-slate-900 dark:text-white font-black tracking-tight text-[13px] min-[375px]:text-sm sm:text-base font-sans leading-none truncate">
                Amigo <span className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent">Refrigerista</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 dark:border-sky-400/30 text-[9px] font-black tracking-widest uppercase shrink-0">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block leading-tight mt-0.5">
              Solução Inteligente para HVAC-R
            </span>
          </div>
        </Link>
      </div>

      {/* Lado Direito: Instalar App, Alternador de Tema, Notificações, Configurações & Perfil */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {!isInstalled && (
          <button
            type="button"
            onClick={() => {
              void install();
            }}
            className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[11px] sm:text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer select-none"
            title="Instalar Aplicativo no Dispositivo"
            aria-label="Instalar Aplicativo"
          >
            <Download size={14} strokeWidth={2.5} className="shrink-0" />
            <span className="hidden min-[440px]:inline">Instalar App</span>
          </button>
        )}

        <ThemeToggle />

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition relative cursor-pointer"
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
            className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-200 transition-all cursor-pointer group shadow-xs"
            title="Configurações e Perfil do Técnico"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden border border-sky-400/40 shrink-0 bg-sky-950 flex items-center justify-center">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <Settings size={14} className="text-sky-400" />
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
              {displayName}
            </span>
            <Settings size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:rotate-45 transition-all hidden sm:block" />
          </button>
        )}

        {/* Indicador de Plano e Botão de Upgrade */}
        {onOpenUpgradeModal && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 ${planBadgeBg} hover:opacity-90`}
            title="Clique para ver detalhes do plano e fazer upgrade"
          >
            <Crown size={14} className="shrink-0 animate-pulse text-amber-400" />
            <span className="truncate max-w-[68px] min-[400px]:max-w-[95px] sm:max-w-none">
              {currentPlan === 'pro' || currentPlan === 'pro_paid' ? 'PRO' : currentPlan === 'flex' ? 'Flex' : 'Free'}
              <span className="hidden sm:inline">{currentPlan === 'pro' || currentPlan === 'pro_paid' ? ' Ativo' : currentPlan === 'flex' ? ' VIP' : ' (Grátis)'}</span>
            </span>
            <span className="hidden md:inline text-[10px] underline font-bold opacity-85 ml-0.5">Upgrade</span>
          </button>
        )}

        {/* Botão de Sair / Encerrar Sessão */}
        <button
          type="button"
          onClick={handleSignOut}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 font-bold text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.15)] active:scale-95 cursor-pointer select-none"
          title="Encerrar Sessão e Sair do Aplicativo"
          aria-label="Encerrar Sessão"
        >
          <LogOut size={15} className="text-rose-500 dark:text-rose-400 shrink-0" />
          <span className="hidden sm:inline font-bold">Sair</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
