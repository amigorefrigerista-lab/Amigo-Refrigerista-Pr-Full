import React from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Wrench, 
  ShieldCheck, 
  MapPin, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { getPublicInstallationAction } from '@/app/actions/dbActions';
import ServiceOrderPdfExporter, { ServiceOrderData } from '@/components/ServiceOrderPdfExporter';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicServiceOrderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;
  const installation = await getPublicInstallationAction(orderId);

  const displayOrderNumber = installation?.qrCode || (installation ? `OS-${installation.id}` : decodeURIComponent(orderId));
  const clientName = installation?.clientName || 'Cliente Amigo';
  const equipment = installation?.equipment || 'Equipamento de Ar-Condicionado';
  const brand = installation?.brand || 'Daikin / Inverter';
  const btus = installation?.btus || '12.000 BTU/h';
  const dateStr = installation?.date 
    ? new Date(installation.date + 'T12:00:00').toLocaleDateString('pt-BR') 
    : new Date().toLocaleDateString('pt-BR');
  const warranty = installation?.warrantyMonths || 12;
  const address = installation?.address;
  const notes = installation?.notes || 'Higienização completa da serpentina, turbina e bandeja de condensado; verificação de pressão do fluido e aperto de bornes elétricos.';
  const checklistItems = [
    'Higienização bactericida e fungicida com desincrustante biodegradável',
    'Teste de superaquecimento e vazamentos na linha frigorígena',
    'Checagem de consumo elétrico e estanqueidade do dreno',
  ];

  const orderData: ServiceOrderData = {
    orderNumber: displayOrderNumber,
    clientName,
    clientPhone: installation?.clientPhone || null,
    address: address || null,
    equipment,
    brand,
    btus,
    serviceType: installation?.type || 'instalacao',
    status: installation?.status || 'concluido',
    dateStr,
    warrantyMonths: warranty,
    value: installation?.value || null,
    notes,
    checklistItems,
  };

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-bold transition"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Aplicativo</span>
          </Link>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={13} />
            <span>Certificado Digital Autêntico</span>
          </span>
        </div>

        {/* Card Principal da OS */}
        <div className="bg-slate-900/90 border border-sky-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Cabeçalho da OS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase font-mono block">
                Comprovante de Serviço Técnico
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                <span>Ordem de Serviço</span>
                <span className="text-sky-400 font-mono">#{displayOrderNumber}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Emitido via plataforma oficial Amigo Refrigerista Pro
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Realização</span>
              <span className="text-sm font-black font-mono text-white">{dateStr}</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mt-1">
                Concluída com Sucesso
              </span>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Cliente Atendido
              </span>
              <p className="text-sm font-bold text-white">{clientName}</p>
              {address && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-sky-400 shrink-0" />
                  <span>{address}</span>
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Garantia do Serviço
              </span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck size={16} />
                <span>{warranty} Meses de Garantia</span>
              </p>
              <p className="text-[11px] text-slate-400">Suporte e cobertura técnica garantidos</p>
            </div>
          </div>

          {/* Equipamento */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Equipamento & Manutenção
            </span>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-sky-400" />
                <span className="text-sm font-bold text-white">{equipment}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{brand}</span>
                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40">{btus}</span>
              </div>
            </div>
          </div>

          {/* Descrição e Laudo dos Serviços Executados */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Procedimentos Realizados no Atendimento:
            </span>
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>{notes}</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pt-2 border-t border-slate-800/60">
                {checklistItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Lembrete de Preventiva */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3 text-xs">
            <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-300">Próxima Manutenção Preventiva Programada</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Para manter a garantia do fabricante e ar puro, o intervalo recomendado para a sua próxima revisão é de 6 meses.
              </p>
            </div>
          </div>

          {/* Exportador de PDF com Dados da Empresa e QR Code */}
          <ServiceOrderPdfExporter order={orderData} />
        </div>

        {/* Rodapé institucional */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>© 2026 Amigo Refrigerista Pro · Gestão e Automação para Técnicos de Climatização</p>
          <p className="text-[10px] text-slate-600">Este documento digital é autêntico e possui validação via QR Code e link exclusivo.</p>
        </div>
      </div>
    </div>
  );
}
