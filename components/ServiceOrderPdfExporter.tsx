'use client';

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Download,
  Printer,
  QrCode,
  Building2,
  CheckCircle2,
  Loader2,
  Sliders,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface ServiceOrderData {
  orderNumber: string;
  clientName: string;
  clientPhone?: string | null;
  address?: string | null;
  equipment: string;
  brand: string;
  btus: string;
  serviceType?: string | null;
  status?: string | null;
  dateStr: string;
  warrantyMonths: number;
  value?: number | null;
  notes: string;
  customerNotes?: string | null;
  checklistItems: string[];
  customerSignature?: string | null;
}

export interface ServiceOrderPdfExporterRef {
  exportPdf: () => Promise<void>;
}

interface CompanyProfile {
  companyName: string;
  companyDocument: string;
  technicianName: string;
  technicianRegistry: string;
  companyPhone: string;
  companyEmail: string;
}

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'Amigo Refrigerista Pro — Engenharia & Climatização',
  companyDocument: 'CNPJ: 48.291.730/0001-92',
  technicianName: 'Responsável Técnico Credenciado',
  technicianRegistry: 'Registro CFT/CRT: 20268914-SP',
  companyPhone: '(11) 99824-5100',
  companyEmail: 'atendimento@amigorefrigerista.com.br',
};

const COMPANY_STORAGE_KEY = 'amigo_os_pdf_company_profile_v1';

export const ServiceOrderPdfExporter = forwardRef<
  ServiceOrderPdfExporterRef,
  { order: ServiceOrderData }
>(function ServiceOrderPdfExporter({ order }, ref) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [exportedSuccess, setExportedSuccess] = useState<boolean>(false);
  const [sharedCopied, setSharedCopied] = useState<boolean>(false);
  const [showCompanyEditor, setShowCompanyEditor] = useState<boolean>(false);
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompany((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore localStorage read errors
    }
  }, []);

  const handleCompanyChange = (field: keyof CompanyProfile, val: string) => {
    setCompany((prev) => {
      const updated = { ...prev, [field]: val };
      try {
        localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://amigorefrigerista.com.br';
    const targetUrl = `${origin}/os/${encodeURIComponent(order.orderNumber)}`;
    setVerificationUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erro ao gerar QR Code da OS:', err));
  }, [order.orderNumber]);

  const handleExportPdf = useCallback(async () => {
    setIsGenerating(true);
    setExportedSuccess(false);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let cursorY = 14;

      // Garantir QR Code atualizado
      const finalQrUrl =
        qrDataUrl ||
        (await QRCode.toDataURL(verificationUrl || `OS:${order.orderNumber}`, {
          width: 280,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        }));

      // ---------------------------------------------------------
      // 1. CABEÇALHO CORPORATIVO (Print-Friendly Clean Header)
      // ---------------------------------------------------------
      doc.setFillColor(15, 23, 42); // Slate-900 header bar
      doc.roundedRect(margin, cursorY, contentWidth, 28, 3, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(company.companyName, margin + 5, cursorY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `${company.companyDocument}  |  ${company.technicianRegistry}`,
        margin + 5,
        cursorY + 14
      );
      doc.text(
        `Responsável: ${company.technicianName}  |  Tel: ${company.companyPhone}  |  ${company.companyEmail}`,
        margin + 5,
        cursorY + 19.5
      );
      doc.setTextColor(56, 189, 248);
      doc.setFont('helvetica', 'bold');
      doc.text(
        'COMPROVANTE OFICIAL DE ORDEM DE SERVIÇO E CERTIFICADO DE GARANTIA',
        margin + 5,
        cursorY + 25
      );

      // Bloco direito no cabeçalho: Número da OS e Data
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pageWidth - margin - 52, cursorY + 3, 49, 22, 2, 2, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEM DE SERVIÇO Nº', pageWidth - margin - 27.5, cursorY + 8.5, {
        align: 'center',
      });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`#${order.orderNumber}`, pageWidth - margin - 27.5, cursorY + 15, {
        align: 'center',
      });
      doc.setTextColor(52, 211, 153);
      doc.setFontSize(7.5);
      doc.text(`DATA: ${order.dateStr}`, pageWidth - margin - 27.5, cursorY + 21, {
        align: 'center',
      });

      cursorY += 34;

      // ---------------------------------------------------------
      // 2. DADOS DO CLIENTE & GARANTIA
      // ---------------------------------------------------------
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, cursorY, contentWidth, 26, 2, 2, 'FD');

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO CLIENTE ATENDIDO', margin + 4, cursorY + 6);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10.5);
      doc.text(order.clientName, margin + 4, cursorY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const addressLine = order.address
        ? `Endereço: ${order.address}`
        : 'Endereço: Atendimento registrado no local do cliente';
      doc.text(addressLine, margin + 4, cursorY + 17.5);

      const phoneLine = order.clientPhone
        ? `Telefone / WhatsApp: ${order.clientPhone}`
        : 'Status: Serviço concluído e certificado';
      doc.text(phoneLine, margin + 4, cursorY + 22.5);

      // Coluna Direita: Cobertura de Garantia
      const rightColX = pageWidth - margin - 66;
      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(rightColX, cursorY + 3, 62, 20, 2, 2, 'FD');

      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('GARANTIA TÉCNICA OFICIAL', rightColX + 31, cursorY + 9, {
        align: 'center',
      });
      doc.setFontSize(11);
      doc.text(`${order.warrantyMonths} MESES DE GARANTIA`, rightColX + 31, cursorY + 15.5, {
        align: 'center',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Cobertura integral sobre o serviço', rightColX + 31, cursorY + 20.5, {
        align: 'center',
      });

      cursorY += 32;

      // ---------------------------------------------------------
      // 3. RESUMO DO EQUIPAMENTO E ORDEM DE SERVIÇO
      // ---------------------------------------------------------
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('RESUMO DO EQUIPAMENTO E ESPECIFICAÇÕES DO ATENDIMENTO', margin, cursorY);
      cursorY += 3;

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, cursorY, contentWidth, 24, 2, 2, 'FD');

      const colW = contentWidth / 4;
      const specs = [
        { label: 'EQUIPAMENTO', val: order.equipment },
        { label: 'MARCA / TECNOLOGIA', val: order.brand },
        { label: 'CAPACIDADE TÉRMICA', val: order.btus },
        {
          label: order.value && order.value > 0 ? 'VALOR DO SERVIÇO' : 'SITUAÇÃO DA OS',
          val:
            order.value && order.value > 0
              ? `R$ ${Number(order.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'Concluída / Aprovada',
        },
      ];

      specs.forEach((spec, idx) => {
        const xPos = margin + idx * colW + 4;
        if (idx > 0) {
          doc.setDrawColor(226, 232, 240);
          doc.line(margin + idx * colW, cursorY + 3, margin + idx * colW, cursorY + 21);
        }
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(spec.label, xPos, cursorY + 8);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const clipped = doc.splitTextToSize(spec.val, colW - 6);
        doc.text(clipped[0] || spec.val, xPos, cursorY + 15.5);
      });

      cursorY += 31;

      // ---------------------------------------------------------
      // 4. PROCEDIMENTOS EXECUTADOS & LAUDO TÉCNICO
      // ---------------------------------------------------------
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('DESCRIÇÃO DOS SERVIÇOS E LAUDO TÉCNICO DE EXECUÇÃO', margin, cursorY);
      cursorY += 3;

      const splitNotes = doc.splitTextToSize(order.notes, contentWidth - 10);
      const notesHeight = Math.max(18, splitNotes.length * 4.8 + 8);
      const checklistHeight = order.checklistItems.length * 6 + 10;
      const totalBoxHeight = notesHeight + checklistHeight;

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, cursorY, contentWidth, totalBoxHeight, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(splitNotes, margin + 5, cursorY + 7);

      let checkY = cursorY + notesHeight + 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 5, checkY - 3, pageWidth - margin - 5, checkY - 3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('CHECKLIST DE VERIFICAÇÃO E CONFORMIDADE TÉCNICA:', margin + 5, checkY + 2);
      checkY += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      order.checklistItems.forEach((item) => {
        doc.setFillColor(16, 185, 129);
        doc.circle(margin + 7, checkY - 1.2, 1.2, 'F');
        doc.text(item, margin + 11, checkY);
        checkY += 5.8;
      });

      cursorY += totalBoxHeight + 6;

      // ---------------------------------------------------------
      // 4.1 OBSERVAÇÕES DO CLIENTE & CONDIÇÃO DO EQUIPAMENTO (CUSTOMER NOTES)
      // ---------------------------------------------------------
      const customerNotesText = (order.customerNotes || '').trim();
      if (customerNotesText) {
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(
          'CUSTOMER NOTES — OBSERVAÇÕES DO CLIENTE E CONDIÇÃO DO EQUIPAMENTO',
          margin,
          cursorY
        );
        cursorY += 2.5;

        const splitCustNotes = doc.splitTextToSize(customerNotesText, contentWidth - 10);
        const custNotesBoxHeight = Math.min(24, Math.max(13, splitCustNotes.length * 4.5 + 6));

        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(254, 252, 232);
        doc.roundedRect(margin, cursorY, contentWidth, custNotesBoxHeight, 2, 2, 'FD');

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        doc.text(splitCustNotes.slice(0, 4), margin + 5, cursorY + 6);

        cursorY += custNotesBoxHeight + 5;
      }

      // ---------------------------------------------------------
      // 5. RECOMENDAÇÃO DE MANUTENÇÃO PREVENTIVA (PMOC)
      // ---------------------------------------------------------
      doc.setDrawColor(14, 165, 233);
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(margin, cursorY, contentWidth, 16, 2, 2, 'FD');

      doc.setTextColor(3, 105, 161);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(
        'RECOMENDAÇÃO DE MANUTENÇÃO PREVENTIVA PROGRAMADA (PMOC / GARANTIA)',
        margin + 5,
        cursorY + 6.5
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        'Para preservar a eficiência energética, a qualidade do ar e a garantia, recomenda-se revisão preventiva a cada 6 meses.',
        margin + 5,
        cursorY + 12.5
      );

      cursorY += 23;

      // ---------------------------------------------------------
      // 6. BLOCO DE QR CODE DE AUTENTICIDADE & ASSINATURAS
      // ---------------------------------------------------------
      const qrBoxWidth = 66;
      const sigBoxWidth = contentWidth - qrBoxWidth - 6;
      const bottomBlockHeight = 46;

      // Caixa de Assinaturas (Esquerda)
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, cursorY, sigBoxWidth, bottomBlockHeight, 2, 2, 'FD');

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TERMO DE RECEBIMENTO E CONFORMIDADE', margin + 5, cursorY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Declaramos que os serviços descritos nesta Ordem de Serviço foram executados e testados em perfeitas condições técnicas.',
        margin + 5,
        cursorY + 12.5,
        { maxWidth: sigBoxWidth - 10 }
      );

      // Linhas de assinatura
      const sigLineY = cursorY + 34;
      const halfSig = (sigBoxWidth - 16) / 2;

      if (order.customerSignature) {
        try {
          doc.addImage(
            order.customerSignature,
            'PNG',
            margin + 13 + halfSig,
            sigLineY - 15,
            Math.min(halfSig - 4, 46),
            14
          );
        } catch {
          // ignore invalid image data
        }
      }

      doc.setDrawColor(148, 163, 184);
      doc.line(margin + 5, sigLineY, margin + 5 + halfSig, sigLineY);
      doc.line(margin + 11 + halfSig, sigLineY, margin + 11 + halfSig * 2, sigLineY);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(company.technicianName, margin + 5 + halfSig / 2, sigLineY + 4.5, {
        align: 'center',
      });
      doc.text(order.clientName, margin + 11 + halfSig + halfSig / 2, sigLineY + 4.5, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Responsável Técnico', margin + 5 + halfSig / 2, sigLineY + 8.5, {
        align: 'center',
      });
      doc.text('Assinatura do Cliente', margin + 11 + halfSig + halfSig / 2, sigLineY + 8.5, {
        align: 'center',
      });

      // Caixa do QR Code (Direita)
      const qrBoxX = margin + sigBoxWidth + 6;
      doc.setDrawColor(15, 23, 42);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(qrBoxX, cursorY, qrBoxWidth, bottomBlockHeight, 2, 2, 'FD');

      if (finalQrUrl) {
        doc.addImage(finalQrUrl, 'PNG', qrBoxX + 4, cursorY + 4, 28, 28);
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.text('VALIDAÇÃO QR CODE', qrBoxX + 34, cursorY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const qrExplain = doc.splitTextToSize(
        'Aponte a câmera do celular para consultar a autenticidade e garantia online desta OS.',
        29
      );
      doc.text(qrExplain, qrBoxX + 34, cursorY + 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(3, 105, 161);
      doc.text(`OS #${order.orderNumber}`, qrBoxX + 34, cursorY + 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const clippedUrl =
        verificationUrl.length > 42 ? verificationUrl.slice(0, 42) + '...' : verificationUrl;
      doc.text(clippedUrl, qrBoxX + 4, cursorY + 39);

      // ---------------------------------------------------------
      // 7. RODAPÉ DO DOCUMENTO
      // ---------------------------------------------------------
      const footerY = 285;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Documento gerado eletronicamente por ${company.companyName} · Emissão: ${new Date().toLocaleString('pt-BR')}`,
        margin,
        footerY
      );
      doc.text('Página 1 de 1', pageWidth - margin, footerY, { align: 'right' });

      const cleanFileName = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
      doc.save(`Ordem-de-Servico-${cleanFileName}.pdf`);

      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 5000);
    } catch (error) {
      console.error('Erro ao exportar PDF da Ordem de Serviço:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [company, order, qrDataUrl, verificationUrl]);

  useImperativeHandle(
    ref,
    () => ({
      exportPdf: handleExportPdf,
    }),
    [handleExportPdf]
  );

  const handleNativePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShareOrder = async () => {
    const shareUrl =
      verificationUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/os/${encodeURIComponent(order.orderNumber)}`
        : '');

    const shareData = {
      title: `Ordem de Serviço #${order.orderNumber} — ${order.clientName}`,
      text: `Confira o comprovante e certificado de garantia da Ordem de Serviço #${order.orderNumber} (${order.equipment}) para ${order.clientName}.`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Fallback para cópia de link caso o compartilhamento nativo falhe em iframe
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setSharedCopied(true);
        setTimeout(() => setSharedCopied(false), 3500);
      } catch (clipErr) {
        console.error('Erro ao copiar link da OS:', clipErr);
      }
    }
  };

  const handleShareViaWhatsApp = async () => {
    const shareUrl =
      verificationUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/os/${encodeURIComponent(order.orderNumber)}`
        : '');

    const shareMessage = `Olá, ${order.clientName}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${order.orderNumber} (${order.equipment}): ${shareUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Ordem de Serviço #${order.orderNumber} — ${order.clientName}`,
          text: `Olá, ${order.clientName}! Confira o comprovante e certificado de garantia da sua Ordem de Serviço #${order.orderNumber} (${order.equipment}):`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    let cleanPhone = (order.clientPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setSharedCopied(true);
        setTimeout(() => setSharedCopied(false), 3500);
      } catch {
        // ignore
      }
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
    <div className="space-y-5 pt-2">
      {/* Bloco Visual de Dados da Empresa + QR Code de Validação na Página */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Empresa Emissora & Responsabilidade Técnica</span>
          </div>
          <p className="text-sm font-bold text-white">{company.companyName}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            <span>{company.companyDocument}</span>
            <span aria-hidden="true">·</span>
            <span>{company.technicianRegistry}</span>
            <span aria-hidden="true">·</span>
            <span>{company.companyPhone}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCompanyEditor((prev) => !prev)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1 pt-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Personalizar dados da empresa para o PDF</span>
            {showCompanyEditor ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* QR Code Visual no Card da OS + Botão Share via WhatsApp ao lado */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl self-stretch sm:self-auto">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Code OS ${order.orderNumber}`}
              className="w-16 h-16 rounded-lg bg-white p-1 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <QrCode className="w-7 h-7" />
            </div>
          )}
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>QR Code Incluso no PDF</span>
              </span>
              <p className="text-white font-mono font-bold text-xs">#{order.orderNumber}</p>
            </div>
            <button
              type="button"
              onClick={handleShareViaWhatsApp}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Compartilhar link da OS via Web Share API / WhatsApp para o celular do cliente"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Opcional dos Dados da Empresa antes de exportar */}
      {showCompanyEditor && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white">
              Dados da Empresa no Cabeçalho e Assinatura do PDF
            </span>
            <button
              type="button"
              onClick={() => {
                setCompany(DEFAULT_COMPANY_PROFILE);
                try {
                  localStorage.removeItem(COMPANY_STORAGE_KEY);
                } catch {
                  // ignore
                }
              }}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Restaurar padrão
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Nome da Empresa / Assistência Técnica
              </label>
              <input
                type="text"
                value={company.companyName}
                onChange={(e) => handleCompanyChange('companyName', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                CNPJ / CPF Emissor
              </label>
              <input
                type="text"
                value={company.companyDocument}
                onChange={(e) => handleCompanyChange('companyDocument', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Nome do Responsável Técnico
              </label>
              <input
                type="text"
                value={company.technicianName}
                onChange={(e) => handleCompanyChange('technicianName', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Registro Profissional (CFT / CREA)
              </label>
              <input
                type="text"
                value={company.technicianRegistry}
                onChange={(e) => handleCompanyChange('technicianRegistry', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                value={company.companyPhone}
                onChange={(e) => handleCompanyChange('companyPhone', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                E-mail de Atendimento
              </label>
              <input
                type="text"
                value={company.companyEmail}
                onChange={(e) => handleCompanyChange('companyEmail', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback de PDF Gerado */}
      {exportedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            PDF da Ordem de Serviço <strong>#{order.orderNumber}</strong> gerado e salvo com sucesso!
          </span>
        </div>
      )}

      {/* Feedback de Link Copiado / Compartilhado */}
      {sharedCopied && (
        <div className="p-3 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Link direto da Ordem de Serviço <strong>#{order.orderNumber}</strong> copiado para a área de transferência!
            </span>
          </div>
          <span className="font-mono text-[10px] text-sky-400 truncate max-w-[200px] hidden sm:inline">
            {verificationUrl}
          </span>
        </div>
      )}

      {/* Barra de Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {order.clientPhone ? (
          <a
            href={`https://wa.me/55${order.clientPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Phone size={15} />
            <span>Falar com o Técnico no WhatsApp</span>
          </a>
        ) : (
          <div />
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleShareOrder}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            title="Compartilhar Ordem de Serviço ou copiar link direto"
          >
            {sharedCopied ? (
              <>
                <Check size={15} className="text-emerald-400" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 size={15} className="text-indigo-400" />
                <span>Compartilhar OS</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isGenerating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 size={15} className="animate-spin text-slate-950" />
            ) : (
              <Download size={15} />
            )}
            <span>{isGenerating ? 'Gerando PDF...' : 'Exportar para PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleNativePrint}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir OS</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default ServiceOrderPdfExporter;
