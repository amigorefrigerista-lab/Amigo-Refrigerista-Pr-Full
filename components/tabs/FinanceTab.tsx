'use client';

import React from 'react';
import { DollarSign, Trash2 } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Controle Financeiro & Caixa</h3>
            <p className="text-xs text-slate-400">Registre recebimentos de serviços e despesas com peças e ferramentas</p>
          </div>
        </div>

        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
              <input
                type="text"
                value={newTxDesc}
                onChange={(e) => setNewTxDesc(e.target.value)}
                placeholder="Ex: Instalação Split 12k"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={newTxValue}
                onChange={(e) => setNewTxValue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
              <select
                value={newTxType}
                onChange={(e) => setNewTxType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="in">Receita (Entrada)</option>
                <option value="out">Despesa (Saída)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAddingTx}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
          >
            {isAddingTx ? 'Salvando...' : 'Adicionar Lançamento'}
          </button>
        </form>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h4 className="text-sm font-bold text-white">Histórico de Transações</h4>
        <div className="space-y-2">
          {revenueItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div>
                <div className="text-xs font-bold text-white">{item.desc}</div>
                <div className="text-[10px] text-slate-400">{item.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold ${item.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.type === 'in' ? '+' : '-'} R$ {Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(item.id)}
                  className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
