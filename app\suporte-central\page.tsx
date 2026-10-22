'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  Headset, 
  Search, 
  UserCheck, 
  Smartphone, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Crown, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Lock, 
  Loader2, 
  AlertTriangle,
  History,
  Trash2,
  Sparkles,
  UserPlus,
  UserX,
  MessageSquare,
  Clock,
  Send,
  ExternalLink,
  Check
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import { SupportTicketItem } from '@/components/ClientSupportModal';

interface SubscriberUser {
  uid: string;
  email: string | null;
  name?: string;
  role?: 'admin' | 'support' | 'user';
  subscription?: {
    plan: 'free' | 'flex' | 'pro';
    status: 'active' | 'cancelled' | 'past_due';
    updatedAt?: string;
  };
  lastActiveDevice?: string;
  lastLoginAt?: string;
  deviceInfo?: {
    deviceId: string;
    userAgent: string;
    platform: string;
    lastLogin: string;
  };
}

export default function CentralSuportePage() {
  const router = useRouter();
  const { 
    user: authUser, 
    profile, 
    isSupportOrAdmin, 
    isAdmin, 
    role, 
    delegatedEmails, 
    addDelegatedEmail, 
    removeDelegatedEmail,
    signOut: authSignOut 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'tickets' | 'subscribers' | 'delegation'>('tickets');
  
  // Estados de Chamados
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'todos' | 'pendente' | 'em_atendimento' | 'resolvido'>('todos');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [replyText, setReplyText] = useState('');

  // Estados de Busca de Assinante
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<SubscriberUser | null>(null);
  const [updating, setUpdating] = useState(false);

  // Estados de Delegação de Atendentes
  const [newDelegateEmail, setNewDelegateEmail] = useState('');
  const [addingDelegate, setAddingDelegate] = useState(false);

  const isMasterAdmin = (authUser?.email?.toLowerCase().trim() === 'amigorefrigerista@gmail.com') || (profile?.email?.toLowerCase().trim() === 'amigorefrigerista@gmail.com');

  // Carrega chamados do suporte
  useEffect(() => {
    try {
      const stored = localStorage.getItem('amigo_support_tickets');
      if (stored) {
        setTickets(JSON.parse(stored));
      } else {
        // Exemplo inicial de chamados
        const sampleTickets: SupportTicketItem[] = [
          {
            id: 'TICK-102938',
            userName: 'Carlos Eduardo Oliveira',
            userEmail: 'carlos.hvac@gmail.com',
            userPhone: '(11) 98765-4321',
            category: 'HVAC_TECNICO',
            subject: 'Dúvida sobre Superaquecimento e Subresfriamento',
            message: 'Estou testando uma VRF Daikin e gostaria de saber o valor ideal de superaquecimento em ciclo leve.',
            status: 'pendente',
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            replies: []
          },
          {
            id: 'TICK-102937',
            userName: 'Roberto ClimaFrio',
            userEmail: 'roberto@climafrio.com.br',
            userPhone: '(21) 99887-6655',
            category: 'DISPOSITIVO',
            subject: 'Troca de Aparelho Ativo',
            message: 'Troquei de smartphone recentemente e preciso resetar a chave do meu dispositivo ativo.',
            status: 'em_atendimento',
            createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            replies: [{ sender: 'Suporte Amigo Refrigerista', text: 'Olá Roberto! Seu aparelho foi redefinido com sucesso.', date: new Date().toISOString() }]
          }
        ];
        setTickets(sampleTickets);
        localStorage.setItem('amigo_support_tickets', JSON.stringify(sampleTickets));
      }
    } catch (e) {
      console.warn('Erro ao carregar chamados:', e);
    }
  }, []);

  // Salva alterações de chamados
  const updateTicketInStorage = (updatedList: SupportTicketItem[]) => {
    setTickets(updatedList);
    try {
      localStorage.setItem('amigo_support_tickets', JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Erro ao salvar chamados:', e);
    }
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: 'pendente' | 'em_atendimento' | 'resolvido') => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t);
    updateTicketInStorage(updated);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
    toast.success(`Status do chamado atualizado para ${newStatus.replace('_', ' ').toUpperCase()}`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const newReply = {
      sender: isMasterAdmin ? 'Admin Master' : 'Atendente de Suporte',
      text: replyText.trim(),
      date: new Date().toISOString()
    };

    const updatedList = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        const replies = t.replies ? [...t.replies, newReply] : [newReply];
        return { ...t, status: 'em_atendimento' as const, replies };
      }
      return t;
    });

    updateTicketInStorage(updatedList);
    setSelectedTicket(prev => prev ? { 
      ...prev, 
      status: 'em_atendimento', 
      replies: prev.replies ? [...prev.replies, newReply] : [newReply] 
    } : null);

    setReplyText('');
    toast.success('Resposta registrada e enviada ao chamado!');
  };

  // Adicionar Atendente Delegado
  const handleAddDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelegateEmail.trim() || !newDelegateEmail.includes('@')) {
      toast.error('Informe um e-mail válido para autorizar como atendente.');
      return;
    }

    setAddingDelegate(true);
    try {
      const ok = await addDelegatedEmail(newDelegateEmail.trim());
      if (ok) {
        toast.success(`Acesso de Suporte concedido a ${newDelegateEmail.trim()}!`);
        setNewDelegateEmail('');
      } else {
        toast.error('Este e-mail já possui permissão de suporte.');
      }
    } catch (err) {
      toast.error('Erro ao conceder acesso ao atendente.');
    } finally {
      setAddingDelegate(false);
    }
  };

  const handleRemoveDelegate = async (email: string) => {
    if (!confirm(`Deseja remover a permissão de atendimento do e-mail ${email}?`)) return;
    try {
      await removeDelegatedEmail(email);
      toast.success(`Acesso de Suporte revogado para ${email}.`);
    } catch (err) {
      toast.error('Erro ao revogar acesso.');
    }
  };

  // Buscar Assinante no Supabase
  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Digite um e-mail ou ID de usuário');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const term = searchTerm.trim();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${term},email.ilike.%${term}%,nome.ilike.%${term}%`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const p = data[0];
        setFoundUser({
          uid: p.id,
          email: p.email,
          name: p.nome,
          role: p.role,
          subscription: {
            plan: p.plano || 'free',
            status: 'active',
            updatedAt: p.updated_at
          },
          lastActiveDevice: p.last_active_device,
          lastLoginAt: p.last_login_at,
          deviceInfo: p.device_info
        });
        toast.success('Assinante localizado!');
      } else {
        toast.error('Nenhum usuário localizado com este termo.');
      }
    } catch (err: any) {
      console.error('Erro na busca de assinante:', err);
      toast.error('Falha ao buscar no banco de dados.');
    } finally {
      setSearching(false);
    }
  };

  const handleResetDevice = async () => {
    if (!foundUser) return;
    if (!confirm(`Deseja desvincular o aparelho de ${foundUser.name || foundUser.email}?`)) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_active_device: null,
          device_info: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.uid);

      if (error) throw error;

      setFoundUser(prev => prev ? { ...prev, lastActiveDevice: undefined, deviceInfo: undefined } : null);
      toast.success('Aparelho desvinculado com sucesso! Acesso liberado no próximo login.');
    } catch (err: any) {
      console.error('Erro ao resetar aparelho:', err);
      toast.error('Falha ao desvincular aparelho.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePlan = async (newPlan: 'free' | 'flex' | 'pro') => {
    if (!foundUser) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plano: newPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundUser.uid);

      if (error) throw error;

      setFoundUser(prev => prev ? {
        ...prev,
        subscription: { plan: newPlan, status: 'active', updatedAt: new Date().toISOString() }
      } : null);

      toast.success(`Plano alterado para ${newPlan.toUpperCase()} com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao mudar plano:', err);
      toast.error('Falha ao atualizar plano.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === 'todos') return true;
    return t.status === ticketFilter;
  });

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8 space-y-6">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Cabeçalho */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                CANAL DE SUPORTE AO CLIENTE
              </span>
              {isMasterAdmin && (
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  MASTER ADMIN
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">Central de Atendimento & Suporte</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center gap-1.5"
          >
            <ShieldCheck size={16} />
            <span>Painel Admin</span>
          </Link>

          <button
            onClick={async () => {
              await authSignOut();
              router.push('/');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navegação de Abas */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare size={16} />
            <span>Chamados dos Clientes ({tickets.filter(t => t.status === 'pendente').length} Pendentes)</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Search size={16} />
            <span>Localizar Assinante & Aparelho</span>
          </button>

          {isMasterAdmin && (
            <button
              onClick={() => setActiveTab('delegation')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'delegation'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-amber-300 hover:text-white hover:bg-amber-500/10'
              }`}
            >
              <UserPlus size={16} />
              <span>Delegação de Atendentes ({delegatedEmails.length})</span>
            </button>
          )}
        </div>

        {/* ABA 1: CHAMADOS DE CLIENTES */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna Esquerda: Lista de Chamados */}
            <div className="md:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Headset size={16} className="text-indigo-400" />
                  <span>Fila de Atendimento</span>
                </h3>

                <select
                  value={ticketFilter}
                  onChange={(e: any) => setTicketFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-2.5 py-1 text-slate-300 focus:outline-none"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="resolvido">Resolvidos</option>
                </select>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredTickets.length === 0 ? (
                  <div className="p-6 text-center bg-slate-900/60 rounded-2xl border border-slate-800/80 text-slate-500 text-xs">
                    Nenhum chamado encontrado.
                  </div>
                ) : (
                  filteredTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        selectedTicket?.id === t.id
                          ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-300">{t.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          t.status === 'resolvido'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : t.status === 'em_atendimento'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white truncate">{t.subject}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{t.userName} ({t.userEmail})</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Coluna Direita: Painel de Resposta ao Chamado */}
            <div className="md:col-span-2">
              {!selectedTicket ? (
                <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                  <MessageSquare size={36} className="text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-300">Selecione um chamado ao lado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Escolha qualquer chamado de cliente na fila para visualizar a mensagem completa e responder ao técnico.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
                        <span className="text-[10px] font-mono text-indigo-400">{selectedTicket.id}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Por: <strong className="text-white">{selectedTicket.userName}</strong> ({selectedTicket.userEmail}) · WhatsApp: {selectedTicket.userPhone || 'Não informado'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedTicket.userPhone && (
                        <a
                          href={`https://wa.me/55${selectedTicket.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Olá ${selectedTicket.userName}! Estou entrando em contato referente ao seu chamado #${selectedTicket.id} no Amigo Refrigerista Pro.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Send size={14} />
                          <span>WhatsApp Direct</span>
                        </a>
                      )}

                      <select
                        value={selectedTicket.status}
                        onChange={(e: any) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                        className="bg-slate-950 border border-indigo-500/40 text-xs font-bold text-white rounded-xl px-3 py-1.5 focus:outline-none"
                      >
                        <option value="pendente">Status: Pendente</option>
                        <option value="em_atendimento">Status: Em Atendimento</option>
                        <option value="resolvido">Status: Resolvido</option>
                      </select>
                    </div>
                  </div>

                  {/* Mensagem Original */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Descrição do Técnico:</span>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                    <span className="text-[10px] text-slate-500 block pt-1">
                      Aberto em: {new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Histórico de Respostas */}
                  {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block">Histórico de Atendimento:</span>
                      {selectedTicket.replies.map((r, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <strong className="text-indigo-300">{r.sender}</strong>
                            <span className="text-slate-500">{new Date(r.date).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-xs text-slate-300">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campo de Resposta Oficial */}
                  <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-300 block">Sua Resposta Oficial de Suporte:</label>
                    <textarea
                      rows={3}
                      placeholder="Digite a solução ou resposta técnica para enviar ao cliente..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                      >
                        <Send size={14} />
                        <span>Enviar Resposta & Atualizar</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: LOCALIZAR ASSINANTE */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Search size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Buscar e Liberar Assinante</h3>
                  <p className="text-xs text-slate-400">Localize o cadastro do técnico para autorizar novo celular ou modificar o plano</p>
                </div>
              </div>

              <form onSubmit={handleSearchUser} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o e-mail, nome ou ID do assinante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search size={16} />}
                  <span>Pesquisar</span>
                </button>
              </form>
            </div>

            {foundUser && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{foundUser.name || 'Técnico Assinante'}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        Plano: {foundUser.subscription?.plan || 'free'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{foundUser.email} · ID: {foundUser.uid}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDevice}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>Resetar Aparelho</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <span>Gerenciamento de Dispositivo</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Dispositivo Ativo ID: <strong className="text-white font-mono">{foundUser.lastActiveDevice || 'Nenhum registrado'}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Último login: {foundUser.lastLoginAt ? new Date(foundUser.lastLoginAt).toLocaleString('pt-BR') : 'Desconhecido'}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Alteração Manual de Plano</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      {(['free', 'flex', 'pro'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleChangePlan(p)}
                          disabled={updating || foundUser.subscription?.plan === p}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            foundUser.subscription?.plan === p
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: DELEGAÇÃO DE ATENDENTES (Apenas Master Admin) */}
        {activeTab === 'delegation' && isMasterAdmin && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                  <UserPlus size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      EXCLUSIVO MASTER ADMIN
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">Delegar Acesso à Equipe de Suporte</h3>
                  <p className="text-xs text-slate-400">
                    O usuário <strong className="text-white font-mono">amigorefrigerista@gmail.com</strong> pode autorizar novos e-mails para atender chamados e gerenciar assinantes.
                  </p>
                </div>
              </div>

              {/* Formulário de Adicionar Atendente */}
              <form onSubmit={handleAddDelegate} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Digite o e-mail do novo atendente de suporte (ex: suporte@empresa.com)..."
                  value={newDelegateEmail}
                  onChange={(e) => setNewDelegateEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
                  required
                />
                <button
                  type="submit"
                  disabled={addingDelegate}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  <span>Autorizar Atendente</span>
                </button>
              </form>

              {/* Lista de Atendentes Autorizados */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-400" />
                  <span>Equipe de Suporte Autorizada ({delegatedEmails.length + 1})</span>
                </h4>

                <div className="space-y-2">
                  {/* Item Master Admin Fixado */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                        👑
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-white block">amigorefrigerista@gmail.com</strong>
                        <span className="text-[10px] text-amber-400 font-medium">Administrador Master (Acesso Total Perfeito)</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 uppercase">
                      Inviolável
                    </span>
                  </div>

                  {/* Itens Delegados */}
                  {delegatedEmails.map((email) => (
                    <div key={email} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          🎧
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-white block">{email}</strong>
                          <span className="text-[10px] text-indigo-300 font-medium">Atendente de Suporte Delegado</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveDelegate(email)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX size={14} />
                        <span>Revogar Acesso</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
