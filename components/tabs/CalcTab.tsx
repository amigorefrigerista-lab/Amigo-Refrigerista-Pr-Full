'use client';

import React from 'react';
import { Calculator, Gauge, Thermometer, Wind, Sparkles } from 'lucide-react';

interface CalcTabProps {
  calcSubTab: 'sh_sub' | 'thermal' | 'pt_table';
  setCalcSubTab: (t: 'sh_sub' | 'thermal' | 'pt_table') => void;
  selectedGas: string;
  setSelectedGas: (g: string) => void;
  suctionPressure: string;
  setSuctionPressure: (p: string) => void;
  suctionTemp: string;
  setSuctionTemp: (t: string) => void;
  liquidPressure: string;
  setLiquidPressure: (p: string) => void;
  liquidTemp: string;
  setLiquidTemp: (t: string) => void;
  ambientTemp: string;
  setAmbientTemp: (t: string) => void;
  coolingAreaM2: string;
  setCoolingAreaM2: (a: string) => void;
  peopleCount: string;
  setPeopleCount: (p: string) => void;
  electronicWatts: string;
  setElectronicWatts: (w: string) => void;
  sunExposure: string;
  setSunExposure: (s: string) => void;
  shCalculations: any;
  calculatedBtus: number;
}

export default function CalcTab({
  calcSubTab,
  setCalcSubTab,
  selectedGas,
  setSelectedGas,
  suctionPressure,
  setSuctionPressure,
  suctionTemp,
  setSuctionTemp,
  liquidPressure,
  setLiquidPressure,
  liquidTemp,
  setLiquidTemp,
  ambientTemp,
  setAmbientTemp,
  coolingAreaM2,
  setCoolingAreaM2,
  peopleCount,
  setPeopleCount,
  electronicWatts,
  setElectronicWatts,
  sunExposure,
  setSunExposure,
  shCalculations,
  calculatedBtus,
}: CalcTabProps) {
  // Diagnóstico do Superaquecimento
  const shValue = Number(shCalculations?.superheat || 0);
  let shStatus = 'Normal (5°C - 8°C)';
  let shColor = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  if (shValue < 4) {
    shStatus = 'Muito Baixo (< 4°C) - Risco de Golpe de Líquido';
    shColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else if (shValue > 11) {
    shStatus = 'Muito Alto (> 11°C) - Possível Falta de Fluido';
    shColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  // Diagnóstico do Sub-resfriamento
  const scValue = Number(shCalculations?.subcooling || 0);
  let scStatus = 'Normal (4°C - 7°C)';
  let scColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (scValue < 3) {
    scStatus = 'Baixo (< 3°C) - Falta de Fluido ou Condensadora Suja';
    scColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (scValue > 9) {
    scStatus = 'Alto (> 9°C) - Excesso de Fluido Refrigerante';
    scColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Abas da Calculadora */}
      <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setCalcSubTab('sh_sub')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
            calcSubTab === 'sh_sub' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gauge size={15} />
          <span>Superaquecimento</span>
        </button>
        <button
          type="button"
          onClick={() => setCalcSubTab('thermal')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
            calcSubTab === 'thermal' ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator size={15} />
          <span>Carga Térmica (BTU)</span>
        </button>
      </div>

      {calcSubTab === 'sh_sub' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Gauge size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Superaquecimento & Sub-resfriamento
                </h3>
                <p className="text-[11px] text-slate-400">Cálculo de rendimento térmico do ciclo</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase px-2">Gás:</span>
              <select
                value={selectedGas}
                onChange={(e) => setSelectedGas(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer min-h-[38px]"
              >
                <option value="R410A">R-410A</option>
                <option value="R32">R-32</option>
                <option value="R22">R-22</option>
                <option value="R134a">R-134a</option>
                <option value="R407C">R-407C</option>
                <option value="R404A">R-404A</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco Superaquecimento */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-sky-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind size={14} />
                  <span>Superaquecimento (Sucção)</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Tubo Grosso</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pressão de Sucção (PSIG)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 120"
                      value={suctionPressure}
                      onChange={(e) => setSuctionPressure(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-14 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                      PSIG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Temperatura do Tubo (°C)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 12"
                      value={suctionTemp}
                      onChange={(e) => setSuctionTemp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-12 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                      °C
                    </span>
                  </div>
                </div>
              </div>

              {/* Resultado Superaquecimento */}
              <div className="pt-3 border-t border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Superaquecimento Útil:</span>
                  <span className="text-lg sm:text-xl font-black text-sky-400 font-mono">
                    {shCalculations.superheat.toFixed(1)} °C (K)
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between ${shColor}`}>
                  <span>{shStatus}</span>
                </div>
              </div>
            </div>

            {/* Bloco Sub-resfriamento */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer size={14} />
                  <span>Sub-resfriamento (Líquido)</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Tubo Fino</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pressão de Líquido (PSIG)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 320"
                      value={liquidPressure}
                      onChange={(e) => setLiquidPressure(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-14 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                      PSIG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Temperatura do Tubo (°C)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 42"
                      value={liquidTemp}
                      onChange={(e) => setLiquidTemp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-12 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 pointer-events-none">
                      °C
                    </span>
                  </div>
                </div>
              </div>

              {/* Resultado Sub-resfriamento */}
              <div className="pt-3 border-t border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Sub-resfriamento:</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                    {shCalculations.subcooling.toFixed(1)} °C (K)
                  </span>
                </div>

                <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between ${scColor}`}>
                  <span>{scStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {calcSubTab === 'thermal' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Dimensionamento de Carga Térmica (BTU/h)
              </h3>
              <p className="text-[11px] text-slate-400">Cálculo de capacidade necessária para ambientes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Área do Ambiente (m²)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ex: 20"
                  value={coolingAreaM2}
                  onChange={(e) => setCoolingAreaM2(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-12 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
                  m²
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Número de Pessoas</label>
              <input
                type="number"
                placeholder="Ex: 2"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Carga Eletrônica Total (Watts)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Ex: 300"
                  value={electronicWatts}
                  onChange={(e) => setElectronicWatts(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-12 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
                  W
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Incidência Solar</label>
              <select
                value={sunExposure}
                onChange={(e) => setSunExposure(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[44px] cursor-pointer"
              >
                <option value="morning">Manhã (Sol parcial)</option>
                <option value="afternoon">Tarde (Sol forte direto)</option>
                <option value="shaded">Sombreado / Sem sol direto</option>
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div>
              <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Capacidade Recomendada</div>
              <div className="text-[11px] text-slate-400">Com margem de segurança e fator de insolação</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-300 font-mono tracking-tight">
              {calculatedBtus.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">BTU/h</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
