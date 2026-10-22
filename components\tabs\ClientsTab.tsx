'use client';

import React from 'react';
import { Users, Phone, MapPin, Wrench } from 'lucide-react';

interface ClientsTabProps {
  clients: any[];
}

export default function ClientsTab({ clients }: ClientsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Carteira de Clientes & PMOC</h3>
            <p className="text-xs text-slate-400">Gerenciamento de clientes e equipamentos instalados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client, idx) => (
            <div key={client.id || idx} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{client.name}</h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  {client.equipment?.length || 0} máq.
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-sky-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-rose-400" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>

              {client.equipment && client.equipment.length > 0 && (
                <div className="pt-2 border-t border-slate-900 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400">Equipamentos Cadastrados:</div>
                  <div className="space-y-1">
                    {client.equipment.map((eq: any, eIdx: number) => (
                      <div key={eIdx} className="bg-slate-900/80 p-2 rounded-xl text-[11px] text-slate-300 flex items-center justify-between">
                        <span>{eq.brand} {eq.model} ({eq.capacity})</span>
                        <span className="text-[10px] font-mono text-cyan-400">{eq.gas}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
