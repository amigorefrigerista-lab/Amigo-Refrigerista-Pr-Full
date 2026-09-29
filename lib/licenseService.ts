// lib/licenseService.ts
import { db, auth } from '@/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  where 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrors';

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
  // Propriedades complementares para compatibilidade retroativa
  isVip?: boolean;
  status?: 'active' | 'canceled' | 'trialing' | 'past_due';
}

/**
 * Gera um código de licença com formatação amigável
 * Ex: PROMO-REFRIGERACAO-30, PARCEIRO-HVAC-60, TRIAL-CLIMA-90
 */
export function generateLicenseCode(type: 'trial' | 'partner' | 'promotional', days: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = type === 'partner' ? 'PARCEIRO' : type === 'promotional' ? 'PROMO' : 'TRIAL';
  return `${prefix}-REFRIGERACAO-${days}-${randomSuffix}`;
}

/**
 * Calcula a data de término (endDate) a partir de uma data de início e quantidade de dias
 */
export function calculateSubscriptionEndDate(startDateStr: string, durationDays: number): string {
  const startDate = new Date(startDateStr + 'T12:00:00');
  startDate.setDate(startDate.getDate() + durationDays);
  return startDate.toISOString().split('T')[0];
}

/**
 * Verifica se a assinatura com licença está ativa e não expirou
 */
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

/**
 * Calcula a quantidade de dias restantes da assinatura
 */
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
 * Valida e processa o resgate de uma licença gratuita a partir da lista de licenças disponíveis
 */
export function redeemFreeLicense(
  userId: string, 
  licenseCode: string, 
  availableLicenses: FreeLicense[]
): { success: boolean; message: string; expirationDate?: string } {
  
  const license = availableLicenses.find(
    (l) => l.code.toUpperCase() === licenseCode.toUpperCase() && l.active
  );

  if (!license) {
    return { success: false, message: 'Código de licença inválido ou expirado.' };
  }

  if (license.usedCount >= license.maxUses) {
    return { success: false, message: 'Limite de resgates para este cupom atingido.' };
  }

  // Calcula a data de expiração da licença gratuita
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + license.durationDays);

  // Atualiza o contador de uso da licença
  license.usedCount += 1;

  return {
    success: true,
    message: `Licença PRO ativada com sucesso por ${license.durationDays} dias!`,
    expirationDate: endDate.toISOString()
  };
}

/**
 * Resgata uma Licença Gratuita para o usuário conectado diretamente no Firestore
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
    // 1. Localiza a licença no Firestore pelo código
    const licensesRef = collection(db, 'licenses');
    const q = query(licensesRef, where('code', '==', cleanCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Códigos promocionais especiais embutidos para conveniência e testes imediatos
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

        await setDoc(doc(db, 'users', userId), {
          subscription: newSub,
          isVip: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return {
          success: true,
          message: `Parabéns! Licença promocional de ${durationDays} dias ativada com sucesso.`,
          subscription: newSub
        };
      }

      return { success: false, message: 'Código de licença não encontrado ou inválido.' };
    }

    const licenseDoc = snapshot.docs[0];
    const license = { id: licenseDoc.id, ...licenseDoc.data() } as FreeLicense;

    // 2. Validações de status, expiração e limite de uso
    if (!license.active) {
      return { success: false, message: 'Esta licença foi desativada pelo administrador.' };
    }

    if (license.expiresAt) {
      const today = new Date().toISOString().split('T')[0];
      if (license.expiresAt < today) {
        return { success: false, message: `Esta licença expirou em ${license.expiresAt}.` };
      }
    }

    if (license.usedCount >= license.maxUses) {
      return { success: false, message: 'Esta licença atingiu o limite máximo de usuários.' };
    }

    // 3. Verifica se o usuário já resgatou esta licença específica
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    if (userDocSnap.exists()) {
      const currentSub = userDocSnap.data()?.subscription;
      if (currentSub?.licenseKeyUsed === cleanCode && isSubscriptionValid(currentSub)) {
        return { 
          success: false, 
          message: 'Você já resgatou esta licença e ela ainda está ativa na sua conta!' 
        };
      }
    }

    // 4. Calcula o período de vigência
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

    // 5. Atualiza a contagem de uso da licença no Firestore
    await updateDoc(doc(db, 'licenses', license.id), {
      usedCount: increment(1),
      lastRedeemedAt: new Date().toISOString()
    });

    // 6. Atualiza os dados do usuário no Firestore
    await setDoc(doc(db, 'users', userId), {
      subscription,
      isVip: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 7. Registra log de resgate para auditoria do admin
    const redemptionId = `red-${Date.now()}`;
    await setDoc(doc(db, 'licenses', license.id, 'redemptions', redemptionId), {
      userId,
      userEmail: userEmail || '',
      redeemedAt: new Date().toISOString(),
      durationDays: license.durationDays
    }).catch(err => {
      console.warn('Erro ao registrar log de resgate:', err);
    });

    return {
      success: true,
      message: `🎉 Licença ativada! Você liberou o Plano Pró por ${license.durationDays} dias (até ${endDate}).`,
      subscription
    };
  } catch (error: any) {
    console.error('Erro ao resgatar licença gratuita:', error);
    return {
      success: false,
      message: error?.message || 'Falha ao processar o resgate da licença. Tente novamente.'
    };
  }
}

/**
 * Cria uma nova licença gratuita no Firestore (Apenas Administrador)
 */
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

  await setDoc(doc(db, 'licenses', licenseId), newLicense);
  return newLicense;
}

/**
 * Lista todas as licenças cadastradas no Firestore
 */
export async function listFreeLicenses(): Promise<FreeLicense[]> {
  try {
    if (!auth.currentUser) {
      return [];
    }
    const licensesRef = collection(db, 'licenses');
    const snapshot = await getDocs(licensesRef);
    const list: FreeLicense[] = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as FreeLicense);
    });
    // Ordena da mais recente para a mais antiga
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (err: any) {
    console.error('Erro ao listar licenças:', err);
    if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.LIST, 'licenses');
    }
    return [];
  }
}

/**
 * Ativa ou desativa uma licença
 */
export async function toggleLicenseStatus(licenseId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'licenses', licenseId), {
    active
  });
}
