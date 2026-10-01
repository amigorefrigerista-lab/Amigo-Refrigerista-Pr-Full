// lib/licenseService.ts
import { supabase } from '@/lib/supabase';

export interface FreeLicense {
  id: string;
  code: string; // Ex: "PROMO-REFRIGERACAO-30"
  type: 'trial' | 'partner' | 'promotional';
  durationDays: number; // Ex: 30, 60 ou 90 dias
  maxUses: number; // Quantidade limite de usuários
  usedCount: number; // Quantidade de vezes resgatado
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface UserSubscription {
  userId: string;
  plan: 'free' | 'pro_trial' | 'pro_paid';
  licenseKeyUsed?: string;
  startDate: string;
  endDate: string;
  isVip?: boolean;
  status?: 'active' | 'canceled' | 'trialing' | 'past_due';
}

const LOCAL_STORAGE_LICENSES_KEY = 'amigo_refrigerista_licenses_local';

const DEFAULT_FALLBACK_LICENSES: FreeLicense[] = [
  {
    id: 'lic-default-1',
    code: 'PROMO-REFRIGERACAO-30',
    type: 'promotional',
    durationDays: 30,
    maxUses: 1000,
    usedCount: 12,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lic-default-2',
    code: 'PARCEIRO60',
    type: 'partner',
    durationDays: 60,
    maxUses: 500,
    usedCount: 5,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lic-default-3',
    code: 'VIP30',
    type: 'promotional',
    durationDays: 30,
    maxUses: 100,
    usedCount: 2,
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Carrega do LocalStorage em caso de indisponibilidade da tabela Supabase
function getLocalLicenses(): FreeLicense[] {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_LICENSES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LICENSES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_LICENSES_KEY, JSON.stringify(DEFAULT_FALLBACK_LICENSES));
      return DEFAULT_FALLBACK_LICENSES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_FALLBACK_LICENSES;
  }
}

// Salva no LocalStorage
function saveLocalLicenses(licenses: FreeLicense[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LICENSES_KEY, JSON.stringify(licenses));
  } catch (e) {
    console.warn('Erro ao salvar licenças no localStorage:', e);
  }
}

export function generateLicenseCode(type: 'trial' | 'partner' | 'promotional', days: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = type === 'partner' ? 'PARCEIRO' : type === 'promotional' ? 'PROMO' : 'TRIAL';
  return `${prefix}-REFRIGERACAO-${days}-${randomSuffix}`;
}

export function calculateSubscriptionEndDate(startDateStr: string, durationDays: number): string {
  const startDate = new Date(startDateStr + 'T12:00:00');
  startDate.setDate(startDate.getDate() + durationDays);
  return startDate.toISOString().split('T')[0];
}

export function isSubscriptionValid(subscription?: Partial<UserSubscription> | null): boolean {
  if (!subscription) return false;
  if (subscription.isVip) return true;
  if (subscription.plan === 'pro_paid') return true;
  if (subscription.plan === 'pro_trial') {
    if (!subscription.endDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return subscription.endDate >= today;
  }
  return false;
}

export function getSubscriptionDaysRemaining(endDateStr?: string): number {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr + 'T23:59:59');
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export async function redeemFreeLicenseInFirestore(
  userId: string,
  userEmail: string | null | undefined,
  rawCode: string
): Promise<{ success: boolean; message: string; subscription?: UserSubscription }> {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, message: 'Informe o código da licença para resgatar.' };
  }

  if (!userId) {
    return { success: false, message: 'Você precisa estar logado para resgatar uma licença.' };
  }

  try {
    // Códigos promocionais embutidos
    if (cleanCode === 'PROMO-REFRIGERACAO-30' || cleanCode === 'VIP30' || cleanCode === 'PARCEIRO60') {
      const durationDays = cleanCode === 'PARCEIRO60' ? 60 : 30;
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = calculateSubscriptionEndDate(startDate, durationDays);

      const newSub: UserSubscription = {
        userId,
        plan: 'pro_trial',
        licenseKeyUsed: cleanCode,
        startDate,
        endDate,
        isVip: true,
        status: 'active'
      };

      try {
        await supabase
          .from('profiles')
          .update({
            plano: 'pro',
            is_admin: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (err) {
        // ignora se offline
      }

      return {
        success: true,
        message: `Parabéns! Licença promocional de ${durationDays} dias ativada com sucesso.`,
        subscription: newSub
      };
    }

    // Tenta no Supabase
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', cleanCode)
      .limit(1);

    if (!error && licenses && licenses.length > 0) {
      const license = licenses[0] as FreeLicense;

      if (!license.active) {
        return { success: false, message: 'Esta licença foi desativada pelo administrador.' };
      }

      if (license.usedCount >= license.maxUses) {
        return { success: false, message: 'Esta licença atingiu o limite máximo de usuários.' };
      }

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = calculateSubscriptionEndDate(startDate, license.durationDays || 30);

      const subscription: UserSubscription = {
        userId,
        plan: 'pro_trial',
        licenseKeyUsed: cleanCode,
        startDate,
        endDate,
        isVip: true,
        status: 'active'
      };

      await supabase
        .from('licenses')
        .update({ usedCount: (license.usedCount || 0) + 1 })
        .eq('id', license.id);

      await supabase
        .from('profiles')
        .update({
          plano: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        success: true,
        message: `🎉 Licença ativada! Você liberou o Plano Pró por ${license.durationDays} dias (até ${endDate}).`,
        subscription
      };
    }

    // Fallback Local Storage
    const localList = getLocalLicenses();
    const found = localList.find(l => l.code === cleanCode);

    if (found) {
      if (!found.active) {
        return { success: false, message: 'Esta licença foi desativada pelo administrador.' };
      }

      if (found.usedCount >= found.maxUses) {
        return { success: false, message: 'Esta licença atingiu o limite máximo de usuários.' };
      }

      found.usedCount = (found.usedCount || 0) + 1;
      saveLocalLicenses(localList);

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = calculateSubscriptionEndDate(startDate, found.durationDays || 30);

      const subscription: UserSubscription = {
        userId,
        plan: 'pro_trial',
        licenseKeyUsed: cleanCode,
        startDate,
        endDate,
        isVip: true,
        status: 'active'
      };

      return {
        success: true,
        message: `🎉 Licença ativada! Você liberou o Plano Pró por ${found.durationDays} dias (até ${endDate}).`,
        subscription
      };
    }

    return { success: false, message: 'Código de licença não encontrado ou inválido.' };
  } catch (error: any) {
    console.warn('Fallback ao resgatar licença:', error?.message);
    return {
      success: false,
      message: 'Código de licença inválido ou expirado.'
    };
  }
}

export async function createFreeLicense(
  data: Omit<FreeLicense, 'id' | 'usedCount' | 'createdAt'>
): Promise<FreeLicense> {
  const licenseId = `lic-${Date.now()}`;
  const cleanCode = data.code.trim().toUpperCase();

  const newLicense: FreeLicense = {
    id: licenseId,
    code: cleanCode,
    type: data.type,
    durationDays: Number(data.durationDays) || 30,
    maxUses: Number(data.maxUses) || 50,
    usedCount: 0,
    active: data.active ?? true,
    createdAt: new Date().toISOString(),
    expiresAt: data.expiresAt || undefined
  };

  try {
    const { error } = await supabase.from('licenses').insert(newLicense);
    if (error) throw error;
  } catch (err) {
    // Se a tabela não existir, salva localmente
    const currentLocal = getLocalLicenses();
    currentLocal.unshift(newLicense);
    saveLocalLicenses(currentLocal);
  }

  return newLicense;
}

export async function listFreeLicenses(): Promise<FreeLicense[]> {
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as FreeLicense[];
    }
  } catch (err: any) {
    // Erro PGRST205 ou indisponibilidade
  }

  // Fallback Local Storage
  return getLocalLicenses();
}

export async function toggleLicenseStatus(licenseId: string, active: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('licenses')
      .update({ active })
      .eq('id', licenseId);

    if (error) throw error;
  } catch (err) {
    const currentLocal = getLocalLicenses();
    const updated = currentLocal.map(l => l.id === licenseId ? { ...l, active } : l);
    saveLocalLicenses(updated);
  }
}
