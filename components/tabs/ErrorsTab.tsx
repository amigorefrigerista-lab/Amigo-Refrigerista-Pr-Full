'use client';

import React from 'react';
import { Sparkles, Wrench, ShieldAlert, CheckCircle2, ChevronUp, ChevronDown, AlertCircle, Search } from 'lucide-react';

interface ErrorsTabProps {
  errorBrand: string;
  setErrorBrand: (b: string) => void;
  errorCodeInput: string;
  setErrorCodeInput: (c: string) => void;
  isDiagnosing: boolean;
  diagnosisResult: any;
  diagnosisHistory: any[];
  handleDiagnose: (e: React.FormEvent) => void;
  expandedStepIndex: number | null;
  setExpandedStepIndex: (idx: number | null) => void;
}

export default function ErrorsTab({
  errorBrand,
  setErrorBrand,
  errorCodeInput,
  setErrorCodeInput,
  isDiagnosing,
  diagnosisResult,
  diagnosisHistory,
  handleDiagnose,
  expandedStepIndex,
  setExpandedStepIndex,
}: ErrorsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Central de Diagnóstico de Erros (IA & Fábricas)</h3>
            <p className="text-[11px] text-slate-400">Selecione a marca e informe o código ou sintoma do visor</p>
          </div>
        </div>

        <form onSubmit={handleDiagnose} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fabricante / Marca</label>
              <select
                value={errorBrand}
                onChange={(e) => setErrorBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm sm:text-xs text-slate-100 font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 min-h-[44px] cursor-pointer"
              >
                {['Daikin', 'LG', 'Midea', 'Gree', 'Samsung', 'Carrier', 'Fujitsu', 'Elgin', 'TCL', 'Philco', 'Consul', 'York', 'Hitachi', 'Komeco', 'Panasonic', 'Electrolux'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Código ou Sintoma</label>
              <div className="relative">
                <input
                  type="text"
                  value={errorCodeInput}
                  onChange={(e) => setErrorCodeInput(e.target.value)}
                  placeholder="Ex: U4, CH05, EC, Não Gela"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-3 text-sm sm:text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 min-h-[44px]"
                />
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isDiagnosing}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] cursor-pointer disabled:opacity-50 min-h-[48px] active:scale-98"
          >
            {isDiagnosing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-rose-200" />
            )}
            <span>Diagnosticar com IA Especialista</span>
          </button>
        </form>
      </div>

      {diagnosisResult && (
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono font-bold">
              {diagnosisResult.brand} - Código: {diagnosisResult.code}
            </span>
            <span className="text-[11px] text-slate-400 font-bold uppercase">{diagnosisResult.category}</span>
          </div>

          <h3 className="text-base font-bold text-white">{diagnosisResult.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{diagnosisResult.description}</p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200">Causas Prováveis:</h4>
            <ul className="space-y-1.5">
              {diagnosisResult.probableCauses?.map((c: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-rose-400" />
              <span>Procedimento de Resolução Passo a Passo (Toque para ver):</span>
            </h4>

            <div className="space-y-2">
              {diagnosisResult.stepByStepSolution?.map((step: string, idx: number) => {
                const isExpanded = expandedStepIndex === idx;
                return (
                  <div key={idx} className="rounded-2xl border bg-slate-900/60 border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                      className="w-full text-left p-3.5 flex items-start gap-3 cursor-pointer min-h-[44px]"
                    >
                      <span className="w-6 h-6 rounded-xl bg-slate-800 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 text-xs font-medium text-slate-200 leading-relaxed">{step}</div>
                      <div className="text-slate-400 p-0.5 shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 bg-slate-950/60">
                        {diagnosisResult.requiredTools && (
                          <div className="text-[11px] text-sky-300">
                            <strong>Ferramentas:</strong> {diagnosisResult.requiredTools.join(', ')}
                          </div>
                        )}
                        {diagnosisResult.safetyPrecautions && (
                          <div className="text-[11px] text-amber-300">
                            <strong>Segurança:</strong> {diagnosisResult.safetyPrecautions.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
