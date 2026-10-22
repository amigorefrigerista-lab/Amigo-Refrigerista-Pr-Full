'use client';

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Share2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import QRCode from 'qrcode';
import Link from 'next/link';

interface ServiceOrderQrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  clientName?: string;
  clientPhone?: string | null;
  equipment?: string;
  status?: string;
}

export function ServiceOrderQrGeneratorModal({
  isOpen,
  onClose,
  orderNumber,
  clientName = 'Cliente Amigo',
  clientPhone = null,
  equipment = 'Equipamento de Climatização',
  status = 'Completed',
}: ServiceOrderQrGeneratorModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderNumber) return;

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://amigorefrigerista.com.br';
    const targetUrl = `${origin}/os/${encodeURIComponent(orderNumber)}`;
    setPublicUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('Erro ao gerar QR Code da OS:', err));
  }, [isOpen, orderNumber]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const cleanOrder = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
    link.href = qrDataUrl;
    link.download = `QR-Code-OS-${cleanOrder}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareViaWhatsApp = async () => {
    if (!publicUrl) return;
    const shareText = `Olá, ${clientName}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${orderNumber} (${equipment}): ${publicUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Ordem de Serviço #${orderNumber} — ${clientName}`,
          text: `Olá, ${clientName}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${orderNumber} (${equipment}):`,
          url: publicUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    let cleanPhone = (clientPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore clipboard error
    }

    if (typeof window !== 'undefined') {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Generated QR Code for Service Order"
    >
      <div className="w-full max-w-md bg-slate-900 border border-sky-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                QR Code da OS #{orderNumber}
              </h3>
              <p className="text-xs text-slate-400">
                Link rápido para a página pública da Ordem de Serviço
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Fechar modal de QR Code"
          >
            <X size={16} />
          </button>
        </div>

        {/* Display do QR Code Gerado Dinamicamente + Botão Share via WhatsApp ao lado */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="p-3 bg-white rounded-2xl shadow-lg border-4 border-sky-500/20 shrink-0">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR Code exclusivo para OS #${orderNumber}`}
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain block"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center text-xs text-slate-400">
                Gerando QR Code...
              </div>
            )}
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-3 flex-1">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                <ShieldCheck size={12} />
                <span>Status: {status}</span>
              </div>
              <p className="text-xs font-bold text-white">{clientName}</p>
              <p className="text-[11px] text-slate-400">{equipment}</p>
            </div>

            <button
              type="button"
              onClick={handleShareViaWhatsApp}
              className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              title="Compartilhar link da OS via Web Share API / WhatsApp para o celular do cliente"
            >
              <MessageSquare size={15} />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* URL Pública Direta */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Link Direto da Página Pública da OS
          </span>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-mono text-sky-300 truncate flex-1 px-1">
              {publicUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              title="Copiar link público da OS"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Ações Rápidas para o Técnico */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadQrImage}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-sky-400" />
            <span>Baixar PNG</span>
          </button>

          <button
            type="button"
            onClick={handleShareViaWhatsApp}
            className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 size={14} className="text-emerald-400" />
            <span>Share via WhatsApp</span>
          </button>

          <Link
            href={`/os/${encodeURIComponent(orderNumber)}`}
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Página Pública</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
