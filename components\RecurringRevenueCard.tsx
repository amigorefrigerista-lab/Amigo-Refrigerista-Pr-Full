'use client';

import React from 'react';
import { BellRing, DollarSign, Send, ArrowRight, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { generateSmartWhatsAppProposal } from '@/lib/autoScheduler';

export interface PendingClient {
  id: string;
  name: string;
  phone: string;
  equipment: string;
  monthsSinceService: number;
}

export interface RecurringRevenueCardProps {
  pendingClients: PendingClient[];
  estimatedPricePerService?: number; // Preço médio de uma higienização (ex: R$ 200)
  onSendWhatsApp?: (client: PendingClient) => void;
}

export function RecurringRevenueCard({
  pendingClients,
  estimatedPricePerService = 200,
  onSendWhatsApp
}: RecurringRevenueCardProps) {
  const totalClients = pendingClients.length;
  const potentialRevenue = totalClients * estimatedPricePerService;

  if (totalClients === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Todas as Preventivas em Dia!</h3>
          <p className="text-xs text-slate-400 mt-1">
            Nenhum cliente está com a manutenção preventiva vencida no momento. Bom trabalho!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
            <DollarSign size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white leading-snug">Receita Recorrente Oculta</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Oportunidades Preventivas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
              Clientes que já atingiram a data para nova higienização/manutenção
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-emerald-950/50 border border-emerald-500/20 p-3.5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-300 uppercase block">Potencial a Faturar Hoje:</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            R$ {potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-300 block mt-0.5">
            {totalClients} {totalClients === 1 ? 'cliente pendente' : 'clientes pendentes'} × R$ {estimatedPricePerService}
          </span>
        </div>
      </div>

      {/* Lista de Clientes com Preventiva Vencida */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center gap-1.5 text-slate-200">
            <BellRing size={14} className="text-amber-400 shrink-0" />
            <span>Clientes para Entrar em Contato:</span>
          </span>
          <span className="text-xs font-bold text-slate-400">{totalClients} pendentes</span>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
          {pendingClients.map((client) => {
            const waLink = generateSmartWhatsAppProposal({
              clientName: client.name,
              clientPhone: client.phone,
              equipment: client.equipment,
              technicianName: 'Técnico Amigo Refrigerista',
              pixKey: 'pix@amigorefrigerista.com.br',
              packages: [
                { title: 'Higienização Básica + Spray Antibacteriano', price: 180 },
                { title: 'Higienização Profunda Química + Teste de Rendimento', price: 280 }
              ]
            });

            return (
              <div
                key={client.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white break-words">{client.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      há {client.monthsSinceService} meses
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 break-words">{client.equipment}</p>
                </div>

                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onSendWhatsApp?.(client)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer active:scale-95"
                >
                  <MessageCircle size={15} />
                  <span>Chamar no WhatsApp</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
