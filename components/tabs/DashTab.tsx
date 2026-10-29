'use client';

import React from 'react';
import { 
  Users, 
  Wrench, 
  DollarSign, 
  Calendar, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  QrCode,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

interface DashTabProps {
  clients: any[];
  nextOrderNumber: string;
  setShowOSModal: (show: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  monthlyChartData: any[];
  reminders: any[];
  serviceOrders: any[];
  isAdmin: boolean;
  profile: any;
}

export default function DashTab({
  clients,
  nextOrderNumber,
  setShowOSModal,
  setShowUpgradeModal,
  monthlyChartData,
  reminders,
  serviceOrders,
  isAdmin,
  profile,
}: DashTabProps) {
  const totalReceitas = monthlyChartData.reduce((acc, item) => acc + (item.Receitas || 0), 0);
  const totalDespesas = monthlyChartData.reduce((acc, item) => acc + (item.Despesas || 0), 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  return (
    <div className="flex flex-col gap-6">
      {/* Card de Destaque: Criar Novo Serviço (No mobile: apenas 1 linha com botão verde + ícone da ferramenta) */}
      <div className="sm:p-5 sm:rounded-3xl sm:bg-gradient-to-r sm:from-emerald-950/80 sm:via-slate-900 sm:to-slate-900 sm:border sm:border-emerald-500/30 flex flex-row items-center justify-between gap-4 sm:shadow-xl">
        <div className="hidden sm:flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Wrench size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                AGILIDADE DE CAMPO
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                Próxima: <strong className="text-emerald-400">#{nextOrderNumber}</strong>
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">Criar Novo Serviço (Nova OS)</h3>
            <p className="text-xs text-slate-400">Gera número de OS sequencial automático, cadastra o cliente e agenda o lembrete de preventiva.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOSModal(true)}
          className="w-full sm:w-auto px-4 sm:px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
        >
          <Wrench size={18} strokeWidth={2.5} className="shrink-0 text-white" />
          <span className="truncate text-white">Criar Novo Serviço Agora</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="order-last sm:order-none grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Clientes Ativos</span>
            <Users size={16} className="text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{clients.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Máquinas PMOC</span>
            <Wrench size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {clients.reduce((acc, c) => acc + (c.equipment?.length || 0), 0)}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Receitas do Mês</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Saldo Líquido</span>
            <TrendingUp size={16} className="text-indigo-400" />
          </div>
          <div className={`text-2xl font-bold ${saldoLiquido >= 0 ? 'text-white' : 'text-rose-400'}`}>
            R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Gráfico Financeiro Mensal */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white">Evolução de Caixa e Receita Técnica</h4>
            <p className="text-xs text-slate-400">Comparativo mensal de entradas de serviços e despesas operacionais</p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-medium font-mono">
            Últimos meses
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
