export type AuditActionCategory =
  | 'plan_change'
  | 'license_generation'
  | 'license_status'
  | 'vip_access'
  | 'security_config';

export type AuditSeverity = 'critical' | 'high' | 'medium';

export interface AdminAuditEntry {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string;
  adminName: string;
  adminEmail: string;
  adminRole: string;
  category: AuditActionCategory;
  actionTitle: string;
  targetIdentifier: string;
  previousValue?: string;
  newValue?: string;
  details: string;
  severity: AuditSeverity;
  ipAddress: string;
}

const AUDIT_STORAGE_KEY = 'amigo_refrigerista_admin_audit_logs_v1';

export const INITIAL_ADMIN_AUDIT_LOGS: AdminAuditEntry[] = [
  {
    id: 'AUD-2026-1020',
    timestamp: '2026-10-05T13:18:40.000Z',
    formattedDate: '05/10/2026 10:18',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'plan_change',
    actionTitle: 'Upgrade Manual de Assinatura',
    targetIdentifier: 'marcos.hvac@gmail.com',
    previousValue: 'Plano Flex (R$ 19,90)',
    newValue: 'Plano Pró (R$ 39,90)',
    details: 'Alteração manual após confirmação de comprovante PIX corporativo.',
    severity: 'high',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1019',
    timestamp: '2026-10-05T12:45:12.000Z',
    formattedDate: '05/10/2026 09:45',
    adminName: 'Fernanda Costa',
    adminEmail: 'fernanda.admin@amigorefrigerista.com.br',
    adminRole: 'Gestora Comercial',
    category: 'license_generation',
    actionTitle: 'Geração de Chave Cortesia Parceiro',
    targetIdentifier: 'PARCEIRO-90D-HVAC26',
    previousValue: '—',
    newValue: '90 dias · 25 resgates',
    details: 'Lote promocional criado para instrutores de treinamento técnico.',
    severity: 'high',
    ipAddress: '201.17.98.210',
  },
  {
    id: 'AUD-2026-1018',
    timestamp: '2026-10-05T11:30:05.000Z',
    formattedDate: '05/10/2026 08:30',
    adminName: 'Administrador Master',
    adminEmail: 'amigorefrigerista@gmail.com',
    adminRole: 'Super Admin',
    category: 'security_config',
    actionTitle: 'Atualização de Limite Global de IA',
    targetIdentifier: 'Configuração Master · Quota Gemini',
    previousValue: '50 consultas/dia (Flex)',
    newValue: '75 consultas/dia (Flex)',
    details: 'Ajuste de parâmetro operacional para técnicos em período de alta demanda.',
    severity: 'critical',
    ipAddress: '177.92.40.19',
  },
  {
    id: 'AUD-2026-1017',
    timestamp: '2026-10-04T21:14:33.000Z',
    formattedDate: '04/10/2026 18:14',
    adminName: 'Roberto Almeida',
    adminEmail: 'roberto.auditoria@amigorefrigerista.com.br',
    adminRole: 'Admin Financeiro',
    category: 'license_status',
    actionTitle: 'Revogação de Chave Promocional',
    targetIdentifier: 'PROMO-30D-EXPO2026',
    previousValue: 'Status: Ativa (18/20 usos)',
    newValue: 'Status: Desativada',
    details: 'Chave encerrada preventivamente após compartilhamento fora do grupo oficial.',
    severity: 'critical',
    ipAddress: '187.65.220.11',
  },
  {
    id: 'AUD-2026-1016',
    timestamp: '2026-10-04T19:52:18.000Z',
    formattedDate: '04/10/2026 16:52',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'plan_change',
    actionTitle: 'Downgrade por Expiração de Ciclo',
    targetIdentifier: 'oficina.friototal@outlook.com',
    previousValue: 'Plano Pró (R$ 39,90)',
    newValue: 'Plano Gratuito (R$ 0)',
    details: 'Retorno ao plano base após 3 tentativas de renovação sem sucesso.',
    severity: 'medium',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1015',
    timestamp: '2026-10-04T17:20:44.000Z',
    formattedDate: '04/10/2026 14:20',
    adminName: 'Fernanda Costa',
    adminEmail: 'fernanda.admin@amigorefrigerista.com.br',
    adminRole: 'Gestora Comercial',
    category: 'vip_access',
    actionTitle: 'Concessão de Acesso VIP Vitalício',
    targetIdentifier: 'eng.climatizacao.sp@gmail.com',
    previousValue: 'Plano Pró Mensal',
    newValue: 'VIP Vitalício (3650 dias)',
    details: 'Credenciamento de embaixador técnico regional em São Paulo.',
    severity: 'critical',
    ipAddress: '201.17.98.210',
  },
  {
    id: 'AUD-2026-1014',
    timestamp: '2026-10-04T15:08:19.000Z',
    formattedDate: '04/10/2026 12:08',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'license_generation',
    actionTitle: 'Geração de Chave Trial Individual',
    targetIdentifier: 'TRIAL-15D-TEC982',
    previousValue: '—',
    newValue: '15 dias · 1 resgate',
    details: 'Código de avaliação liberado durante atendimento no suporte central.',
    severity: 'medium',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1013',
    timestamp: '2026-10-03T22:41:09.000Z',
    formattedDate: '03/10/2026 19:41',
    adminName: 'Roberto Almeida',
    adminEmail: 'roberto.auditoria@amigorefrigerista.com.br',
    adminRole: 'Admin Financeiro',
    category: 'plan_change',
    actionTitle: 'Ativação Direta Plano Flex',
    targetIdentifier: 'refrigeracao.norte@gmail.com',
    previousValue: 'Plano Gratuito (R$ 0)',
    newValue: 'Plano Flex (R$ 19,90)',
    details: 'Conciliação bancária manual de assinatura mensal.',
    severity: 'medium',
    ipAddress: '187.65.220.11',
  },
  {
    id: 'AUD-2026-1012',
    timestamp: '2026-10-03T18:15:50.000Z',
    formattedDate: '03/10/2026 15:15',
    adminName: 'Administrador Master',
    adminEmail: 'amigorefrigerista@gmail.com',
    adminRole: 'Super Admin',
    category: 'security_config',
    actionTitle: 'Alteração de Gateway WhatsApp Oficial',
    targetIdentifier: 'Webhook API WhatsApp Business',
    previousValue: 'Instância #01 (Secundária)',
    newValue: 'Instância #02 (Alta Disponibilidade)',
    details: 'Migração de rota de disparo de orçamentos e alertas PMOC.',
    severity: 'critical',
    ipAddress: '177.92.40.19',
  },
  {
    id: 'AUD-2026-1011',
    timestamp: '2026-10-03T14:32:10.000Z',
    formattedDate: '03/10/2026 11:32',
    adminName: 'Fernanda Costa',
    adminEmail: 'fernanda.admin@amigorefrigerista.com.br',
    adminRole: 'Gestora Comercial',
    category: 'license_generation',
    actionTitle: 'Geração de Lote Cortesia Feira FEBRAVA',
    targetIdentifier: 'CORTESIA-30D-FEBRAVA',
    previousValue: '—',
    newValue: '30 dias · 100 resgates',
    details: 'Campanha de captação de novos técnicos credenciados no evento.',
    severity: 'high',
    ipAddress: '201.17.98.210',
  },
  {
    id: 'AUD-2026-1010',
    timestamp: '2026-10-02T20:05:27.000Z',
    formattedDate: '02/10/2026 17:05',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'plan_change',
    actionTitle: 'Upgrade Direto para Plano Pró',
    targetIdentifier: 'leandro.inverter@gmail.com',
    previousValue: 'Plano Gratuito (R$ 0)',
    newValue: 'Plano Pró (R$ 39,90)',
    details: 'Migração imediata solicitada via suporte técnico prioritário.',
    severity: 'high',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1009',
    timestamp: '2026-10-02T16:48:00.000Z',
    formattedDate: '02/10/2026 13:48',
    adminName: 'Roberto Almeida',
    adminEmail: 'roberto.auditoria@amigorefrigerista.com.br',
    adminRole: 'Admin Financeiro',
    category: 'license_status',
    actionTitle: 'Reativação de Chave de Parceiro',
    targetIdentifier: 'PARCEIRO-60D-SULHVAC',
    previousValue: 'Status: Pausada',
    newValue: 'Status: Ativa (12/50 usos)',
    details: 'Chave reabilitada após validação da diretoria comercial.',
    severity: 'medium',
    ipAddress: '187.65.220.11',
  },
  {
    id: 'AUD-2026-1008',
    timestamp: '2026-10-02T13:19:42.000Z',
    formattedDate: '02/10/2026 10:19',
    adminName: 'Fernanda Costa',
    adminEmail: 'fernanda.admin@amigorefrigerista.com.br',
    adminRole: 'Gestora Comercial',
    category: 'vip_access',
    actionTitle: 'Inclusão na Lista VIP Prioritária',
    targetIdentifier: 'clube.refrigerista.br@gmail.com',
    previousValue: 'Acesso Padrão',
    newValue: 'Membro VIP Verificado',
    details: 'Parceiro institucional adicionado ao programa VIP.',
    severity: 'high',
    ipAddress: '201.17.98.210',
  },
  {
    id: 'AUD-2026-1007',
    timestamp: '2026-10-01T21:55:14.000Z',
    formattedDate: '01/10/2026 18:55',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'plan_change',
    actionTitle: 'Alteração de Plano Assinante',
    targetIdentifier: 'diego.splitservice@yahoo.com',
    previousValue: 'Plano Flex (R$ 19,90)',
    newValue: 'Plano Pró (R$ 39,90)',
    details: 'Liberação de módulo completo de PMOC e calculadora avançada.',
    severity: 'high',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1006',
    timestamp: '2026-10-01T18:10:39.000Z',
    formattedDate: '01/10/2026 15:10',
    adminName: 'Administrador Master',
    adminEmail: 'amigorefrigerista@gmail.com',
    adminRole: 'Super Admin',
    category: 'license_generation',
    actionTitle: 'Geração de Chave Anual Corporativa',
    targetIdentifier: 'CORP-365D-FRIO2026',
    previousValue: '—',
    newValue: '365 dias · 15 resgates',
    details: 'Licenciamento anual para equipe de manutenção predial contratada.',
    severity: 'critical',
    ipAddress: '177.92.40.19',
  },
  {
    id: 'AUD-2026-1005',
    timestamp: '2026-10-01T14:22:08.000Z',
    formattedDate: '01/10/2026 11:22',
    adminName: 'Roberto Almeida',
    adminEmail: 'roberto.auditoria@amigorefrigerista.com.br',
    adminRole: 'Admin Financeiro',
    category: 'plan_change',
    actionTitle: 'Estorno e Rebaixamento de Plano',
    targetIdentifier: 'teste.duplicado99@gmail.com',
    previousValue: 'Plano Pró (R$ 39,90)',
    newValue: 'Plano Gratuito (R$ 0)',
    details: 'Cancelamento de cobrança em duplicidade dentro do prazo de 7 dias.',
    severity: 'medium',
    ipAddress: '187.65.220.11',
  },
  {
    id: 'AUD-2026-1004',
    timestamp: '2026-09-30T20:40:11.000Z',
    formattedDate: '30/09/2026 17:40',
    adminName: 'Fernanda Costa',
    adminEmail: 'fernanda.admin@amigorefrigerista.com.br',
    adminRole: 'Gestora Comercial',
    category: 'license_status',
    actionTitle: 'Bloqueio de Chave Expirada',
    targetIdentifier: 'TRIAL-7D-SETEMBRO',
    previousValue: 'Status: Ativa (50/50 usos)',
    newValue: 'Status: Encerrada',
    details: 'Encerramento de campanha mensal de degustação de 7 dias.',
    severity: 'medium',
    ipAddress: '201.17.98.210',
  },
  {
    id: 'AUD-2026-1003',
    timestamp: '2026-09-30T16:04:55.000Z',
    formattedDate: '30/09/2026 13:04',
    adminName: 'Carlos Eduardo Silva',
    adminEmail: 'carlos.suporte@amigorefrigerista.com.br',
    adminRole: 'Admin Operacional',
    category: 'vip_access',
    actionTitle: 'Renovação de Credencial VIP',
    targetIdentifier: 'mestre.vrf.brasil@gmail.com',
    previousValue: 'VIP 90 Dias',
    newValue: 'VIP 365 Dias',
    details: 'Extensão de benefício para consultor técnico de sistemas VRF.',
    severity: 'high',
    ipAddress: '189.44.112.84',
  },
  {
    id: 'AUD-2026-1002',
    timestamp: '2026-09-29T19:28:30.000Z',
    formattedDate: '29/09/2026 16:28',
    adminName: 'Roberto Almeida',
    adminEmail: 'roberto.auditoria@amigorefrigerista.com.br',
    adminRole: 'Admin Financeiro',
    category: 'security_config',
    actionTitle: 'Auditoria de Permissões Administrativas',
    targetIdentifier: 'Grupo Operadores de Suporte',
    previousValue: '4 operadores ativos',
    newValue: '3 operadores ativos',
    details: 'Remoção de credencial temporária de operador externo.',
    severity: 'critical',
    ipAddress: '187.65.220.11',
  },
  {
    id: 'AUD-2026-1001',
    timestamp: '2026-09-29T13:12:00.000Z',
    formattedDate: '29/09/2026 10:12',
    adminName: 'Administrador Master',
    adminEmail: 'amigorefrigerista@gmail.com',
    adminRole: 'Super Admin',
    category: 'plan_change',
    actionTitle: 'Upgrade em Lote — Equipe Credenciada',
    targetIdentifier: 'arcondicionado.express@gmail.com',
    previousValue: 'Plano Flex (R$ 19,90)',
    newValue: 'Plano Pró (R$ 39,90)',
    details: 'Liberação de recursos Pró para conta líder de assistência autorizada.',
    severity: 'high',
    ipAddress: '177.92.40.19',
  },
];

export function getAdminAuditLogs(limit = 20): AdminAuditEntry[] {
  if (typeof window === 'undefined') {
    return INITIAL_ADMIN_AUDIT_LOGS.slice(0, limit);
  }
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_AUDIT_LOGS));
      return INITIAL_ADMIN_AUDIT_LOGS.slice(0, limit);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, limit);
    }
    return INITIAL_ADMIN_AUDIT_LOGS.slice(0, limit);
  } catch {
    return INITIAL_ADMIN_AUDIT_LOGS.slice(0, limit);
  }
}

export function recordAdminAuditAction(
  entry: Omit<AdminAuditEntry, 'id' | 'timestamp' | 'formattedDate' | 'ipAddress'> & {
    ipAddress?: string;
  }
): AdminAuditEntry {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;

  const newEntry: AdminAuditEntry = {
    id: `AUD-${now.getFullYear()}-${Math.floor(1021 + Math.random() * 8970)}`,
    timestamp: now.toISOString(),
    formattedDate,
    adminName: entry.adminName,
    adminEmail: entry.adminEmail,
    adminRole: entry.adminRole,
    category: entry.category,
    actionTitle: entry.actionTitle,
    targetIdentifier: entry.targetIdentifier,
    previousValue: entry.previousValue || '—',
    newValue: entry.newValue || '—',
    details: entry.details,
    severity: entry.severity,
    ipAddress: entry.ipAddress || '177.92.40.19',
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getAdminAuditLogs(50);
      const updated = [newEntry, ...current].slice(0, 50);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('admin-audit-updated'));
    } catch (err) {
      console.error('Erro ao registrar log de auditoria:', err);
    }
  }

  return newEntry;
}
