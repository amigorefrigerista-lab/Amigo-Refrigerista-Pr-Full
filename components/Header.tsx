'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headset, ShieldCheck, Snowflake, Bell, Settings, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onNewService?: () => void;
  unreadCount?: number;
}

export function Header({ onOpenNotifications, onOpenSettings, onNewService, unreadCount = 0 }: HeaderProps) {
  const router = useRouter();
  const { user, isSupportOrAdmin, isAdmin } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#070e1c]/90 backdrop-blur-xl border-b border-sky-500/15 px-4 md:px-8 py-2.5 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_16px_rgba(14,165,233,0.4)] group-hover:scale-105 transition-transform">
            <Snowflake size={18} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-white font-black tracking-tight text-sm md:text-base font-sans">
              Amigo <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">Refrigerista</span>
            </h1>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[9px] font-black tracking-widest uppercase">
              PRO
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botão de Destaque: Criar Novo Serviço (Nova OS) */}
        {onNewService && (
          <button
            type="button"
            onClick={onNewService}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 cursor-pointer"
            title="Criar Nova Ordem de Serviço"
          >
            <Plus size={16} strokeWidth={3} className="text-slate-950" />
            <span className="hidden sm:inline">Novo Serviço (OS)</span>
            <span className="sm:hidden">Novo Serviço</span>
          </button>
        )}
        {/* Botão de Suporte ao Cliente: Visível apenas para Atendentes e Admin */}
        {isSupportOrAdmin && (
          <Link
            href="/suporte-central"
            onClick={(e) => {
              e.preventDefault();
              router.push('/suporte-central');
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-extrabold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.25)] active:scale-95 cursor-pointer select-none"
            title="Acessar Central de Atendimento ao Assinante"
          >
            <Headset size={16} className="text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Suporte Central</span>
            <span className="sm:hidden">Suporte</span>
          </Link>
        )}

        {/* Botão de Painel de Administração: Visível APENAS para o Admin */}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              router.push('/admin');
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-extrabold text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer select-none"
            title="Acessar Painel Geral de Administração"
          >
            <ShieldCheck size={16} className="text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Painel Admin</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        )}

        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition relative cursor-pointer"
            title="Notificações"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
