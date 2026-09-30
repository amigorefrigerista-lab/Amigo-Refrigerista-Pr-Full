'use client';

import React, { useState } from 'react';
import { X, User as UserIcon, Mail, ShieldCheck, Check } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (email: string, name: string) => Promise<void>;
  initialEmail?: string;
  initialName?: string;
}

export function GoogleConnectModal({
  isOpen,
  onClose,
  onConnect,
  initialEmail = '',
  initialName = ''
}: GoogleConnectModalProps) {
  const [googleEmail, setGoogleEmail] = useState(initialEmail);
  const [googleName, setGoogleName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim().toLowerCase();
    const cleanName = googleName.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Informe um e-mail do Google (@gmail.com ou Workspace) válido.');
      return;
    }

    if (!cleanName) {
      toast.error('Informe o seu Nome Completo para o perfil.');
      return;
    }

    try {
      setIsLoading(true);
      await onConnect(cleanEmail, cleanName);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao conectar com o Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const previewName = googleName.trim() || (googleEmail ? googleEmail.split('@')[0] : 'Seu Nome');
  const previewAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(previewName)}&background=0284c7&color=fff&size=120&bold=true`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            {/* Ícone Oficial de Cores do Google */}
            <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Vincular Conta Google Real</span>
              </h2>
              <p className="text-xs text-slate-400">Puxe seu nome, e-mail e foto autênticos</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Card de Pré-visualização do Perfil Real */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-sky-400 shrink-0 bg-sky-950 flex items-center justify-center shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAvatarUrl}
                alt={previewName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider font-mono">
                Dados Reais Sincronizados:
              </span>
              <p className="text-sm font-bold text-white truncate">{previewName}</p>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {googleEmail.trim() || 'seu.email@gmail.com'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Seu E-mail do Google (@gmail.com ou Workspace) *
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                autoFocus
                placeholder="exemplo: seu.nome@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-sans text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Seu Nome Completo no Google *
            </label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                placeholder="exemplo: Carlos Alberto Silva"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition font-sans text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/20 text-[11px] text-sky-300 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-sky-400" />
            <p>
              Seus dados reais serão utilizados para emissão de Ordens de Serviço, laudos técnicos e personalização das mensagens de WhatsApp para seus clientes.
            </p>
          </div>

          {/* Botão de Conectar */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-75 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Sincronizando Dados Reais...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} className="text-emerald-600" />
                  <span>Conectar e Puxar Dados do Google</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default GoogleConnectModal;
