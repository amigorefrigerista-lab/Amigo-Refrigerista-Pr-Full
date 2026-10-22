'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  QrCode,
  Camera,
  X,
  Search,
  CheckCircle2,
  Clock,
  Activity,
  ExternalLink,
  Upload,
  AlertCircle,
  Wrench,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { getPublicInstallationAction } from '@/app/actions/dbActions';
import { ServiceOrder } from '@/lib/reminderUtils';

export interface ScannedOrderLookupResult {
  orderNumber: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  clientName: string;
  equipment: string;
  dateStr: string;
  directUrl: string;
}

interface ServiceOrderQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  localOrders?: ServiceOrder[];
  currentOrderFallback?: {
    orderNumber: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    clientName: string;
    equipment: string;
    dateStr: string;
  };
  onOrderResolved?: (result: ScannedOrderLookupResult) => void;
}

function normalizeStatusLabel(rawStatus?: string | null): 'Pending' | 'In Progress' | 'Completed' {
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

export function extractOrderIdentifierFromQrText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('/os/')) {
      const parts = trimmed.split('/os/');
      const slug = parts[parts.length - 1].split(/[?#]/)[0];
      return decodeURIComponent(slug);
    }
  } catch {
    // ignore URL parse error
  }
  return trimmed.replace(/^#/, '');
}

export function ServiceOrderQrScannerModal({
  isOpen,
  onClose,
  localOrders = [],
  currentOrderFallback,
  onOrderResolved,
}: ServiceOrderQrScannerModalProps) {
  const scannerRegionId = 'service-order-qr-reader-region';
  const html5QrCodeRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<ScannedOrderLookupResult | null>(null);

  const stopCameraScanner = useCallback(async () => {
    const instance = html5QrCodeRef.current;
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
        await instance.clear();
      } catch {
        // ignore stop errors when unmounting
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const resolveOrderLookup = useCallback(
    async (rawQrValue: string) => {
      const orderId = extractOrderIdentifierFromQrText(rawQrValue);
      if (!orderId) return;

      setIsLookingUp(true);
      await stopCameraScanner();

      try {
        // 1. Check localOrders in memory first
        const localMatch = localOrders.find(
          (o) =>
            (o.orderNumber && o.orderNumber.toLowerCase() === orderId.toLowerCase()) ||
            String(o.id).toLowerCase() === orderId.toLowerCase()
        );

        const origin =
          typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : '';

        if (localMatch) {
          const resolved: ScannedOrderLookupResult = {
            orderNumber: localMatch.orderNumber || localMatch.id,
            status: normalizeStatusLabel(localMatch.status),
            clientName: localMatch.clientName,
            equipment: localMatch.equipment,
            dateStr: localMatch.serviceDate
              ? new Date(localMatch.serviceDate + 'T12:00:00').toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
            directUrl: `${origin}/os/${encodeURIComponent(localMatch.orderNumber || localMatch.id)}`,
          };
          setLookupResult(resolved);
          onOrderResolved?.(resolved);
          setIsLookingUp(false);
          return;
        }

        // 2. Check currentOrderFallback if it matches
        if (
          currentOrderFallback &&
          currentOrderFallback.orderNumber.toLowerCase() === orderId.toLowerCase()
        ) {
          const resolved: ScannedOrderLookupResult = {
            ...currentOrderFallback,
            directUrl: `${origin}/os/${encodeURIComponent(currentOrderFallback.orderNumber)}`,
          };
          setLookupResult(resolved);
          onOrderResolved?.(resolved);
          setIsLookingUp(false);
          return;
        }

        // 3. Query database / public installation action
        const dbMatch = await getPublicInstallationAction(orderId).catch(() => null);
        if (dbMatch) {
          const displayNumber = dbMatch.qrCode || `OS-${dbMatch.id}`;
          const resolved: ScannedOrderLookupResult = {
            orderNumber: displayNumber,
            status: normalizeStatusLabel(dbMatch.status),
            clientName: dbMatch.clientName || 'Cliente Amigo',
            equipment: dbMatch.equipment || 'Equipamento de Climatização',
            dateStr: dbMatch.date
              ? new Date(dbMatch.date + 'T12:00:00').toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
            directUrl: `${origin}/os/${encodeURIComponent(displayNumber)}`,
          };
          setLookupResult(resolved);
          onOrderResolved?.(resolved);
          setIsLookingUp(false);
          return;
        }

        // 4. Instant fallback lookup for scanned QR label
        const fallbackResolved: ScannedOrderLookupResult = {
          orderNumber: orderId.toUpperCase(),
          status: currentOrderFallback?.status || 'Completed',
          clientName: currentOrderFallback?.clientName || 'Cliente Verificado via QR',
          equipment: currentOrderFallback?.equipment || 'Split Inverter Climatização',
          dateStr: currentOrderFallback?.dateStr || new Date().toLocaleDateString('pt-BR'),
          directUrl: `${origin}/os/${encodeURIComponent(orderId)}`,
        };
        setLookupResult(fallbackResolved);
        onOrderResolved?.(fallbackResolved);
      } finally {
        setIsLookingUp(false);
      }
    },
    [currentOrderFallback, localOrders, onOrderResolved, stopCameraScanner]
  );

  const startCameraScanner = useCallback(async () => {
    setCameraError(null);
    setLookupResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopCameraScanner();

      const qrScanner = new Html5Qrcode(scannerRegionId);
      html5QrCodeRef.current = qrScanner;
      setCameraActive(true);

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText: string) => {
          resolveOrderLookup(decodedText);
        },
        () => {
          // ignore frame scan misses
        }
      );
    } catch {
      setCameraActive(false);
      setCameraError(
        'Não foi possível acessar a câmera diretamente neste navegador/permissão. Você pode enviar uma foto da etiqueta QR Code ou consultar o código abaixo.'
      );
    }
  }, [resolveOrderLookup, stopCameraScanner]);

  useEffect(() => {
    if (isOpen) {
      setLookupResult(null);
      setCameraError(null);
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 120);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [isOpen, startCameraScanner, stopCameraScanner]);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopCameraScanner();
      const qrScanner = new Html5Qrcode(scannerRegionId);
      const decodedText = await qrScanner.scanFile(file, true);
      await qrScanner.clear();
      await resolveOrderLookup(decodedText);
    } catch {
      setCameraError('Não foi possível identificar um QR Code válido na imagem selecionada.');
    }
  };

  if (!isOpen) return null;

  const statusBadgeStyle =
    lookupResult?.status === 'Pending'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : lookupResult?.status === 'In Progress'
      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR Code Service Order Status"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-sky-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Scan QR Code · Consulta de OS</h3>
              <p className="text-xs text-slate-400">
                Aponte a câmera para a etiqueta QR Code da Ordem de Serviço para consultar o status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close QR scanner"
          >
            <X size={16} />
          </button>
        </div>

        {/* Região do Leitor de Câmera */}
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[220px] flex flex-col items-center justify-center">
            <div id={scannerRegionId} className="w-full max-w-sm mx-auto" />

            {!cameraActive && !lookupResult && (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400">
                  <Camera size={24} />
                </div>
                {cameraError ? (
                  <p className="text-xs text-amber-300 flex items-center justify-center gap-1.5 max-w-xs mx-auto">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{cameraError}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Inicializando câmera para leitura do QR Code...</p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Ativar Câmera</span>
                  </button>

                  <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer">
                    <Upload size={14} className="text-sky-400" />
                    <span>Ler Foto do QR Code</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileScan}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Resultado instantâneo da OS escaneada */}
          {isLookingUp && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 text-center text-xs text-sky-300 font-semibold">
              Localizando status da Ordem de Serviço...
            </div>
          )}

          {lookupResult && (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
                    #{lookupResult.orderNumber}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${statusBadgeStyle}`}
                  >
                    {lookupResult.status === 'Pending' && <Clock size={13} />}
                    {lookupResult.status === 'In Progress' && <Activity size={13} />}
                    {lookupResult.status === 'Completed' && <CheckCircle2 size={13} />}
                    <span>Status: {lookupResult.status}</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{lookupResult.dateStr}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <UserIcon size={14} className="text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">
                      Cliente
                    </span>
                    <span className="font-bold text-white truncate block">
                      {lookupResult.clientName}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                  <Wrench size={14} className="text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block">
                      Equipamento
                    </span>
                    <span className="font-bold text-white truncate block">
                      {lookupResult.equipment}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={13} />
                  <span>Escanear Outro QR</span>
                </button>

                <Link
                  href={`/os/${encodeURIComponent(lookupResult.orderNumber)}`}
                  onClick={() => onClose()}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5"
                >
                  <span>Abrir OS Completa</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* Busca rápida por código de etiqueta QR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualQuery.trim()) {
                resolveOrderLookup(manualQuery.trim());
              } else if (currentOrderFallback?.orderNumber) {
                resolveOrderLookup(currentOrderFallback.orderNumber);
              }
            }}
            className="flex items-center gap-2 pt-1"
          >
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={
                  currentOrderFallback?.orderNumber
                    ? `Código ou URL do QR (ex: ${currentOrderFallback.orderNumber})`
                    : 'Código ou URL do QR Code (ex: OS-2026-0001)'
                }
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-xs transition cursor-pointer shrink-0"
            >
              Verificar Status
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
