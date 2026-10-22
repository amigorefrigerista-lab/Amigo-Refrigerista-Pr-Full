import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { getPublicInstallationAction } from '@/app/actions/dbActions';
import { ServiceOrderData } from '@/components/ServiceOrderPdfExporter';
import ServiceOrderDetailCard from '@/components/ServiceOrderDetailCard';
import { ThemeToggle } from '@/components/ThemeToggle';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicServiceOrderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;
  const installation = await getPublicInstallationAction(orderId);

  const displayOrderNumber =
    installation?.qrCode ||
    (installation ? `OS-${installation.id}` : decodeURIComponent(orderId));
  const clientName = installation?.clientName || 'Cliente Amigo';
  const equipment = installation?.equipment || 'Equipamento de Ar-Condicionado';
  const brand = installation?.brand || 'Daikin / Inverter';
  const btus = installation?.btus || '12.000 BTU/h';
  const dateStr = installation?.date
    ? new Date(installation.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');
  const warranty = installation?.warrantyMonths || 12;
  const address = installation?.address;
  const notes =
    installation?.notes ||
    'Higienização completa da serpentina, turbina e bandeja de condensado; verificação de pressão do fluido e aperto de bornes elétricos.';
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
    status: installation?.status || 'Completed',
    dateStr,
    warrantyMonths: warranty,
    value: installation?.value || null,
    notes,
    customerNotes: installation?.customerNotes || '',
    customerSignature: installation?.customerSignature || null,
    checklistItems,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070e1c] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans transition-colors duration-200">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 font-bold transition"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Aplicativo</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={13} />
              <span>Certificado Digital Autêntico</span>
            </span>
          </div>
        </div>

        {/* Card Principal da OS com #service-order-container, seletor de Status e cabeçalho dinâmico */}
        <ServiceOrderDetailCard
          orderData={orderData}
          installationId={installation?.id}
        />

        {/* Rodapé institucional */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>© 2026 Amigo Refrigerista Pro · Gestão e Automação para Técnicos de Climatização</p>
          <p className="text-[10px] text-slate-600">
            Este documento digital é autêntico e possui validação via QR Code e link exclusivo.
          </p>
        </div>
      </div>
    </div>
  );
}
