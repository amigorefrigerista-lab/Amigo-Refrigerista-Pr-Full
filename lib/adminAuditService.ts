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

const AUDIT_STORAGE_KEY = 'amigo_refrigerista_admin_audit_logs_real_v1';

export const INITIAL_ADMIN_AUDIT_LOGS: AdminAuditEntry[] = [];

export function getAdminAuditLogs(limit = 100): AdminAuditEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, limit);
    }
    return [];
  } catch {
    return [];
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
    ipAddress: entry.ipAddress || 'Sistema Local',
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getAdminAuditLogs(100);
      const updated = [newEntry, ...current].slice(0, 100);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('admin-audit-updated'));
    } catch (err) {
      console.error('Erro ao registrar log de auditoria:', err);
    }
  }

  return newEntry;
}
