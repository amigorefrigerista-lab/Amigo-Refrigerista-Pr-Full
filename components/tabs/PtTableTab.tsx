'use client';
import React, { useState } from 'react';
import { ptTable } from '@/lib/ptData';
import { Search } from 'lucide-react';

export default function PtTableTab() {
  const [selectedGas, setSelectedGas] = useState('R410A');
  const [searchTerm, setSearchTerm] = useState('');

  const gasData = ptTable[selectedGas] || {};
  
  // Combine suction and liquid into a flattened list for display
  const allData: { type: string, p: string, t: string | number }[] = [
    ...Object.entries(gasData.suction || {}).map(([p, t]) => ({ type: 'Sucção', p, t: t as string | number })),
    ...Object.entries(gasData.liquid || {}).map(([p, t]) => ({ type: 'Líquido', p, t: t as string | number }))
  ];

  // Highlight logic: if search term matches pressure, highlight
  const isHighlighted = (p: string) => searchTerm && p === searchTerm;

  const filteredData = allData.filter(item => 
    item.p.includes(searchTerm) || String(item.t).includes(searchTerm)
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <select 
          value={selectedGas} 
          onChange={(e) => setSelectedGas(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold cursor-pointer"
        >
          {Object.keys(ptTable).map(gas => <option key={gas} value={gas}>{gas}</option>)}
        </select>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-3 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar pressão exata (ex: 120)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Pressão (PSIG)</th>
              <th className="px-4 py-3">Temperatura (°C)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredData.map((item, i) => (
              <tr 
                key={i} 
                className={`${
                  isHighlighted(item.p) 
                    ? 'bg-sky-500/30 hover:bg-sky-500/40' 
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <td className={`px-4 py-3 ${isHighlighted(item.p) ? 'font-bold text-white' : 'text-slate-300'}`}>{item.type}</td>
                <td className={`px-4 py-3 font-mono ${isHighlighted(item.p) ? 'font-bold text-white' : 'text-sky-400'}`}>{item.p}</td>
                <td className={`px-4 py-3 font-mono ${isHighlighted(item.p) ? 'font-bold text-white' : 'text-emerald-400'}`}>{item.t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
