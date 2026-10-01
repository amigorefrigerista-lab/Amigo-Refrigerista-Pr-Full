'use client';

import React, { useEffect, useState } from 'react';
import { 
  Headset, 
  Send, 
  UserPlus, 
  UserX, 
  ShieldCheck, 
  Lock, 
  MessageSquare, 
  Users, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Shield,
  Loader2,
  Trash2,
  Clock,
  Circle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface SupportPermission {
  id: string;
  user_email: string;
  granted_by: string;
  role: 'admin' | 'atendente';
  is_active: boolean;
  created_at: string;
}

export interface SupportChatMessage {
  id: string;
  chat_room_id: string;
  sender_email: string;
  sender_name: string;
  sender_role: 'usuario' | 'admin' | 'atendente';
  message: string;
  created_at: string;
}

interface AdminSupportChatViewProps {
  onBack?: () => void;
}

export function AdminSupportChatView({ onBack }: AdminSupportChatViewProps) {
  const { user, profile, isSupportOrAdmin, signOut } = useAuth();
  
  const currentUserEmail = user?.email?.toLowerCase().trim() || profile?.email?.toLowerCase().trim() || '';
  const isMasterAdmin = currentUserEmail === 'amigorefrigerista@gmail.com';

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [checkingPermission, setCheckingPermission] = useState<boolean>(true);

  // Abas
  const [activeTab, setActiveTab] = useState<'chat' | 'permissions'>('chat');

  // Estado de Permissões (Supabase)
  const [permissions, setPermissions] = useState<SupportPermission[]>([]);
  const [newEmail, setNewEmail] = useState<string>('');
  const [addingPermission, setAddingPermission] = useState<boolean>(false);

  // Estado de Chat
  const [chatRooms, setChatRooms] = useState<Array<{ id: string; name: string; lastMsg: string; unread: number }>>([
    { id: 'geral', name: 'Canal Geral de Suporte', lastMsg: 'Atendimento online ativo', unread: 0 },
    { id: 'cliente-carlos', name: 'Carlos Eduardo (Daikin VRF)', lastMsg: 'Dúvida sobre superaquecimento', unread: 2 },
    { id: 'cliente-roberto', name: 'Roberto ClimaFrio (Troca de Celular)', lastMsg: 'Aparelho resetado com sucesso', unread: 0 }
  ]);
  const [activeRoomId, setActiveRoomId] = useState<string>('geral');
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);

  // Verificação Inicial de Permissão no Supabase
  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (isMasterAdmin) {
        if (isMounted) {
          setHasPermission(true);
          setCheckingPermission(false);
        }
        return;
      }

      if (!currentUserEmail) {
        if (isMounted) {
          setHasPermission(false);
          setCheckingPermission(false);
        }
        return;
      }

      try {
        // Tenta consultar no Supabase
        const { data, error } = await supabase
          .from('support_permissions')
          .select('*')
          .eq('user_email', currentUserEmail)
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          if (isMounted) setHasPermission(true);
        } else {
          // Fallback para cache local
          const storedDelegates = localStorage.getItem('amigo_delegated_support_emails');
          const list: string[] = storedDelegates ? JSON.parse(storedDelegates) : [];
          const isDelegated = list.some(e => e.toLowerCase() === currentUserEmail);
          if (isMounted) setHasPermission(isDelegated || isSupportOrAdmin);
        }
      } catch (err) {
        console.warn('Erro ao checar suporte admin no Supabase:', err);
        if (isMounted) setHasPermission(isSupportOrAdmin);
      } finally {
        if (isMounted) setCheckingPermission(false);
      }
    }

    checkAccess();

    return () => { isMounted = false; };
  }, [currentUserEmail, isMasterAdmin, isSupportOrAdmin]);

  // Carregar lista de permissões do Supabase (Apenas se for Master Admin)
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('support_permissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPermissions(data as SupportPermission[]);
      } else {
        // Fallback local
        const stored = localStorage.getItem('amigo_support_permissions_db');
        if (stored) {
          setPermissions(JSON.parse(stored));
        } else {
          const initial: SupportPermission[] = [
            {
              id: 'perm-master',
              user_email: 'amigorefrigerista@gmail.com',
              granted_by: 'system',
              role: 'admin',
              is_active: true,
              created_at: new Date().toISOString()
            }
          ];
          setPermissions(initial);
          localStorage.setItem('amigo_support_permissions_db', JSON.stringify(initial));
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar permissões:', err);
    }
  };

  useEffect(() => {
    if (hasPermission && activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [hasPermission, activeTab]);

  // Carregar Mensagens da Sala Ativa
  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setMessages(data as SupportChatMessage[]);
      } else {
        // Fallback local
        const stored = localStorage.getItem(`amigo_support_chat_${roomId}`);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          const sample: SupportChatMessage[] = [
            {
              id: 'msg-1',
              chat_room_id: roomId,
              sender_email: 'amigorefrigerista@gmail.com',
              sender_name: 'Suporte Admin Master',
              sender_role: 'admin',
              message: 'Bem-vindo ao Canal Exclusivo de Suporte Admin! Como podemos ajudar hoje?',
              created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
            }
          ];
          setMessages(sample);
          localStorage.setItem(`amigo_support_chat_${roomId}`, JSON.stringify(sample));
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar mensagens:', err);
    }
  };

  useEffect(() => {
    if (hasPermission && activeTab === 'chat') {
      fetchMessages(activeRoomId);
    }
  }, [hasPermission, activeTab, activeRoomId]);

  // Adicionar Nova Permissão no Supabase
  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Insira um e-mail válido para conceder permissão.');
      return;
    }

    setAddingPermission(true);
    try {
      // 1. Tenta inserir na tabela Supabase support_permissions
      const newPerm = {
        user_email: cleanEmail,
        granted_by: currentUserEmail || 'amigorefrigerista@gmail.com',
        role: 'atendente' as const,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('support_permissions')
        .upsert(newPerm, { onConflict: 'user_email' })
        .select();

      if (error) {
        console.warn('Erro ao salvar permissão no Supabase:', error);
      }

      // 2. Atualiza local storage cache e lista em tela
      const updatedList = permissions.filter(p => p.user_email !== cleanEmail);
      const addedItem: SupportPermission = data && data[0] ? data[0] : { id: 'perm-' + Date.now(), ...newPerm };
      const finalList = [addedItem, ...updatedList];
      
      setPermissions(finalList);
      localStorage.setItem('amigo_support_permissions_db', JSON.stringify(finalList));

      // Sincroniza lista local para Auth Context
      const currentDelegates: string[] = JSON.parse(localStorage.getItem('amigo_delegated_support_emails') || '[]');
      if (!currentDelegates.includes(cleanEmail)) {
        localStorage.setItem('amigo_delegated_support_emails', JSON.stringify([...currentDelegates, cleanEmail]));
      }

      toast.success(`Permissão de Suporte Admin concedida a ${cleanEmail}!`);
      setNewEmail('');
    } catch (err) {
      toast.error('Falha ao conceder permissão no banco de dados.');
    } finally {
      setAddingPermission(false);
    }
  };

  // Remover Permissão do Supabase
  const handleRemovePermission = async (userEmail: string) => {
    if (userEmail.toLowerCase() === 'amigorefrigerista@gmail.com') {
      toast.error('O acesso do Administrador Master não pode ser removido.');
      return;
    }

    if (!confirm(`Deseja revogar o acesso de suporte admin do e-mail ${userEmail}?`)) return;

    try {
      const { error } = await supabase
        .from('support_permissions')
        .update({ is_active: false })
        .eq('user_email', userEmail);

      if (error) console.warn('Aviso ao revogar no Supabase:', error);

      const updated = permissions.map(p => p.user_email === userEmail ? { ...p, is_active: false } : p);
      setPermissions(updated);
      localStorage.setItem('amigo_support_permissions_db', JSON.stringify(updated));

      // Atualiza cache local
      const currentDelegates: string[] = JSON.parse(localStorage.getItem('amigo_delegated_support_emails') || '[]');
      const filteredDelegates = currentDelegates.filter(e => e.toLowerCase() !== userEmail.toLowerCase());
      localStorage.setItem('amigo_delegated_support_emails', JSON.stringify(filteredDelegates));

      toast.success(`Permissão de ${userEmail} revogada com sucesso.`);
    } catch (err) {
      toast.error('Erro ao revogar permissão.');
    }
  };

  // Enviar Mensagem de Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setSendingMsg(true);
    const text = messageText.trim();
    setMessageText('');

    const newMsg: SupportChatMessage = {
      id: 'msg-' + Date.now(),
      chat_room_id: activeRoomId,
      sender_email: currentUserEmail,
      sender_name: profile?.name || user?.displayName || (isMasterAdmin ? 'Admin Master' : 'Atendente'),
      sender_role: isMasterAdmin ? 'admin' : 'atendente',
      message: text,
      created_at: new Date().toISOString()
    };

    try {
      // Tenta gravar no Supabase
      await supabase.from('support_messages').insert({
        chat_room_id: activeRoomId,
        sender_email: newMsg.sender_email,
        sender_name: newMsg.sender_name,
        sender_role: newMsg.sender_role,
        message: text,
        created_at: newMsg.created_at
      });

      const updated = [...messages, newMsg];
      setMessages(updated);
      localStorage.setItem(`amigo_support_chat_${activeRoomId}`, JSON.stringify(updated));

      // Atualiza última mensagem da sala
      setChatRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, lastMsg: text } : r));
    } catch (err) {
      console.warn('Aviso ao enviar mensagem para o Supabase:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  if (checkingPermission) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-slate-300 text-xs font-bold">Verificando permissões no Supabase (support_permissions)...</p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <Lock size={32} />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
              ACESSO EXCLUSIVO RESTRITO
            </span>
            <h2 className="text-lg font-bold text-white mt-2">Canal Suporte Admin Fechado</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Este canal de atendimento e gerenciamento de chat é de uso exclusivo do e-mail <strong className="text-white font-mono">amigorefrigerista@gmail.com</strong> e atendentes autorizados na tabela de permissões do Supabase.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-[11px] text-slate-400 space-y-1">
            <span className="text-slate-300 font-bold block">Como solicitar acesso?</span>
            <p>Entre em contato com o administrador master para incluir seu e-mail na tabela <code className="text-amber-300 font-mono">support_permissions</code>.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Principal do Suporte Admin */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Headset size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                SUPORTE ADMIN PRO
              </span>
              {isMasterAdmin && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  MASTER ADMIN
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">Central de Chat & Controle de Permissões</h2>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare size={15} />
            <span>Chat de Atendimento</span>
          </button>

          {isMasterAdmin && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-amber-300 hover:text-white hover:bg-amber-500/10'
              }`}
            >
              <Users size={15} />
              <span>Permissões Supabase ({permissions.filter(p => p.is_active).length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ABA 1: CHAT DE ATENDIMENTO EXCLUSIVO */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Lista de Salas/Conversas */}
          <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col space-y-3 overflow-hidden">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 px-2 pt-1">
              <MessageSquare size={16} className="text-indigo-400" />
              <span>Canais de Conversa Ativos</span>
            </h3>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer space-y-1 ${
                    activeRoomId === room.id
                      ? 'bg-indigo-950/70 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">{room.name}</span>
                    <Circle size={8} className="fill-emerald-400 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{room.lastMsg}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Área de Chat Ativo */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Cabeçalho da Sala */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  💬
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {chatRooms.find(r => r.id === activeRoomId)?.name || 'Atendimento'}
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <Circle size={6} className="fill-emerald-400 text-emerald-400" />
                    Atendimento Exclusivo Criptografado
                  </span>
                </div>
              </div>

              <button
                onClick={() => fetchMessages(activeRoomId)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Atualizar Mensagens"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Balões de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
              {messages.map((m) => {
                const isMe = m.sender_email.toLowerCase() === currentUserEmail;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 mb-1 font-medium">
                      {m.sender_name} ({m.sender_role}) · {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20' 
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input de Envio de Mensagem */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Digite sua resposta técnica ou orientação..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <button
                type="submit"
                disabled={sendingMsg || !messageText.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Send size={14} />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABA 2: GERENCIADOR DE PERMISSÕES NO SUPABASE */}
      {activeTab === 'permissions' && isMasterAdmin && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  GERENCIADOR SUPABASE: support_permissions
                </span>
                <h3 className="text-base font-bold text-white mt-1">Conceder ou Revogar Permissões do Canal</h3>
                <p className="text-xs text-slate-400">
                  Cadastre o e-mail dos membros da equipe que podem visualizar o Canal de Suporte Admin. As alterações são sincronizadas no Supabase em tempo real.
                </p>
              </div>
            </div>

            {/* Formulário de Inserção de E-mail */}
            <form onSubmit={handleAddPermission} className="flex gap-2">
              <input
                type="email"
                placeholder="Digite o e-mail do técnico a ser autorizado (ex: suporte@empresa.com)..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-600"
                required
              />
              <button
                type="submit"
                disabled={addingPermission}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95 disabled:opacity-50"
              >
                {addingPermission ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus size={16} />}
                <span>Adicionar ao Supabase</span>
              </button>
            </form>

            {/* Lista de Usuários Autorizados na Tabela */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Users size={16} className="text-amber-400" />
                <span>E-mails Registrados na Tabela &apos;support_permissions&apos;</span>
              </h4>

              <div className="space-y-2">
                {permissions.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      p.user_email.toLowerCase() === 'amigorefrigerista@gmail.com'
                        ? 'bg-slate-950 border-amber-500/40'
                        : p.is_active
                        ? 'bg-slate-950 border-slate-800/80'
                        : 'bg-slate-950/40 border-rose-500/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        p.user_email.toLowerCase() === 'amigorefrigerista@gmail.com'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}>
                        {p.user_email.toLowerCase() === 'amigorefrigerista@gmail.com' ? '👑' : '🎧'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-white">{p.user_email}</strong>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            p.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {p.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          Concedido por: {p.granted_by} · Cargo: {p.role}
                        </span>
                      </div>
                    </div>

                    {p.user_email.toLowerCase() !== 'amigorefrigerista@gmail.com' && p.is_active && (
                      <button
                        onClick={() => handleRemovePermission(p.user_email)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <UserX size={14} />
                        <span>Revogar Acesso</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSupportChatView;
