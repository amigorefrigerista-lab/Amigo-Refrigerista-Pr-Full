'use client';

import React from 'react';
import { DollarSign, Trash2, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface FinanceTabProps {
  revenueItems: any[];
  newTxDesc: string;
  setNewTxDesc: (d: string) => void;
  newTxValue: string;
  setNewTxValue: (v: string) => void;
  newTxType: string;
  setNewTxType: (t: string) => void;
  isAddingTx: boolean;
  handleAddTransaction: (e: React.FormEvent) => void;
  handleDeleteTransaction: (id: string) => void;
}

export default function FinanceTab({
  revenueItems,
  newTxDesc,
  setNewTxDesc,
  newTxValue,
  setNewTxValue,
  newTxType,
  setNewTxType,
  isAddingTx,
  handleAddTransaction,
  handleDeleteTransaction,
}: FinanceTabProps) {
  // Totais
  const totalIn = revenueItems
    .filter(i => i.type === 'in')
    .reduce((sum, i) => sum + Number(i.value || 0), 0);
  const totalOut = revenueItems
    .filter(i => i.type === 'out')
    .reduce((sum, i) => sum + Number(i.value || 0), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="space-y-6">
      {/* Resumo de Caixa Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Saldo de Caixa</span>
            <span className={`text-xl font-black font-mono ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Entradas (Serviços)</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              + R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
            <ArrowUpCircle size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Saídas (Peças/Ferramentas)</span>
            <span className="text-xl font-black text-rose-400 font-mono">
              - R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
            <ArrowDownCircle size={20} />
          </div>
        </div>
      </div>

      {/* Formulário Novo Lançamento */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Novo Lançamento Financeiro</h3>
            <p className="text-[11px] text-slate-400">Registre recebimentos de serviços ou despesas operacionais</p>
          </div>
        </div>

        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Descrição do Lançamento</label>
              <input
                type="text"
                required
                value={newTxDesc}
                onChange={(e) => setNewTxDesc(e.target.value)}
                placeholder="Ex: Instalação Split 12k - Cliente João"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newTxValue}
                  onChange={(e) => setNewTxValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Movimentação</label>
              <select
                value={newTxType}
                onChange={(e) => setNewTxType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px] cursor-pointer"
              >
                <option value="in">Receita (Entrada (+))</option>
                <option value="out">Despesa (Saída (-))</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAddingTx}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 min-h-[46px] active:scale-98"
          >
            <Plus size={16} />
            <span>{isAddingTx ? 'Registrando...' : 'Adicionar ao Fluxo de Caixa'}</span>
          </button>
        </form>
      </div>

      {/* Histórico de Transações */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Histórico de Lançamentos ({revenueItems.length})</h4>
        
        {revenueItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800">
            Nenhum lançamento registrado no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {revenueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">{item.desc}</div>
                  <div className="text-[10px] font-mono text-slate-400">{item.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${
                    item.type === 'in' 
                      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' 
                      : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                  }`}>
                    {item.type === 'in' ? '+' : '-'} R$ {Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(item.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
