'use client';

import React from 'react';
import { Sparkles, Wrench, ShieldAlert, CheckCircle2, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Central de Diagnóstico de Erros (IA & Fábricas)</h3>
            <p className="text-xs text-slate-400">Selecione a marca e informe o código ou sintoma apresentado no display</p>
          </div>
        </div>

        <form onSubmit={handleDiagnose} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fabricante / Marca</label>
              <select
                value={errorBrand}
                onChange={(e) => setErrorBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-rose-500"
              >
                {['Daikin', 'LG', 'Midea', 'Gree', 'Samsung', 'Carrier', 'Fujitsu', 'Elgin', 'TCL', 'Philco', 'Consul', 'York', 'Hitachi', 'Komeco', 'Panasonic', 'Electrolux'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Código ou Sintoma (Ex: U4, CH05, EC, Não Gela)</label>
              <input
                type="text"
                value={errorCodeInput}
                onChange={(e) => setErrorCodeInput(e.target.value)}
                placeholder="Ex: U4, E6, Compressor não parte"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isDiagnosing}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] cursor-pointer disabled:opacity-50"
          >
            {isDiagnosing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Diagnosticar com IA Especialista</span>
          </button>
        </form>
      </div>

      {diagnosisResult && (
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono font-bold">
              {diagnosisResult.brand} - Código: {diagnosisResult.code}
            </span>
            <span className="text-xs text-slate-400 font-semibold uppercase">{diagnosisResult.category}</span>
          </div>

          <h3 className="text-base font-bold text-white mt-0.5">{diagnosisResult.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{diagnosisResult.description}</p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200">Causas Prováveis:</h4>
            <ul className="space-y-1">
              {diagnosisResult.probableCauses?.map((c: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/50 p-2 rounded-xl">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
              <span>Procedimento de Resolução Passo a Passo (Toque para detalhes):</span>
            </h4>

            <div className="space-y-2">
              {diagnosisResult.stepByStepSolution?.map((step: string, idx: number) => {
                const isExpanded = expandedStepIndex === idx;
                return (
                  <div key={idx} className="rounded-2xl border bg-slate-900/60 border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                      className="w-full text-left p-3.5 flex items-start gap-3 cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded-xl bg-slate-800 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 text-xs font-medium text-slate-200 pt-0.5 leading-relaxed">{step}</div>
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
