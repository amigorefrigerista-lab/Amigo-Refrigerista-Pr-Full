'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  AlertCircle, 
  Calculator, 
  TrendingUp, 
  Users,
  Settings,
  Headset
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
  isSupportOrAdmin?: boolean;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  isAdmin = false,
  isSupportOrAdmin = false,
}: BottomNavProps) {
  const baseTabs = [
    { id: 'dash', label: 'Painel', icon: LayoutDashboard },
    { id: 'errors', label: 'Erros HVAC', icon: AlertCircle },
    { id: 'calc', label: 'Cálculos', icon: Calculator },
    { id: 'finance', label: 'Financeiro', icon: TrendingUp },
    { id: 'clients', label: 'Clientes', icon: Users },
  ];

  const adminTab = (isSupportOrAdmin || isAdmin) 
    ? [{ id: 'suporte-admin', label: 'Suporte Admin', icon: Headset }] 
    : [];

  const tabs = [
    ...baseTabs,
    ...adminTab,
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070e1c]/90 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800/80 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] pointer-events-auto transition-colors duration-200"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="max-w-lg md:max-w-2xl mx-auto flex justify-between items-center h-16 px-2 sm:px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group relative flex-1 min-w-0 flex flex-col items-center justify-center h-full transition-all duration-200 active:scale-95 cursor-pointer select-none py-1",
                isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {/* Indicador Ativo no topo */}
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-gradient-to-r from-sky-500 to-cyan-400 dark:from-sky-400 dark:to-cyan-300 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.9)] animate-in fade-in duration-300" />
              )}

              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300 flex items-center justify-center",
                isActive 
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] scale-110" 
                  : "bg-transparent text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-tight mt-0.5 transition-all duration-200 truncate max-w-full px-0.5",
                isActive ? "text-sky-700 dark:text-sky-300 font-extrabold" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
