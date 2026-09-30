'use client';

import React from 'react';
import { Calculator, Gauge, Thermometer, Wind } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setCalcSubTab('sh_sub')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${calcSubTab === 'sh_sub' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Superaquecimento & Sub-resfriamento
        </button>
        <button
          type="button"
          onClick={() => setCalcSubTab('thermal')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${calcSubTab === 'thermal' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Cálculo de Carga Térmica (BTU/h)
        </button>
      </div>

      {calcSubTab === 'sh_sub' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-sky-400" />
              <span>Calculadora de Superaquecimento & Sub-resfriamento</span>
            </h3>
            <select
              value={selectedGas}
              onChange={(e) => setSelectedGas(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-bold"
            >
              <option value="R410A">R-410A</option>
              <option value="R32">R-32</option>
              <option value="R22">R-22</option>
              <option value="R134a">R-134a</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-sky-400">Superaquecimento (Linha de Sucção)</h4>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Pressão de Sucção (PSIG)</label>
                <input
                  type="number"
                  value={suctionPressure}
                  onChange={(e) => setSuctionPressure(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Temperatura do Tubo Grosso (°C)</label>
                <input
                  type="number"
                  value={suctionTemp}
                  onChange={(e) => setSuctionTemp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                <span className="text-slate-400">Superaquecimento Útil:</span>
                <strong className="text-sky-400 text-sm font-mono">{shCalculations.superheat.toFixed(1)} °C (K)</strong>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400">Sub-resfriamento (Linha de Líquido)</h4>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Pressão de Descarga/Líquido (PSIG)</label>
                <input
                  type="number"
                  value={liquidPressure}
                  onChange={(e) => setLiquidPressure(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Temperatura do Tubo Fino (°C)</label>
                <input
                  type="number"
                  value={liquidTemp}
                  onChange={(e) => setLiquidTemp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                <span className="text-slate-400">Sub-resfriamento:</span>
                <strong className="text-emerald-400 text-sm font-mono">{shCalculations.subcooling.toFixed(1)} °C (K)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {calcSubTab === 'thermal' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <span>Dimensionamento de Carga Térmica (BTU/h)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Área do Ambiente (m²)</label>
              <input
                type="number"
                value={coolingAreaM2}
                onChange={(e) => setCoolingAreaM2(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Número de Pessoas</label>
              <input
                type="number"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Carga Eletrônica Total (Watts)</label>
              <input
                type="number"
                value={electronicWatts}
                onChange={(e) => setElectronicWatts(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Incidência Solar</label>
              <select
                value={sunExposure}
                onChange={(e) => setSunExposure(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="morning">Manhã (Sol parcial)</option>
                <option value="afternoon">Tarde (Sol forte direto)</option>
                <option value="shaded">Sombreado / Sem sol direto</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-indigo-300 font-bold uppercase">Capacidade Recomendada</div>
              <div className="text-xs text-slate-400">Inclui margem de segurança e fator de carga térmica</div>
            </div>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {calculatedBtus.toLocaleString('pt-BR')} BTU/h
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
