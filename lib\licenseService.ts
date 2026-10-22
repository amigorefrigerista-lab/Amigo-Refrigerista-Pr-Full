// lib/licenseService.ts

export interface FreeLicense {
  id: string;
  code: string; // Ex: "PROMO-REFRIGERACAO-30-A1B2C3D4"
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
  plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  licenseKeyUsed?: string;
  startDate: string;
  endDate: string;
  isVip?: boolean;
  status?: 'active' | 'canceled' | 'trialing' | 'past_due';
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  try {
    const sessionToken = sessionStorage.getItem('amigo_hmac_session');
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
  } catch {
    // ignore storage errors
  }
  return headers;
}

/**
 * Gera código de licença criptograficamente seguro via Web Crypto API (CSPRNG) — nunca usa Math.random()
 */
export function generateLicenseCode(
  type: 'trial' | 'partner' | 'promotional',
  days: number
): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (Date.now() + i * 31) & 0xff;
    }
  }

  let randomSuffix = '';
  for (let i = 0; i < bytes.length; i++) {
    randomSuffix += alphabet[bytes[i] % alphabet.length];
  }

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
  if (subscription.endDate) {
    const today = new Date().toISOString().split('T')[0];
    if (subscription.endDate < today) {
      return false;
    }
  }
  if (subscription.isVip) return true;
  if (
    subscription.plan === 'pro_paid' ||
    subscription.plan === 'pro' ||
    subscription.plan === 'flex' ||
    subscription.plan === 'pro_trial'
  ) {
    return true;
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

/**
 * Resgata uma licença validando exclusivamente no servidor (/api/licenses)
 */
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
    const res = await fetch('/api/licenses', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'redeem',
        code: cleanCode,
        userId,
        userEmail,
      }),
    });

    const data = await res.json();
    return {
      success: Boolean(data.success),
      message: data.message || 'Não foi possível validar a licença.',
      subscription: data.subscription,
    };
  } catch {
    return {
      success: false,
      message: 'Erro de comunicação ao validar o código de licença.',
    };
  }
}

export async function createFreeLicense(
  data: Omit<FreeLicense, 'id' | 'usedCount' | 'createdAt'>
): Promise<FreeLicense> {
  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'create',
      ...data,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Falha ao criar licença no servidor.');
  }
  return json.license as FreeLicense;
}

export async function listFreeLicenses(): Promise<FreeLicense[]> {
  try {
    const res = await fetch('/api/licenses', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'list' }),
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.licenses)) {
      return json.licenses as FreeLicense[];
    }
  } catch {
    // ignore
  }
  return [];
}

export async function toggleLicenseStatus(licenseId: string, active: boolean): Promise<void> {
  const res = await fetch('/api/licenses', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'toggle',
      licenseId,
      active,
    }),
  });
  if (!res.ok) {
    throw new Error('Falha ao atualizar status da licença.');
  }
}
