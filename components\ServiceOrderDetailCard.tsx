'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Wrench,
  ShieldCheck,
  MapPin,
  Sparkles,
  Clock,
  Activity,
  Download,
  Edit,
  Check,
  X,
  PenTool,
  QrCode,
  Save,
  Loader2,
} from 'lucide-react';
import ServiceOrderPdfExporter, {
  ServiceOrderData,
  ServiceOrderPdfExporterRef,
} from '@/components/ServiceOrderPdfExporter';
import { CustomerSignatureModal } from '@/components/CustomerSignatureModal';
import { ServiceOrderQrScannerModal } from '@/components/ServiceOrderQrScannerModal';
import { ServiceOrderQrGeneratorModal } from '@/components/ServiceOrderQrGeneratorModal';
import {
  updateInstallationStatusAction,
  updateInstallationDetailsAction,
  saveCustomerSignatureAction,
} from '@/app/actions/dbActions';

export type OrderStatusOption = 'Pending' | 'In Progress' | 'Completed';

interface ServiceOrderDetailCardProps {
  orderData: ServiceOrderData;
  installationId?: string | number | null;
}

function normalizeInitialStatus(rawStatus?: string | null): OrderStatusOption {
  const lower = (rawStatus || '').toLowerCase();
  if (lower === 'pending' || lower === 'pendente' || lower === 'agendado') {
    return 'Pending';
  }
  if (
    lower === 'in progress' ||
    lower === 'in_progress' ||
    lower === 'em_andamento' ||
    lower === 'em andamento'
  ) {
    return 'In Progress';
  }
  return 'Completed';
}

export default function ServiceOrderDetailCard({
  orderData,
  installationId,
}: ServiceOrderDetailCardProps) {
  const [status, setStatus] = useState<OrderStatusOption>(() =>
    normalizeInitialStatus(orderData.status)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [clientName, setClientName] = useState(orderData.clientName);
  const [address, setAddress] = useState(orderData.address || '');
  const [equipment, setEquipment] = useState(orderData.equipment);
  const [brand, setBrand] = useState(orderData.brand);
  const [btus, setBtus] = useState(orderData.btus);
  const [notes, setNotes] = useState(orderData.notes);

  const [draftClientName, setDraftClientName] = useState(orderData.clientName);
  const [draftAddress, setDraftAddress] = useState(orderData.address || '');
  const [draftEquipment, setDraftEquipment] = useState(orderData.equipment);
  const [draftBrand, setDraftBrand] = useState(orderData.brand);
  const [draftBtus, setDraftBtus] = useState(orderData.btus);
  const [draftNotes, setDraftNotes] = useState(orderData.notes);
  const [customerSignature, setCustomerSignature] = useState<string | null>(
    orderData.customerSignature || null
  );
  const [customerNotes, setCustomerNotes] = useState<string>(
    orderData.customerNotes || ''
  );
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [signatureSavedToDb, setSignatureSavedToDb] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrGeneratorOpen, setIsQrGeneratorOpen] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isStatusTransitioning, setIsStatusTransitioning] = useState(false);

  const pdfExporterRef = useRef<ServiceOrderPdfExporterRef>(null);

  const handleStartEdit = () => {
    setDraftClientName(clientName);
    setDraftAddress(address);
    setDraftEquipment(equipment);
    setDraftBrand(brand);
    setDraftBtus(btus);
    setDraftNotes(notes);
    setIsEditing(true);
  };

  const handlePersistAllChanges = async () => {
    const nextClientName = isEditing && draftClientName.trim() ? draftClientName.trim() : clientName;
    const nextAddress = isEditing ? draftAddress.trim() : address;
    const nextEquipment = isEditing && draftEquipment.trim() ? draftEquipment.trim() : equipment;
    const nextBrand = isEditing && draftBrand.trim() ? draftBrand.trim() : brand;
    const nextBtus = isEditing && draftBtus.trim() ? draftBtus.trim() : btus;
    const nextNotes = isEditing && draftNotes.trim() ? draftNotes.trim() : notes;

    if (isEditing) {
      setClientName(nextClientName);
      setAddress(nextAddress);
      setEquipment(nextEquipment);
      setBrand(nextBrand);
      setBtus(nextBtus);
      setNotes(nextNotes);
      setIsEditing(false);
    }

    setIsSavingToDb(true);
    try {
      const dbStatus =
        status === 'Pending'
          ? 'pendente'
          : status === 'In Progress'
          ? 'em_andamento'
          : 'concluido';

      await updateInstallationDetailsAction({
        id: installationId || orderData.orderNumber,
        orderNumber: orderData.orderNumber,
        clientName: nextClientName,
        address: nextAddress,
        equipment: nextEquipment,
        brand: nextBrand,
        btus: nextBtus,
        status: dbStatus,
        notes: nextNotes,
        customerNotes,
        customerSignature,
      });

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleSaveEdit = async () => {
    await handlePersistAllChanges();
  };

  const handleCancelEdit = () => {
    setDraftClientName(clientName);
    setDraftAddress(address);
    setDraftEquipment(equipment);
    setDraftBrand(brand);
    setDraftBtus(btus);
    setDraftNotes(notes);
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: OrderStatusOption) => {
    setStatus(newStatus);
    setIsStatusTransitioning(true);
    setTimeout(() => setIsStatusTransitioning(false), 750);
    if (installationId) {
      const dbStatus =
        newStatus === 'Pending'
          ? 'pendente'
          : newStatus === 'In Progress'
          ? 'em_andamento'
          : 'concluido';
      try {
        await updateInstallationStatusAction(String(installationId), dbStatus);
      } catch {
        // Fallback silencioso para visualização pública
      }
    }
  };

  const statusStyles: Record<
    OrderStatusOption,
    {
      containerBorder: string;
      containerPulseRing: string;
      glowBg: string;
      headerBg: string;
      badgeBg: string;
      selectBg: string;
      accentText: string;
      labelPt: string;
    }
  > = {
    Pending: {
      containerBorder:
        'border-amber-500/60 shadow-[0_20px_50px_rgba(245,158,11,0.16)]',
      containerPulseRing: 'ring-2 ring-amber-400/50 scale-[1.003]',
      glowBg: 'bg-amber-500/15',
      headerBg:
        'bg-amber-950/90 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      selectBg: 'bg-amber-950/90 border-amber-500/50 text-amber-200 focus:border-amber-400',
      accentText: 'text-amber-400',
      labelPt: 'Pending (Pendente)',
    },
    'In Progress': {
      containerBorder:
        'border-blue-500/60 shadow-[0_20px_50px_rgba(59,130,246,0.16)]',
      containerPulseRing: 'ring-2 ring-blue-400/50 scale-[1.003]',
      glowBg: 'bg-blue-500/15',
      headerBg:
        'bg-sky-950/90 border-sky-500/50 shadow-[0_0_30px_rgba(14,165,233,0.2)]',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      selectBg: 'bg-sky-950/90 border-sky-500/50 text-sky-200 focus:border-sky-400',
      accentText: 'text-sky-400',
      labelPt: 'In Progress (Em Andamento)',
    },
    Completed: {
      containerBorder:
        'border-emerald-500/60 shadow-[0_20px_50px_rgba(16,185,129,0.16)]',
      containerPulseRing: 'ring-2 ring-emerald-400/50 scale-[1.003]',
      glowBg: 'bg-emerald-500/15',
      headerBg:
        'bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      selectBg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 focus:border-emerald-400',
      accentText: 'text-emerald-400',
      labelPt: 'Completed (Concluída)',
    },
  };

  const currentStyle = statusStyles[status];

  const updatedOrderData: ServiceOrderData = {
    ...orderData,
    clientName,
    address: address || null,
    equipment,
    brand,
    btus,
    notes,
    customerNotes,
    status,
    customerSignature,
  };

  return (
    <div
      id="service-order-container"
      data-status={status}
      data-status-transitioning={isStatusTransitioning ? 'true' : 'false'}
      className={`bg-slate-900/90 border-2 rounded-3xl p-4 min-[400px]:p-6 sm:p-8 space-y-6 relative overflow-hidden backdrop-blur-md transition-colors transition-all duration-700 ease-in-out ${currentStyle.containerBorder} ${
        isStatusTransitioning ? currentStyle.containerPulseRing : 'ring-0 ring-transparent scale-100'
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ease-in-out ${currentStyle.glowBg}`}
      />

      {/* Interactive Step-Progress Bar no topo de #service-order-container */}
      <div
        id="service-order-step-progress"
        role="group"
        aria-label="Service Order Status Step Progress"
        className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-slate-950/75 border border-slate-800/90 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
            Progresso da Ordem de Serviço
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider font-mono transition-colors duration-500 ${currentStyle.accentText}`}
          >
            {currentStyle.labelPt}
          </span>
        </div>

        <div className="relative">
          {/* Barra de fundo e preenchimento progressivo */}
          <div className="hidden sm:block absolute top-1/2 left-10 right-10 -translate-y-1/2 h-1 rounded-full bg-slate-800 overflow-hidden pointer-events-none">
            <div
              className={`h-full transition-all duration-700 ease-in-out ${
                status === 'Pending'
                  ? 'w-0 bg-amber-400'
                  : status === 'In Progress'
                  ? 'w-1/2 bg-sky-400'
                  : 'w-full bg-emerald-400'
              }`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10">
            {(
              [
                {
                  key: 'Pending' as OrderStatusOption,
                  step: 1,
                  label: 'Pending',
                  sub: 'Pendente',
                  Icon: Clock,
                  activeClass:
                    'bg-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]',
                  completedClass:
                    'bg-amber-950/50 border-amber-500/40 text-amber-300/90 hover:border-amber-400/70',
                  badgeActive: 'bg-amber-400 text-slate-950',
                },
                {
                  key: 'In Progress' as OrderStatusOption,
                  step: 2,
                  label: 'In Progress',
                  sub: 'Em Andamento',
                  Icon: Activity,
                  activeClass:
                    'bg-sky-950/95 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.3)] scale-[1.02]',
                  completedClass:
                    'bg-sky-950/50 border-sky-500/40 text-sky-300/90 hover:border-sky-400/70',
                  badgeActive: 'bg-sky-400 text-slate-950',
                },
                {
                  key: 'Completed' as OrderStatusOption,
                  step: 3,
                  label: 'Completed',
                  sub: 'Concluída',
                  Icon: CheckCircle2,
                  activeClass:
                    'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]',
                  completedClass:
                    'bg-emerald-950/50 border-emerald-500/40 text-emerald-300/90 hover:border-emerald-400/70',
                  badgeActive: 'bg-emerald-400 text-slate-950',
                },
              ] as const
            ).map((item) => {
              const orderRank: Record<OrderStatusOption, number> = {
                Pending: 1,
                'In Progress': 2,
                Completed: 3,
              };
              const currentRank = orderRank[status];
              const isCurrent = status === item.key;
              const isPassed = currentRank > item.step;
              const StepIcon = item.Icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleStatusChange(item.key)}
                  aria-pressed={isCurrent}
                  data-step={item.key}
                  className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border text-left transition-all duration-500 cursor-pointer ${
                    isCurrent
                      ? item.activeClass
                      : isPassed
                      ? item.completedClass
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all duration-500 ${
                      isCurrent
                        ? item.badgeActive
                        : isPassed
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isPassed ? <Check size={12} strokeWidth={3} /> : <StepIcon size={13} />}
                  </span>
                  <div className="min-w-0 text-center sm:text-left">
                    <span className="text-[11px] sm:text-xs font-black block leading-tight truncate">
                      {item.label}
                    </span>
                    <span className="text-[9px] opacity-75 hidden min-[420px]:block leading-tight truncate">
                      {item.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cabeçalho da OS com cor de fundo dinâmica e transição CSS suave baseada no Status */}
      <header
        id="service-order-header"
        className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-4 border rounded-2xl p-4 sm:p-5 transition-colors transition-all duration-700 ease-in-out ${currentStyle.headerBg}`}
      >
        <div>
          <span
            className={`text-[10px] font-black tracking-widest uppercase font-mono block transition-colors duration-700 ease-in-out ${currentStyle.accentText}`}
          >
            Comprovante de Serviço Técnico
          </span>
          <h1 className="text-lg min-[400px]:text-xl sm:text-2xl font-black text-white mt-1 flex flex-wrap items-center gap-2">
            <span>Ordem de Serviço</span>
            <span className={`font-mono transition-colors duration-700 ease-in-out ${currentStyle.accentText}`}>
              #{orderData.orderNumber}
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Emitido via plataforma oficial Amigo Refrigerista Pro
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2.5 w-full sm:w-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-300 block sm:text-right">
              Data de Realização
            </span>
            <span className="text-sm font-black font-mono text-white block sm:text-right">
              {orderData.dateStr}
            </span>
          </div>

          {/* Controles do Cabeçalho: Dropdown de Status + Botão Edit + Botão Export to PDF */}
          <div className="flex flex-wrap items-center sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              {status === 'Pending' && <Clock size={14} className="text-amber-400 shrink-0" />}
              {status === 'In Progress' && (
                <Activity size={14} className="text-sky-400 shrink-0 animate-pulse" />
              )}
              {status === 'Completed' && (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              )}
              <select
                id="os-detail-status-select"
                aria-label="Status"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatusOption)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-500 ease-in-out cursor-pointer focus:outline-none ${currentStyle.selectBg}`}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {isEditing ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                title="Cancelar edição"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/20 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Editar dados da Ordem de Serviço"
              >
                <Edit size={14} className="text-sky-400" />
                <span>Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePersistAllChanges}
              disabled={isSavingToDb}
              data-saved={savedFeedback ? 'true' : 'false'}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                savedFeedback
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300/70 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-[1.03]'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
              } disabled:opacity-60`}
              title="Salvar Customer Notes e dados atualizados no banco de dados"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isSavingToDb ? (
                  <motion.span
                    key="saving"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </motion.span>
                ) : savedFeedback ? (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Saved!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="save"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Save</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={() => setIsQrGeneratorOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Gerar QR Code exclusivo para a página pública desta OS"
            >
              <QrCode size={14} className="text-indigo-300" />
              <span>Generate QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQrScannerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-500/40 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Escanear etiqueta QR Code para consultar status da OS"
            >
              <QrCode size={14} className="text-sky-400" />
              <span>Scan QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => pdfExporterRef.current?.exportPdf()}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              title="Exportar Ordem de Serviço atual para PDF"
            >
              <Download size={14} />
              <span>Export to PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Grid Flexível: Dados do Cliente, Garantia & Equipamento (1 coluna abaixo de 400px) */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Dados do Cliente */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Dados do Cliente
          </span>
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                aria-label="Nome do Cliente"
                value={draftClientName}
                onChange={(e) => setDraftClientName(e.target.value)}
                placeholder="Nome do Cliente"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/50 text-sm font-bold text-white focus:outline-none focus:border-sky-400"
              />
              <input
                type="text"
                aria-label="Endereço do Cliente"
                value={draftAddress}
                onChange={(e) => setDraftAddress(e.target.value)}
                placeholder="Endereço do atendimento"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-white break-words">{clientName}</p>
              {address && (
                <p className="text-xs text-slate-400 flex items-start gap-1.5 mt-1 break-words">
                  <MapPin size={12} className="text-sky-400 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Garantia do Serviço */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Garantia do Serviço
          </span>
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck size={16} className="shrink-0" />
            <span>{orderData.warrantyMonths} Meses de Garantia</span>
          </p>
          <p className="text-[11px] text-slate-400">Suporte e cobertura técnica garantidos</p>
        </div>

        {/* Equipamento */}
        <div className="col-span-1 min-[400px]:col-span-2 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Equipamento & Manutenção
          </span>
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  aria-label="Equipamento"
                  value={draftEquipment}
                  onChange={(e) => setDraftEquipment(e.target.value)}
                  placeholder="Equipamento"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/50 text-sm font-bold text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <input
                  type="text"
                  aria-label="Marca"
                  value={draftBrand}
                  onChange={(e) => setDraftBrand(e.target.value)}
                  placeholder="Marca / Tecnologia"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <input
                  type="text"
                  aria-label="Capacidade BTU/h"
                  value={draftBtus}
                  onChange={(e) => setDraftBtus(e.target.value)}
                  placeholder="Capacidade (ex: 12.000 BTU/h)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[400px]:grid-cols-[1fr_auto] items-start min-[400px]:items-center gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench size={16} className="text-sky-400 shrink-0" />
                <span className="text-sm font-bold text-white break-words">
                  {equipment}
                </span>
              </div>
              <div className="grid grid-cols-1 min-[400px]:flex items-center gap-2 text-xs font-mono w-full min-[400px]:w-auto">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-center truncate">
                  {brand}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800/40 text-center truncate">
                  {btus}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Descrição e Laudo dos Serviços Executados */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Procedimentos Realizados no Atendimento:
        </span>
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
          {isEditing ? (
            <textarea
              rows={3}
              aria-label="Procedimentos Realizados"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/50 text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
            />
          ) : (
            <p>{notes}</p>
          )}
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pt-2 border-t border-slate-800/60">
            {orderData.checklistItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Campo Customer Notes (Observações do Cliente & Condição do Equipamento) incluso no PDF */}
      {(() => {
        const MIN_PROFESSIONAL_NOTE_LENGTH = 20;
        const trimmedLength = customerNotes.trim().length;
        const meetsMinRequirement = trimmedLength >= MIN_PROFESSIONAL_NOTE_LENGTH;

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                htmlFor="os-detail-customer-notes"
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block"
              >
                Customer Notes · Solicitações do Cliente e Condição do Equipamento
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold transition-colors ${
                    meetsMinRequirement ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {trimmedLength}/{MIN_PROFESSIONAL_NOTE_LENGTH} mín. caracteres
                </span>
                <span className="text-[10px] font-mono text-sky-400">Incluso no PDF</span>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="os-detail-customer-notes"
                aria-label="Customer Notes"
                aria-invalid={!meetsMinRequirement}
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Registre solicitações específicas do cliente ou observações sobre o estado físico e operacional do equipamento (mín. 20 caracteres para nota técnica profissional)..."
                className={`w-full pl-3.5 pr-12 py-3.5 pb-8 rounded-2xl bg-slate-950/70 border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition resize-y ${
                  meetsMinRequirement
                    ? 'border-emerald-500/60 focus:border-emerald-400'
                    : 'border-rose-500/50 focus:border-rose-400'
                }`}
              />

              {/* Visual validation icon (check/cross) inside the Customer Notes textarea */}
              <div
                data-testid="customer-notes-validation-icon"
                data-valid={meetsMinRequirement ? 'true' : 'false'}
                title={
                  meetsMinRequirement
                    ? 'Nota técnica profissional válida (comprimento mínimo atingido)'
                    : `Comprimento insuficiente: mínimo de ${MIN_PROFESSIONAL_NOTE_LENGTH} caracteres necessários para uma nota profissional`
                }
                className={`pointer-events-none absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  meetsMinRequirement
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                }`}
              >
                {meetsMinRequirement ? (
                  <Check size={14} strokeWidth={3} aria-label="Valid professional note length" />
                ) : (
                  <X size={14} strokeWidth={3} aria-label="Insufficient professional note length" />
                )}
              </div>

              {/* Status indicator badge inside bottom-right of textarea */}
              <div
                className={`pointer-events-none absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border transition-all duration-300 ${
                  meetsMinRequirement
                    ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
                }`}
              >
                {meetsMinRequirement ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                    <span>Nota profissional válida</span>
                  </>
                ) : (
                  <>
                    <XCircle size={11} className="text-rose-400 shrink-0" />
                    <span>Faltam {MIN_PROFESSIONAL_NOTE_LENGTH - trimmedLength} caracteres</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Campo Customer Signature com abertura do Signature Pad Modal e persistência Base64 no Banco */}
      <section
        id="customer-signature-section"
        aria-label="Customer Signature"
        className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Customer Signature · Assinatura do Cliente
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Confirmação de conformidade e aceite dos serviços executados (Base64 salvo no banco)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {signatureSavedToDb && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Saved to Database</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(true)}
              disabled={isSavingSignature}
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
            >
              <PenTool size={14} className="text-sky-400" />
              <span>
                {isSavingSignature
                  ? 'Saving Signature...'
                  : customerSignature
                  ? 'Update Signature'
                  : 'Open Signature Canvas'}
              </span>
            </button>
          </div>
        </div>

        <div
          onClick={() => setIsSignatureModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsSignatureModalOpen(true);
            }
          }}
          className="w-full rounded-xl border border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-900/60 p-3 flex flex-col items-center justify-center min-h-[88px] cursor-pointer transition group"
        >
          {customerSignature ? (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="bg-white rounded-lg px-4 py-2 max-w-xs w-full flex items-center justify-center shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customerSignature}
                  alt={`Assinatura de ${clientName}`}
                  className="max-h-16 object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Assinado por {clientName} · Base64 salvo no banco (Clique para editar)</span>
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-sky-300 transition">
              <PenTool size={18} className="text-sky-400/80" />
              <span className="text-xs font-semibold">
                Clique aqui para abrir o canvas e coletar a assinatura do cliente (Customer Signature)
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Lembrete de Preventiva */}
      <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3 text-xs">
        <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-300">Próxima Manutenção Preventiva Programada</p>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Para manter a garantia do fabricante e ar puro, o intervalo recomendado para a sua
            próxima revisão é de 6 meses.
          </p>
        </div>
      </div>

      {/* Exportador de PDF com Dados da Empresa e QR Code */}
      <ServiceOrderPdfExporter ref={pdfExporterRef} order={updatedOrderData} />

      <CustomerSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={async (sigDataUrl) => {
          setCustomerSignature(sigDataUrl);
          setIsSavingSignature(true);
          try {
            await saveCustomerSignatureAction({
              id: installationId || orderData.orderNumber,
              orderNumber: orderData.orderNumber,
              clientName,
              equipment,
              customerSignature: sigDataUrl,
            });
            setSignatureSavedToDb(true);
            setTimeout(() => setSignatureSavedToDb(false), 4000);
          } finally {
            setIsSavingSignature(false);
          }
        }}
        clientName={clientName}
        orderNumber={orderData.orderNumber}
        initialSignature={customerSignature}
      />

      <ServiceOrderQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        currentOrderFallback={{
          orderNumber: orderData.orderNumber,
          status,
          clientName,
          equipment,
          dateStr: orderData.dateStr,
        }}
        onOrderResolved={(resolved) => {
          if (resolved.orderNumber.toLowerCase() === orderData.orderNumber.toLowerCase()) {
            setStatus(resolved.status);
          }
        }}
      />

      <ServiceOrderQrGeneratorModal
        isOpen={isQrGeneratorOpen}
        onClose={() => setIsQrGeneratorOpen(false)}
        orderNumber={orderData.orderNumber}
        clientName={clientName}
        clientPhone={orderData.clientPhone}
        equipment={equipment}
        status={status}
      />

      {/* Floating Action Button (FAB) para QR Code Scanner dentro de #service-order-container */}
      <div className="sticky bottom-4 z-30 flex justify-end pointer-events-none pt-2">
        <button
          id="service-order-qr-fab"
          type="button"
          onClick={() => setIsQrScannerOpen(true)}
          aria-label="Scan Service Order QR Code"
          title="Escanear QR Code para localizar Ordem de Serviço rapidamente"
          className="pointer-events-auto group flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-[0_10px_30px_rgba(14,165,233,0.45)] hover:shadow-[0_12px_36px_rgba(14,165,233,0.65)] border border-white/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="p-1.5 rounded-full bg-slate-950/30 border border-white/20 flex items-center justify-center">
            <QrCode size={18} className="text-white group-hover:rotate-6 transition-transform" />
          </span>
          <span className="tracking-wide">Scan OS QR</span>
        </button>
      </div>
    </div>
  );
}
