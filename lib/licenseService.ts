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

      await supabase
        .from('profiles')
        .update({
          plano: 'pro',
          is_admin: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        success: true,
        message: `Parabéns! Licença promocional de ${durationDays} dias ativada com sucesso.`,
        subscription: newSub
      };
    }

    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', cleanCode)
      .limit(1);

    if (error || !licenses || licenses.length === 0) {
      return { success: false, message: 'Código de licença não encontrado ou inválido.' };
    }

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
  } catch (error: any) {
    console.error('Erro ao resgatar licença:', error);
    return {
      success: false,
      message: error?.message || 'Falha ao processar o resgate da licença.'
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

  await supabase.from('licenses').insert(newLicense);
  return newLicense;
}

export async function listFreeLicenses(): Promise<FreeLicense[]> {
  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FreeLicense[];
  } catch (err: any) {
    console.error('Erro ao listar licenças:', err);
    return [];
  }
}

export async function toggleLicenseStatus(licenseId: string, active: boolean): Promise<void> {
  await supabase
    .from('licenses')
    .update({ active })
    .eq('id', licenseId);
}
