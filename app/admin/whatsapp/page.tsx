'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MessageSquare, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone, 
  Zap, 
  Key, 
  Globe, 
  Send, 
  Sparkles, 
  Copy, 
  HelpCircle,
  Loader2,
  Check,
  Power,
  ShieldCheck
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface WhatsAppSettingsForm {
  api_provider: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  phone_number: string;
  is_active: boolean;
  template_orcamento: string;
  template_agendamento: string;
  template_lembrete: string;
  template_pos_venda: string;
}

const DEFAULT_FORM: WhatsAppSettingsForm = {
  api_provider: 'evolution_api',
  api_url: '',
  api_key: '',
  instance_name: '',
  phone_number: '',
  is_active: true,
  template_orcamento: 'Olá {{nome}}! Segue o seu orçamento para {{servico}} no valor de R$ {{valor}}. Acesse a proposta completa no link!',
  template_agendamento: 'Olá {{nome}}! Confirmamos o agendamento do serviço de {{servico}} para a data {{data}}. Qualquer dúvida, fale conosco!',
  template_lembrete: 'Olá {{nome}}! Passando para lembrar que está no prazo para a manutenção preventiva de {{servico}}. Vamos agendar para {{data}}?',
  template_pos_venda: 'Olá {{nome}}! Como está o funcionamento do seu equipamento após o serviço de {{servico}}? Agradecemos a preferência!'
};

export default function AdminWhatsAppConfigPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    instance?: string;
    message: string;
    phone?: string;
    provider?: string;
    timestamp?: string;
  } | null>(null);
  const [message, setMessage] = useState<string>('');

  const [form, setForm] = useState<WhatsAppSettingsForm>(DEFAULT_FORM);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);

      // 1. Tenta carregar do Supabase
      try {
        if (isSupabaseConfigured) {
          const { data: { user: sbUser } } = await supabase.auth.getUser();
          if (sbUser) {
            const { data, error } = await supabase
              .from('whatsapp_settings')
              .select('*')
              .eq('user_id', sbUser.id)
              .single();

            if (data && !error) {
              setForm({
                api_provider: data.api_provider || 'evolution_api',
                api_url: data.api_url || '',
                api_key: data.api_key || '',
                instance_name: data.instance_name || '',
                phone_number: data.phone_number || '',
                is_active: data.is_active ?? true,
                template_orcamento: data.template_orcamento || DEFAULT_FORM.template_orcamento,
                template_agendamento: data.template_agendamento || DEFAULT_FORM.template_agendamento,
                template_lembrete: data.template_lembrete || DEFAULT_FORM.template_lembrete,
                template_pos_venda: data.template_pos_venda || DEFAULT_FORM.template_pos_venda,
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Aviso ao carregar do Supabase:', err);
      }

      // 2. Fallback localStorage
      try {
        const saved = localStorage.getItem('amigo_whatsapp_settings');
        if (saved) {
          setForm({ ...DEFAULT_FORM, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.warn('Erro ao carregar do localStorage:', e);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    // Salva localmente
    try {
      localStorage.setItem('amigo_whatsapp_settings', JSON.stringify(form));
    } catch (e) {
      console.warn('Erro ao salvar localmente:', e);
    }

    // Tenta salvar no Supabase
    try {
      if (isSupabaseConfigured) {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          const { error } = await supabase
            .from('whatsapp_settings')
            .upsert({
              user_id: sbUser.id,
              ...form,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (error) {
            setMessage('Erro ao salvar as configurações: ' + error.message);
            toast.error('Erro ao salvar no Supabase: ' + error.message);
            setSaving(false);
            return;
          }
        }
      }

      setMessage('Configurações salvas com sucesso!');
      toast.success('Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro na gravação:', err);
      setMessage('Erro ao salvar as configurações: ' + err.message);
      toast.error('Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast.success(`Teste concluído! Instância '${data.instance}' está ${data.status}`);
      } else {
        toast.error('Erro no teste de conexão: ' + data.message);
      }
    } catch (err: any) {
      console.error('Erro ao testar conexão:', err);
      toast.error('Falha ao conectar com o serviço de teste.');
    } finally {
      setTesting(false);
    }
  };

  const insertVariable = (fieldKey: keyof WhatsAppSettingsForm, variable: string) => {
    setForm((prev) => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] as string) + ' ' + variable
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070e1c] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 p-4 sm:p-8 space-y-6">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                PAINEL ADMIN WHATSAPP
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">Configuração WhatsApp & Disparo Automático</h1>
          </div>
        </div>

        <Link
          href="/admin"
          className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center gap-1.5"
        >
          <ShieldCheck size={16} />
          <span>Voltar ao Admin</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner de Mensagem de Retorno */}
        {message && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            message.includes('sucesso') 
              ? 'bg-green-500/15 border-green-500/40 text-green-300' 
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}>
            <span>{message}</span>
            <CheckCircle2 size={18} />
          </div>
        )}

        {/* Guia de Variáveis Dinâmicas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-green-400">
            <Sparkles size={18} />
            <h2 className="text-sm font-black text-white">Modelos de Mensagem para Clientes</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use variáveis como <code className="text-green-300 font-mono font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/30">{'{{nome}}'}</code>, <code className="text-green-300 font-mono font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/30">{'{{servico}}'}</code>, <code className="text-green-300 font-mono font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/30">{'{{valor}}'}</code> e <code className="text-green-300 font-mono font-bold bg-green-950/80 px-1.5 py-0.5 rounded border border-green-500/30">{'{{data}}'}</code> que serão substituídas automaticamente pelo sistema no momento do envio.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {['{{nome}}', '{{servico}}', '{{valor}}', '{{data}}'].map((v) => (
              <span key={v} className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-green-300 font-bold">
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Configurações da API de Envio */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Zap size={16} className="text-green-400" />
              <span>Dados do Gateway & Provedor WhatsApp</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Provedor de API:</label>
                <select
                  value={form.api_provider}
                  onChange={(e) => setForm({ ...form, api_provider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                >
                  <option value="evolution_api">Evolution API (Recomendado)</option>
                  <option value="z_api">Z-API WhatsApp</option>
                  <option value="baileys">WPPConnect / Baileys Node</option>
                  <option value="meta_cloud">WhatsApp Cloud API (Meta)</option>
                  <option value="web_whatsapp">Link Direto (WhatsApp Web)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Instância:</label>
                <input
                  type="text"
                  placeholder="Ex: Instancia_01"
                  value={form.instance_name || ''}
                  onChange={(e) => setForm({ ...form, instance_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Base da API (Endpoint):</label>
                <input
                  type="url"
                  placeholder="https://api.seu-servidor.com"
                  value={form.api_url || ''}
                  onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Chave da API (API Key):</label>
                <input
                  type="password"
                  placeholder="Sua API Key secreta"
                  value={form.api_key || ''}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Botão de Testar Conexão e Resultado */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-green-300 border border-green-500/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                    <span>Testando Conexão com a Instância...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} className="text-green-400" />
                    <span>Testar Conexão da Instância</span>
                  </>
                )}
              </button>

              {testResult && (
                <div className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                  testResult.success
                    ? 'bg-green-500/15 border-green-500/40 text-green-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    testResult.success ? 'bg-green-400 animate-pulse' : 'bg-rose-400'
                  }`} />
                  <div>
                    <span className="block text-[11px] font-mono uppercase">
                      Status: {testResult.status} · {testResult.instance}
                    </span>
                    <span className="text-[10px] opacity-90 font-normal">
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modelos de Mensagem */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            {/* 1. Envio de Orçamento */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">Envio de Orçamento</label>
                <div className="flex gap-1">
                  {['{{nome}}', '{{servico}}', '{{valor}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable('template_orcamento', v)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-green-300 hover:border-green-500/50 cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={form.template_orcamento || ''}
                onChange={(e) => setForm({ ...form, template_orcamento: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500 resize-none font-sans"
              />
            </div>

            {/* 2. Confirmação de Agendamento */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">Confirmação de Agendamento</label>
                <div className="flex gap-1">
                  {['{{nome}}', '{{servico}}', '{{data}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable('template_agendamento', v)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-green-300 hover:border-green-500/50 cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={form.template_agendamento || ''}
                onChange={(e) => setForm({ ...form, template_agendamento: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500 resize-none font-sans"
              />
            </div>

            {/* 3. Lembrete de Manutenção */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">Lembrete de Manutenção</label>
                <div className="flex gap-1">
                  {['{{nome}}', '{{servico}}', '{{data}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable('template_lembrete', v)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-green-300 hover:border-green-500/50 cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={form.template_lembrete || ''}
                onChange={(e) => setForm({ ...form, template_lembrete: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500 resize-none font-sans"
              />
            </div>

            {/* 4. Pós-Venda / Pesquisa de Satisfação */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">Pós-Venda / Pesquisa de Satisfação</label>
                <div className="flex gap-1">
                  {['{{nome}}', '{{servico}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable('template_pos_venda', v)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-green-300 hover:border-green-500/50 cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={form.template_pos_venda || ''}
                onChange={(e) => setForm({ ...form, template_pos_venda: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-green-500 resize-none font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-500 text-slate-950 font-black py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/20 active:scale-98 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Salvar Configurações do WhatsApp</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
