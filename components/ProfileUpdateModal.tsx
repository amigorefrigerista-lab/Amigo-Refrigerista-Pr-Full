'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, User as UserIcon, Mail, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string;
  currentEmail?: string;
  onSave: (name: string, email: string) => Promise<void>;
}

export function ProfileUpdateModal({
  isOpen,
  onClose,
  currentName = '',
  currentEmail = '',
  onSave
}: ProfileUpdateModalProps) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setEmail(currentEmail);
    }
  }, [isOpen, currentName, currentEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      toast.error('O campo Nome Completo é obrigatório.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Informe um endereço de e-mail válido.');
      return;
    }

    try {
      setLoading(true);
      await onSave(cleanName, cleanEmail);
      toast.success('Perfil atualizado com sucesso no banco de dados!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao atualizar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-3xl shadow-[0_20px_50px_rgba(245,158,11,0.2)] overflow-hidden my-auto">
        
        {/* Cabeçalho de Alerta */}
        <div className="p-6 border-b border-slate-800 bg-amber-950/30 flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Atenção Obrigatória
              </span>
            </div>
            <h2 className="text-base font-black text-white mt-1">
              Atualize seus Dados de Perfil
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Os campos obrigatórios (Nome e E-mail) estão vazios ou incompletos no banco de dados.
            </p>
          </div>
        </div>

        {/* Formulário de Atualização */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
              <ShieldAlert size={15} className="text-amber-400" />
              <span>Por que estes dados são necessários?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O nome e e-mail são utilizados para assinar Ordens de Serviço (OS), gerar relatórios em PDF, cadastrar clientes e enviar lembretes personalizados de WhatsApp.
            </p>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Nome Completo *
            </label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Carlos Alberto da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition text-xs font-sans"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              E-mail Principal *
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="Ex: carlos.refrigeracao@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition text-xs font-sans"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Salvando no banco...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  <span>Salvar e Atualizar Dados no Banco</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

export default ProfileUpdateModal;
