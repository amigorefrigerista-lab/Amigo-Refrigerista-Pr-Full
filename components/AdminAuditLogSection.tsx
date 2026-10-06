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
  AlertTriangle,
  Eye,
  X,
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
  all: 'Todas as Ações',
  plan_change: 'Alterações de Plano',
  license_generation: 'Geração de Licenças',
  license_status: 'Status de Chaves',
  vip_access: 'Acesso VIP',
  security_config: 'Configurações & Segurança',
};

const SEVERITY_LABELS: Record<AdminAuditEntry['severity'], { label: string; colorClass: string; dotClass: string }> = {
  critical: {
    label: 'Crítica',
    colorClass: 'text-rose-400',
    dotClass: 'bg-rose-400',
  },
  high: {
    label: 'Alta',
    colorClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
  },
  medium: {
    label: 'Moderada',
    colorClass: 'text-sky-400',
    dotClass: 'bg-sky-400',
  },
};

export default function AdminAuditLogSection({
  currentAdminEmail = 'amigorefrigerista@gmail.com',
  currentAdminName = 'Administrador Master',
}: AdminAuditLogSectionProps) {
  const [logs, setLogs] = useState<AdminAuditEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory | 'all'>('all');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedEntry, setInspectedEntry] = useState<AdminAuditEntry | null>(null);
  const [auditVerifiedBanner, setAuditVerifiedBanner] = useState<string | null>(null);

  const loadLogs = () => {
    const data = getAdminAuditLogs(20);
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

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedAdminFilter !== 'all' && entry.adminEmail !== selectedAdminFilter) {
        return false;
      }
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
  }, [logs, selectedCategory, selectedAdminFilter, searchQuery]);

  const summaryCounts = useMemo(() => {
    const planChanges = logs.filter((l) => l.category === 'plan_change').length;
    const licenseOps = logs.filter(
      (l) => l.category === 'license_generation' || l.category === 'license_status'
    ).length;
    const criticalCount = logs.filter((l) => l.severity === 'critical' || l.severity === 'high').length;
    const distinctAdmins = new Set(logs.map((l) => l.adminEmail)).size;
    return { planChanges, licenseOps, criticalCount, distinctAdmins };
  }, [logs]);

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
      'Categoria',
      'Acao',
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

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria-admin-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRecordVerificationCheckpoint = () => {
    const created = recordAdminAuditAction({
      adminName: currentAdminName,
      adminEmail: currentAdminEmail,
      adminRole: 'Super Admin',
      category: 'security_config',
      actionTitle: 'Conferência de Trilha de Auditoria',
      targetIdentifier: 'Log de Governança (Últimas 20 Ações)',
      previousValue: 'Pendente de revisão diária',
      newValue: 'Verificado e íntegro',
      details: `Revisão de conformidade executada manualmente por ${currentAdminEmail}.`,
      severity: 'medium',
    });
    setAuditVerifiedBanner(`Registro de conformidade ${created.id} gravado na trilha de auditoria.`);
    setTimeout(() => setAuditVerifiedBanner(null), 5000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl relative overflow-hidden">
      {/* Cabeçalho da Seção de Auditoria */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Trilha de Auditoria e Governança — Últimas 20 Ações Sensíveis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitoramento de alterações de planos, emissões de licenças cortesia, revogações e ajustes críticos realizados por administradores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
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
            <span>Exportar Auditoria (CSV)</span>
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

      {/* Faixa de Resumo de Governança */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Eventos Sensíveis Listados</span>
          <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums mt-0.5">
            {logs.length} registros
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Janela contínua das últimas 20 operações
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Mudanças de Plano Auditadas</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
            {summaryCounts.planChanges} alterações
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Upgrades, downgrades e conciliações
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Operações de Licenças e Chaves</span>
          <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono tabular-nums mt-0.5">
            {summaryCounts.licenseOps} emissões/status
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Lotes promocionais, trials e revogações
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Administradores Ativos na Trilha</span>
          <div className="text-lg sm:text-xl font-bold text-cyan-300 font-mono tabular-nums mt-0.5">
            {summaryCounts.distinctAdmins} operadores
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            {summaryCounts.criticalCount} ações de impacto alto/crítico
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {(
            [
              'all',
              'plan_change',
              'license_generation',
              'license_status',
              'vip_access',
              'security_config',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedAdminFilter}
            onChange={(e) => setSelectedAdminFilter(e.target.value)}
            aria-label="Filtrar por administrador"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Administradores ({uniqueAdmins.length})</option>
            {uniqueAdmins.map(([email, name]) => (
              <option key={email} value={email}>
                {name} ({email})
              </option>
            ))}
          </select>

          <div className="relative min-w-[230px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conta, chave, admin ou ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Painel de Inspeção Detalhada (quando uma linha é selecionada) */}
      {inspectedEntry && (
        <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 space-y-3">
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

      {/* Tabela das 20 Ações Sensíveis */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
              <th className="py-3 px-3.5">Data / ID</th>
              <th className="py-3 px-3.5">Administrador</th>
              <th className="py-3 px-3.5">Ação Sensível</th>
              <th className="py-3 px-3.5">Alvo & Mudança de Estado</th>
              <th className="py-3 px-3.5">Severidade / IP</th>
              <th className="py-3 px-3.5 text-right">Inspeção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Nenhuma ação administrativa encontrada para os filtros selecionados.
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
                      <div className="text-[11px] text-slate-400 font-mono">
                        {entry.adminEmail}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.adminRole}
                      </div>
                    </td>

                    {/* Coluna 3: Ação Sensível & Justificativa */}
                    <td className="py-3 px-3.5 align-top max-w-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                        {getCategoryIcon(entry.category)}
                        <span>{entry.actionTitle}</span>
                      </div>
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
                      <div className={`flex items-center gap-1.5 font-medium ${sev.colorClass}`}>
                        <span className={`w-2 h-2 rounded-full ${sev.dotClass}`} />
                        <span>{sev.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        IP {entry.ipAddress}
                      </div>
                    </td>

                    {/* Coluna 6: Ação de Inspecionar */}
                    <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setInspectedEntry(isSelected ? null : entry)
                        }
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
          <strong className="text-white font-mono tabular-nums">{logs.length}</strong> ações administrativas sensíveis registradas
        </span>
        <span className="text-slate-500">
          Alterações de planos e chaves no Painel Master são gravadas automaticamente nesta trilha
        </span>
      </div>
    </div>
  );
}
