'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Copy, 
  Send, 
  Info,
  CheckCheck
} from 'lucide-react';
import { 
  TEMPLATE_VARIABLES, 
  DEFAULT_WHATSAPP_TEMPLATE, 
  formatWhatsAppReminderMessage,
  MaintenanceReminder 
} from '@/lib/reminderUtils';
import { toast } from 'sonner';

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate: string;
  onSaveTemplate: (newTemplate: string) => void;
  sampleReminder?: MaintenanceReminder;
  technicianName?: string;
}

export function WhatsAppTemplateModal({
  isOpen,
  onClose,
  currentTemplate,
  onSaveTemplate,
  sampleReminder,
  technicianName
}: WhatsAppTemplateModalProps) {
  const [template, setTemplate] = useState<string>(currentTemplate || DEFAULT_WHATSAPP_TEMPLATE);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTemplate(currentTemplate || DEFAULT_WHATSAPP_TEMPLATE);
    }
  }, [isOpen, currentTemplate]);

  if (!isOpen) return null;

  // Objeto de exemplo para pré-visualização em tempo real
  const mockReminder: MaintenanceReminder = sampleReminder || {
    clientName: 'Dr. Roberto Mendes',
    clientPhone: '5511998877665',
    equipment: 'Split Inverter Daikin 12.000 BTU/h',
    serviceDate: new Date().toISOString().split('T')[0],
    monthsInterval: 6,
    reminderDaysBefore: 3,
    orderNumber: 'OS-2026-0042',
    technicianName: technicianName || 'Técnico Especialista',
    companyName: 'ClimaPro Refrigeração'
  };

  const previewMessage = formatWhatsAppReminderMessage(
    mockReminder,
    template,
    typeof window !== 'undefined' ? window.location.origin : 'https://amigorefrigerista.pro'
  );

  const insertVariable = (variableTag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = template;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const updatedText = before + variableTag + after;
    setTemplate(updatedText);

    // Reposiciona o cursor após a variável inserida
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + variableTag.length, start + variableTag.length);
      }
    }, 50);

    toast.success(`Variável ${variableTag} adicionada!`, { id: 'var-insert' });
  };

  const handleReset = () => {
    setTemplate(DEFAULT_WHATSAPP_TEMPLATE);
    toast.success('Modelo restaurado para o padrão.');
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    toast.success('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!template.trim()) {
      toast.error('O modelo não pode ficar vazio.');
      return;
    }
    onSaveTemplate(template);
    toast.success('Modelo de WhatsApp atualizado com sucesso!');
    onClose();
  };

  const applyPreset = (presetText: string, presetName: string) => {
    setTemplate(presetText);
    toast.success(`Preset "${presetName}" aplicado!`);
  };

  const presets = [
    {
      name: 'Padrão Amigável (Recomendado)',
      text: DEFAULT_WHATSAPP_TEMPLATE
    },
    {
      name: 'Direto & Comercial',
      text: `Olá, {CLIENTE}! Aqui é {TECNICO}. 

Sua manutenção preventiva ({EQUIPAMENTO}) está agendada para {DATA_PREVENTIVA}. 

Podemos confirmar a visita técnica para esta semana?
Acesse a sua OS: {LINK_OS}`
    },
    {
      name: 'Enfoque em Saúde & PMOC',
      text: `Olá, {CLIENTE}! Passando para lembrar da higienização periódica do seu {EQUIPAMENTO}, com vencimento em *{DATA_PREVENTIVA}*.

Evite ácaros, bactérias e reduza o consumo de eletricidade da sua máquina.

Qual o melhor horário para agendarmos sua preventiva?
Ordem de Serviço digital: {LINK_OS}

Atenciosamente, {TECNICO}`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Personalizar Mensagem WhatsApp</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  DINÂMICO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personalize o texto automático com variáveis dinâmicas do cliente e da OS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Presets Rápidos */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Modelos Rápidos Prontos:
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p.text, p.name)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} className="text-emerald-400" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Variáveis Dinâmicas */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Info size={14} className="text-sky-400" />
                <span>Clique para Inserir Variável Dinâmica:</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Substituição automática</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  title={`Exemplo: ${v.example}`}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-500/30 text-sky-300 font-mono font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>+ {v.tag}</span>
                  <span className="text-[9px] text-slate-400 font-sans font-normal ml-0.5">({v.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor de Texto do Modelo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Editor do Modelo da Mensagem:
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-semibold"
              >
                <RotateCcw size={12} />
                <span>Restaurar Padrão</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={7}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Digite o modelo da mensagem usando as variáveis dinâmicas como {CLIENTE}, {DATA_PREVENTIVA}, {LINK_OS}..."
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-sans leading-relaxed text-xs resize-y"
            />
            <p className="text-[10px] text-slate-500">
              Dica: Use asteriscos para formatar texto em *negrito* no WhatsApp (ex: *{'{DATA_PREVENTIVA}'}*).
            </p>
          </div>

          {/* Pré-visualização ao Vivo (Estilo WhatsApp) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Pré-visualização no WhatsApp do Cliente</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPreview}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer font-bold"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b141a] border border-emerald-500/20 shadow-inner space-y-2">
              <div className="max-w-[88%] ml-auto bg-[#005c4b] text-slate-100 rounded-2xl rounded-tr-xs p-3.5 shadow-md space-y-2">
                <p className="whitespace-pre-line text-xs leading-relaxed break-words font-sans">
                  {previewMessage}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 font-mono pt-1">
                  <span>14:32</span>
                  <CheckCheck size={14} className="text-[#53bdeb]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            O modelo salvo será usado automaticamente para todos os novos lembretes.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Salvar Modelo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default WhatsAppTemplateModal;
