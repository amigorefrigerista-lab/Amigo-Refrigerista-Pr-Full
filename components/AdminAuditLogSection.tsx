'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Key,
  Users,
  Crown,
  Sliders,
  Power,
  ArrowRight,
  Clock,
  CheckCircle2,
  Eye,
  X,
  Calendar,
  Mail,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  AdminAuditEntry,
  AuditActionCategory,
  getAdminAuditLogs,
  recordAdminAuditAction,
} from '@/lib/adminAuditService';

interface AdminAuditLogSectionProps {
  currentAdminEmail?: string;
  currentAdminName?: string;
}

const CATEGORY_LABELS: Record<AuditActionCategory | 'all', string> = {
  all: 'Todas as Categorias',
  plan_change: 'Mudança de Planos',
  license_generation: 'Geração de Licenças',
  security_config: 'Alteração de Configurações',
  license_status: 'Status de Chaves',
  vip_access: 'Acesso VIP',
};

const SEVERITY_LABELS: Record<
  AdminAuditEntry['severity'],
  { label: string; colorClass: string; dotClass: string; badgeClass: string }
> = {
  critical: {
    label: 'Crítica',
    colorClass: 'text-rose-400',
    dotClass: 'bg-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  high: {
    label: 'Alta',
    colorClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  medium: {
    label: 'Moderada',
    colorClass: 'text-sky-400',
    dotClass: 'bg-sky-400',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
};

export default function AdminAuditLogSection({
  currentAdminEmail = 'amigorefrigerista@gmail.com',
  currentAdminName = 'Administrador Master',
}: AdminAuditLogSectionProps) {
  const [logs, setLogs] = useState<AdminAuditEntry[]>([]);

  // Filtros Principais Solicitados: Categoria da Ação, E-mail do Admin e Data
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory | 'all'>('all');
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<string>('all');
  const [adminEmailSearch, setAdminEmailSearch] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [inspectedEntry, setInspectedEntry] = useState<AdminAuditEntry | null>(null);
  const [auditVerifiedBanner, setAuditVerifiedBanner] = useState<string | null>(null);

  const loadLogs = () => {
    const data = getAdminAuditLogs(100);
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
    const handleAuditUpdate = () => loadLogs();
    window.addEventListener('admin-audit-updated', handleAuditUpdate);
    return () => window.removeEventListener('admin-audit-updated', handleAuditUpdate);
  }, []);

  const uniqueAdmins = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((entry) => {
      if (!map.has(entry.adminEmail)) {
        map.set(entry.adminEmail, entry.adminName);
      }
    });
    return Array.from(map.entries());
  }, [logs]);

  // Extrai o timestamp de uma entrada de auditoria (via ISO ou formattedDate DD/MM/YYYY HH:mm)
  const parseEntryTime = (entry: AdminAuditEntry): number => {
    if (entry.timestamp) {
      const t = new Date(entry.timestamp).getTime();
      if (!Number.isNaN(t)) return t;
    }
    const [datePart] = (entry.formattedDate || '').split(' ');
    const parts = (datePart || '').split('/');
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const y = Number(parts[2]);
      return new Date(y, m, d).getTime();
    }
    return 0;
  };

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return logs.filter((entry) => {
      // 1. Filtro por Categoria da Ação
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }

      // 2. Filtro por E-mail do Admin (Seletor Exato + Busca de E-mail)
      if (selectedAdminEmail !== 'all' && entry.adminEmail.toLowerCase() !== selectedAdminEmail.toLowerCase()) {
        return false;
      }
      if (adminEmailSearch.trim()) {
        const emailQ = adminEmailSearch.toLowerCase().trim();
        if (
          !entry.adminEmail.toLowerCase().includes(emailQ) &&
          !entry.adminName.toLowerCase().includes(emailQ)
        ) {
          return false;
        }
      }

      // 3. Filtro por Data (Presets Rápidos + Intervalo Personalizado Data Inicial / Final)
      const entryTime = parseEntryTime(entry);
      if (dateRangePreset === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const entryIsoDate = entry.timestamp ? entry.timestamp.slice(0, 10) : '';
        if (entryIsoDate !== todayStr && now - entryTime > dayMs) {
          return false;
        }
      } else if (dateRangePreset === '7d') {
        if (now - entryTime > 7 * dayMs) return false;
      } else if (dateRangePreset === '30d') {
        if (now - entryTime > 30 * dayMs) return false;
      }

      if (startDate) {
        const startMs = new Date(`${startDate}T00:00:00`).getTime();
        if (!Number.isNaN(startMs) && entryTime < startMs) {
          return false;
        }
      }

      if (endDate) {
        const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
        if (!Number.isNaN(endMs) && entryTime > endMs) {
          return false;
        }
      }

      // 4. Filtro de Busca Geral (Alvo, ID, Título ou Justificativa)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          entry.actionTitle.toLowerCase().includes(q) ||
          entry.adminName.toLowerCase().includes(q) ||
          entry.adminEmail.toLowerCase().includes(q) ||
          entry.targetIdentifier.toLowerCase().includes(q) ||
          entry.details.toLowerCase().includes(q) ||
          entry.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    logs,
    selectedCategory,
    selectedAdminEmail,
    adminEmailSearch,
    dateRangePreset,
    startDate,
    endDate,
    searchQuery,
  ]);

  const summaryCounts = useMemo(() => {
    const planChanges = logs.filter((l) => l.category === 'plan_change').length;
    const licenseOps = logs.filter(
      (l) => l.category === 'license_generation' || l.category === 'license_status'
    ).length;
    const configChanges = logs.filter((l) => l.category === 'security_config').length;
    const distinctAdmins = new Set(logs.map((l) => l.adminEmail)).size;
    return { planChanges, licenseOps, configChanges, distinctAdmins };
  }, [logs]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedAdminEmail !== 'all' ||
    adminEmailSearch.trim() !== '' ||
    dateRangePreset !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedAdminEmail('all');
    setAdminEmailSearch('');
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const getCategoryIcon = (category: AuditActionCategory) => {
    switch (category) {
      case 'plan_change':
        return <Users className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'license_generation':
        return <Key className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'license_status':
        return <Power className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'vip_access':
        return <Crown className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'security_config':
        return <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'ID Auditoria',
      'Data/Hora',
      'Administrador',
      'E-mail Admin',
      'Cargo',
      'Categoria da Acao',
      'Acao Critica',
      'Alvo / Recurso',
      'Valor Anterior',
      'Novo Valor',
      'Severidade',
      'IP Origem',
      'Detalhes',
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.formattedDate,
      `"${l.adminName.replace(/"/g, '""')}"`,
      l.adminEmail,
      `"${l.adminRole.replace(/"/g, '""')}"`,
      CATEGORY_LABELS[l.category],
      `"${l.actionTitle.replace(/"/g, '""')}"`,
      `"${l.targetIdentifier.replace(/"/g, '""')}"`,
      `"${(l.previousValue || '—').replace(/"/g, '""')}"`,
      `"${(l.newValue || '—').replace(/"/g, '""')}"`,
      SEVERITY_LABELS[l.severity].label,
      l.ipAddress,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvString =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `acoes-criticas-admin-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRecordVerificationCheckpoint = () => {
    const created = recordAdminAuditAction({
      adminName: currentAdminName,
      adminEmail: currentAdminEmail,
      adminRole: 'Super Admin',
      category: 'security_config',
      actionTitle: 'Conferência de Trilha de Ações Críticas',
      targetIdentifier: 'Log de Governança & Configurações Master',
      previousValue: 'Pendente de revisão diária',
      newValue: 'Verificado e íntegro',
      details: `Revisão de conformidade executada manualmente por ${currentAdminEmail}.`,
      severity: 'medium',
    });
    setAuditVerifiedBanner(`Registro de conformidade ${created.id} gravado na trilha de auditoria.`);
    setTimeout(() => setAuditVerifiedBanner(null), 5000);
  };

  return (
    <div
      id="admin-master-critical-actions-log"
      className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl relative overflow-hidden"
    >
      {/* Cabeçalho da Seção de Auditoria de Ações Críticas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Histórico de Ações Críticas dos Administradores
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {filteredLogs.length} de {logs.length} Ações
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rastreamento centralizado de mudanças de planos, geração de licenças, alterações de configurações e acessos especiais com filtros por data, e-mail do admin e categoria.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRecordVerificationCheckpoint}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registrar Revisão</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Ações (CSV)</span>
          </button>
        </div>
      </div>

      {auditVerifiedBanner && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{auditVerifiedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuditVerifiedBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cards de Resumo das Categorias Críticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() =>
            setSelectedCategory((prev) => (prev === 'plan_change' ? 'all' : 'plan_change'))
          }
          className={`text-left rounded-2xl p-3.5 border transition cursor-pointer ${
            selectedCategory === 'plan_change'
              ? 'bg-emerald-950/35 border-emerald-500/60'
              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-slate-400 block">Mudança de Planos</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono tabular-nums mt-0.5">
            {summaryCounts.planChanges} ações
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Upgrades, downgrades e conciliações
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategory((prev) =>
              prev === 'license_generation' ? 'all' : 'license_generation'
            )
          }
          className={`text-left rounded-2xl p-3.5 border transition cursor-pointer ${
            selectedCategory === 'license_generation'
              ? 'bg-amber-950/35 border-amber-500/60'
              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-slate-400 block">Geração & Status de Licenças</span>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono tabular-nums mt-0.5">
            {summaryCounts.licenseOps} ações
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Chaves promocionais, parceiros e trials
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategory((prev) =>
              prev === 'security_config' ? 'all' : 'security_config'
            )
          }
          className={`text-left rounded-2xl p-3.5 border transition cursor-pointer ${
            selectedCategory === 'security_config'
              ? 'bg-indigo-950/35 border-indigo-500/60'
              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] text-slate-400 block">Alteração de Configurações</span>
          <div className="text-lg sm:text-xl font-black text-indigo-400 font-mono tabular-nums mt-0.5">
            {summaryCounts.configChanges} ações
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Parâmetros Master, SMTP e WhatsApp
          </div>
        </button>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Administradores Auditados</span>
          <div className="text-lg sm:text-xl font-black text-cyan-300 font-mono tabular-nums mt-0.5">
            {summaryCounts.distinctAdmins} operadores
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            Filtro ativo: {filteredLogs.length} registro(s)
          </div>
        </div>
      </div>

      {/* Painel Completo de Filtros: Categoria da Ação, E-mail do Admin e Data */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-4">
        {/* Linha 1: Abas Rápidas de Categoria da Ação */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Filtrar por Categoria da Ação Crítica:</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                'all',
                'plan_change',
                'license_generation',
                'security_config',
                'license_status',
                'vip_access',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: Filtro por E-mail do Admin + Filtro por Data (Presets e Intervalo) + Busca */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* E-mail do Admin (Seletor + Campo de E-mail) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>E-mail do Administrador:</span>
            </label>
            <select
              value={selectedAdminEmail}
              onChange={(e) => setSelectedAdminEmail(e.target.value)}
              aria-label="Selecionar e-mail do administrador"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">Todos os E-mails ({uniqueAdmins.length})</option>
              {uniqueAdmins.map(([email, name]) => (
                <option key={email} value={email}>
                  {email} ({name})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={adminEmailSearch}
              onChange={(e) => setAdminEmailSearch(e.target.value)}
              placeholder="Digitar e-mail do admin..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono mt-1"
            />
          </div>

          {/* Período Rápido de Data */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Janela de Data:</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { key: 'all', label: 'Todas Datas' },
                  { key: 'today', label: 'Hoje' },
                  { key: '7d', label: 'Últimos 7d' },
                  { key: '30d', label: 'Últimos 30d' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setDateRangePreset(preset.key)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    dateRangePreset === preset.key
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intervalo de Data Específico (De / Até) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Intervalo de Data (Início / Fim):</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  title="Data Inicial"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  title="Data Final"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Filtra ações ocorridas dentro do período selecionado
            </p>
          </div>

          {/* Busca por Alvo / Chave / Descrição */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span>Buscar Recurso, Chave ou ID:</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: SMTP, PRO-OUTUBRO, cliente..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              Pesquisa instantânea em alvos e justificativas
            </p>
          </div>
        </div>
      </div>

      {/* Painel de Inspeção Detalhada (quando uma ação crítica é selecionada) */}
      {inspectedEntry && (
        <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs">
              {getCategoryIcon(inspectedEntry.category)}
              <span className="font-bold text-white">{inspectedEntry.actionTitle}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono text-cyan-300 tabular-nums">{inspectedEntry.id}</span>
            </div>
            <button
              type="button"
              onClick={() => setInspectedEntry(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Fechar detalhes</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">Responsável pela Ação</span>
              <p className="text-white font-semibold">{inspectedEntry.adminName}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                {inspectedEntry.adminEmail} · {inspectedEntry.adminRole}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">Alvo / Transição de Estado</span>
              <p className="text-amber-300 font-mono font-semibold">{inspectedEntry.targetIdentifier}</p>
              <p className="text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-slate-400">{inspectedEntry.previousValue || '—'}</span>
                <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-emerald-400 font-semibold">{inspectedEntry.newValue || '—'}</span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">Rastreabilidade Técnica</span>
              <p className="text-slate-200 font-mono tabular-nums">
                Data: {inspectedEntry.formattedDate}
              </p>
              <p className="text-slate-400 font-mono tabular-nums text-[11px]">
                IP: {inspectedEntry.ipAddress} · Severidade: {SEVERITY_LABELS[inspectedEntry.severity].label}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 border-t border-slate-800/80 pt-2.5">
            <strong className="text-slate-400 font-medium">Justificativa registrada: </strong>
            {inspectedEntry.details}
          </p>
        </div>
      )}

      {/* Tabela de Ações Críticas dos Administradores */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
              <th className="py-3 px-3.5">Data / ID</th>
              <th className="py-3 px-3.5">Administrador (E-mail)</th>
              <th className="py-3 px-3.5">Categoria & Ação Crítica</th>
              <th className="py-3 px-3.5">Alvo & Mudança de Estado</th>
              <th className="py-3 px-3.5">Severidade / IP</th>
              <th className="py-3 px-3.5 text-right">Inspeção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma ação crítica encontrada para os filtros de data, e-mail ou categoria selecionados.
                </td>
              </tr>
            ) : (
              filteredLogs.map((entry) => {
                const sev = SEVERITY_LABELS[entry.severity];
                const isSelected = inspectedEntry?.id === entry.id;
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-slate-800/70' : 'hover:bg-slate-950/50'
                    }`}
                  >
                    {/* Coluna 1: Data & ID */}
                    <td className="py-3 px-3.5 align-top whitespace-nowrap font-mono tabular-nums">
                      <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{entry.formattedDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.id}
                      </div>
                    </td>

                    {/* Coluna 2: Administrador */}
                    <td className="py-3 px-3.5 align-top">
                      <div className="font-semibold text-white">{entry.adminName}</div>
                      <button
                        type="button"
                        onClick={() => setSelectedAdminEmail(entry.adminEmail)}
                        className="text-[11px] text-cyan-400 hover:underline font-mono text-left cursor-pointer"
                        title="Filtrar por este e-mail de administrador"
                      >
                        {entry.adminEmail}
                      </button>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.adminRole}
                      </div>
                    </td>

                    {/* Coluna 3: Categoria & Ação Crítica */}
                    <td className="py-3 px-3.5 align-top max-w-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                        {getCategoryIcon(entry.category)}
                        <span>{entry.actionTitle}</span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {entry.details}
                      </p>
                    </td>

                    {/* Coluna 4: Alvo & Transição */}
                    <td className="py-3 px-3.5 align-top">
                      <div className="font-mono text-amber-300 font-semibold text-[11px]">
                        {entry.targetIdentifier}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1 text-slate-300">
                        <span className="text-slate-400 truncate max-w-[130px]" title={entry.previousValue}>
                          {entry.previousValue || '—'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-emerald-400 font-semibold truncate max-w-[150px]" title={entry.newValue}>
                          {entry.newValue || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Coluna 5: Severidade & IP */}
                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${sev.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dotClass}`} />
                        <span>{sev.label}</span>
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-1">
                        IP {entry.ipAddress}
                      </div>
                    </td>

                    {/* Coluna 6: Ação de Inspecionar */}
                    <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setInspectedEntry(isSelected ? null : entry)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>{isSelected ? 'Ocultar' : 'Detalhes'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé informativo da tabela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
        <span>
          Exibindo <strong className="text-white font-mono tabular-nums">{filteredLogs.length}</strong> de{' '}
          <strong className="text-white font-mono tabular-nums">{logs.length}</strong> ações críticas registradas
        </span>
        <span className="text-slate-500">
          Mudanças de planos, chaves e configurações Master são gravadas automaticamente nesta trilha
        </span>
      </div>
    </div>
  );
}
