'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Headset, 
  Send, 
  MessageSquare, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface SupportTicketItem {
  id: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  category: string;
  subject: string;
  message: string;
  status: 'pendente' | 'em_atendimento' | 'resolvido';
  createdAt: string;
  replies?: Array<{ sender: string; text: string; date: string }>;
}

interface ClientSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientSupportModal({ isOpen, onClose }: ClientSupportModalProps) {
  const { user, profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [category, setCategory] = useState<string>('HVAC_TECNICO');
  const [subject, setSubject] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);

  const userEmail = user?.email || profile?.email || '';
  const userName = profile?.name || user?.displayName || 'Técnico';

  // Carrega histórico de chamados
  useEffect(() => {
    if (!isOpen) return;

    if (profile?.telefone) {
      setPhone(profile.telefone);
    }

    try {
      const stored = localStorage.getItem('amigo_support_tickets');
      if (stored) {
        const parsed: SupportTicketItem[] = JSON.parse(stored);
        const myTickets = parsed.filter(t => t.userEmail?.toLowerCase() === userEmail?.toLowerCase());
        setTickets(myTickets);
      }
    } catch (e) {
      console.warn('Erro ao carregar tickets do localStorage:', e);
    }
  }, [isOpen, userEmail, profile?.telefone]);

  if (!isOpen) return null;

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Preencha o assunto e a descrição do seu problema.');
      return;
    }

    setSubmitting(true);
    try {
      const newTicket: SupportTicketItem = {
        id: 'TICK-' + Date.now().toString().slice(-6),
        userEmail,
        userName,
        userPhone: phone,
        category,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pendente',
        createdAt: new Date().toISOString(),
        replies: []
      };

      // Salva no localStorage
      const existing = localStorage.getItem('amigo_support_tickets');
      const allTickets: SupportTicketItem[] = existing ? JSON.parse(existing) : [];
      const updatedList = [newTicket, ...allTickets];
      localStorage.setItem('amigo_support_tickets', JSON.stringify(updatedList));

      // Sincroniza com Supabase se disponível
      try {
        await supabase.from('support_tickets').insert({
          user_id: user?.uid || 'guest',
          email: userEmail,
          nome: userName,
          telefone: phone,
          categoria: category,
          assunto: subject,
          mensagem: message,
          status: 'pendente',
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Aviso ao registrar chamado no Supabase:', err);
      }

      toast.success('Chamado de suporte aberto com sucesso! Nossa equipe analisará seu caso em breve.');
      setTickets(prev => [newTicket, ...prev]);
      setSubject('');
      setMessage('');
      setActiveTab('historico');
    } catch (err: any) {
      console.error('Erro ao abrir chamado:', err);
      toast.error('Falha ao enviar chamado.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá, Equipe de Suporte do Amigo Refrigerista Pro!\n\n` +
    `Nome: ${userName}\n` +
    `E-mail: ${userEmail}\n` +
    `Preciso de auxílio técnico referente à plataforma.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Headset size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ATENDIMENTO AO CLIENTE
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">Suporte Técnico Especializado</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('novo')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'novo'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Send size={14} />
            <span>Novo Chamado</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Clock size={14} />
            <span>Meus Chamados ({tickets.length})</span>
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'novo' ? (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              {/* Opção Rápida de WhatsApp */}
              <a
                href={`https://wa.me/5511999999999?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <span className="block font-bold text-white text-xs">Atendimento Direto via WhatsApp</span>
                    <span className="text-[10px] text-emerald-400">Fale com um atendente especialista em tempo real</span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <div className="relative flex items-center my-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">OU ABRA UM CHAMADO INTERNO</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Categoria do Atendimento:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="HVAC_TECNICO">HVAC-R & Dúvidas Técnicas</option>
                  <option value="ASSINATURA">Planos & Cobrança / Licença</option>
                  <option value="DISPOSITIVO">Problema no Aparelho / Troca de Celular</option>
                  <option value="OUTRO">Outras Dúvidas ou Sugestões</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Assunto Curto:</label>
                  <input
                    type="text"
                    placeholder="Ex: Erro no cálculo de carga térmica"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Telefone WhatsApp p/ Retorno:</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Descrição Detalhada:</label>
                <textarea
                  rows={4}
                  placeholder="Descreva aqui sua dúvida ou o problema que está encontrando para que nossa equipe possa ajudar..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-98 disabled:opacity-50"
              >
                <Send size={16} />
                <span>Enviar Chamado para o Suporte</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <HelpCircle size={32} className="text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Nenhum chamado aberto recentemente</p>
                  <p className="text-[11px] text-slate-500">
                    Se precisar de ajuda, clique em &apos;Novo Chamado&apos; acima.
                  </p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{t.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        t.status === 'resolvido'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : t.status === 'em_atendimento'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white">{t.subject}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{t.message}</p>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>Criado em: {new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                      <span>Cat: {t.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientSupportModal;
