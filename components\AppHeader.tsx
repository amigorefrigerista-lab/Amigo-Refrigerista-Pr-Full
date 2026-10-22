'use client';

import React from 'react';
import { Crown, Sparkles, ShieldCheck, Snowflake } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

export interface HeaderUserProps {
  name: string;
  companyName?: string;
  photoUrl?: string;
  isVip: boolean;
}

export interface HeaderProps {
  user: HeaderUserProps;
  onOpenSettings?: () => void;
}

export function AppHeader({ user }: HeaderProps) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AR';

  return (
    <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm dark:shadow-lg transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Avatar do Usuário */}
        <div className="relative">
          {user.photoUrl ? (
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative shrink-0">
              <Image
                src={user.photoUrl}
                alt={user.name}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 border border-sky-400/30 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              {initials}
            </div>
          )}

          {user.isVip && (
            <div
              className="absolute -top-1 -right-1 p-0.5 bg-amber-500 text-slate-950 rounded-full border border-white dark:border-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              title="Parceiro VIP Ativo"
            >
              <Crown size={11} className="fill-slate-950" />
            </div>
          )}
        </div>

        {/* Informações do Técnico / Empresa */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              {user.name}
            </h2>

            {user.isVip && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 uppercase flex items-center gap-0.5 shadow-[0_0_10px_rgba(245,158,11,0.3)] shrink-0">
                <Sparkles size={10} />
                VIP
              </span>
            )}
          </div>

          {user.companyName ? (
            <p className="text-[11px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{user.companyName}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Técnico em Refrigeração</p>
          )}
        </div>
      </div>

      {/* Alternador de Tema & Marca d'água / App Title */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div className="text-right hidden sm:block">
          <span className="text-xs font-black text-slate-900 dark:text-white block leading-none">
            Amigo Refrigerista
          </span>
          <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
            PRO
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <Snowflake size={18} />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
