'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  AlertCircle, 
  Calculator, 
  TrendingUp, 
  Users, 
  Headset, 
  ShieldCheck 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
  isSupportOrAdmin?: boolean;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  isAdmin: propIsAdmin,
  isSupportOrAdmin: propIsSupportOrAdmin
}: BottomNavProps) {
  const router = useRouter();
  const { isAdmin: authIsAdmin, isSupportOrAdmin: authIsSupportOrAdmin } = useAuth();

  const isUserAdmin = propIsAdmin ?? authIsAdmin;
  const isUserSupportOrAdmin = propIsSupportOrAdmin ?? authIsSupportOrAdmin;

  const tabs = [
    { id: 'dash', label: 'Painel', icon: LayoutDashboard },
    { id: 'errors', label: 'Erros HVAC', icon: AlertCircle },
    { id: 'calc', label: 'Cálculo BTU', icon: Calculator },
    { id: 'finance', label: 'Financeiro', icon: TrendingUp },
    { id: 'clients', label: 'Clientes', icon: Users },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#070e1c]/95 backdrop-blur-xl border-t border-sky-500/20 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.6)] pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="max-w-md md:max-w-3xl mx-auto flex justify-around items-center h-16 px-1 sm:px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group relative flex-1 min-w-0 flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer select-none",
                isActive ? "text-sky-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300 flex items-center justify-center",
                isActive 
                  ? "bg-sky-500/15 border border-sky-400/30 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]" 
                  : "bg-transparent border border-transparent"
              )}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                "text-[9px] font-bold tracking-tight mt-0.5 transition-all duration-300 truncate max-w-full px-0.5",
                isActive ? "opacity-100 font-extrabold text-sky-300" : "opacity-70 text-slate-400"
              )}>{tab.label}</span>
            </button>
          );
        })}

        {/* Botão de Suporte ao Cliente: Visível apenas para Atendentes e Admin */}
        {isUserSupportOrAdmin && (
          <Link
            href="/suporte-central"
            onClick={(e) => {
              e.preventDefault();
              router.push('/suporte-central');
            }}
            className="group relative flex-1 min-w-0 flex flex-col items-center justify-center h-full text-indigo-400 hover:text-indigo-300 transition-all duration-200 active:scale-95 cursor-pointer select-none"
            title="Acessar Central de Atendimento ao Assinante"
            aria-label="Central de Suporte"
          >
            <div className="p-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.25)]">
              <Headset size={18} strokeWidth={2.2} />
            </div>
            <span className="text-[9px] font-extrabold tracking-tight mt-0.5 text-indigo-300 truncate max-w-full px-0.5">Suporte</span>
          </Link>
        )}

        {/* Botão de Painel de Administração: Visível APENAS para o Admin */}
        {isUserAdmin && (
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              router.push('/admin');
            }}
            className="group relative flex-1 min-w-0 flex flex-col items-center justify-center h-full text-amber-400 hover:text-amber-300 transition-all duration-200 active:scale-95 cursor-pointer select-none"
            title="Acessar Painel Geral de Administração"
            aria-label="Painel Geral de Administração"
          >
            <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.25)]">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>
            <span className="text-[9px] font-extrabold tracking-tight mt-0.5 text-amber-300 truncate max-w-full px-0.5">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default BottomNav;
