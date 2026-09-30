'use server';

import { db } from '@/src/db';
import { users, clients, quotes, installations, errorDiagnoses, materialsStock } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// -------------------------------------------------------------
// USUÁRIOS
// -------------------------------------------------------------
export async function syncUserAction(userData: { uid: string; email: string; name?: string; photoURL?: string }) {
  try {
    if (!userData.uid || !userData.email) return null;

    const res = await db.insert(users)
      .values({
        uid: userData.uid,
        email: userData.email,
        name: userData.name || null,
        photoURL: userData.photoURL || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: userData.email,
          ...(userData.name ? { name: userData.name } : {}),
          ...(userData.photoURL ? { photoURL: userData.photoURL } : {}),
        },
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error('Error syncing user to database:', error);
    return null;
  }
}

export async function getUserProfileAction(userUid: string) {
  try {
    if (!userUid) return null;
    const res = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('Error getting user profile from database:', error);
    return null;
  }
}

export async function updateUserProfileAction(userData: { uid: string; email: string; name: string; photoURL?: string }) {
  try {
    if (!userData.uid || !userData.email || !userData.name) return null;

    const res = await db.insert(users)
      .values({
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        photoURL: userData.photoURL || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: userData.email,
          name: userData.name,
          ...(userData.photoURL ? { photoURL: userData.photoURL } : {}),
        },
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error('Error updating user profile in database:', error);
    return null;
  }
}

// -------------------------------------------------------------
// CLIENTES
// -------------------------------------------------------------
export async function getClientsAction(userUid: string) {
  try {
    if (!userUid) return [];
    return await db.select().from(clients).where(eq(clients.userUid, userUid)).orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function saveClientAction(clientData: {
  id?: number;
  userUid: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  document?: string;
  notes?: string;
}) {
  try {
    if (clientData.id) {
      const res = await db.update(clients)
        .set({
          name: clientData.name,
          phone: clientData.phone || null,
          email: clientData.email || null,
          address: clientData.address || null,
          document: clientData.document || null,
          notes: clientData.notes || null,
        })
        .where(and(eq(clients.id, clientData.id), eq(clients.userUid, clientData.userUid)))
        .returning();
      return res[0];
    } else {
      const res = await db.insert(clients)
        .values({
          userUid: clientData.userUid,
          name: clientData.name,
          phone: clientData.phone || null,
          email: clientData.email || null,
          address: clientData.address || null,
          document: clientData.document || null,
          notes: clientData.notes || null,
        })
        .returning();
      return res[0];
    }
  } catch (error) {
    console.error('Error saving client:', error);
    throw new Error('Falha ao salvar cliente no banco de dados.');
  }
}

export async function deleteClientAction(id: number, userUid: string) {
  try {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('Error deleting client:', error);
    return false;
  }
}

// -------------------------------------------------------------
// ORÇAMENTOS
// -------------------------------------------------------------
export async function getQuotesAction(userUid: string) {
  try {
    if (!userUid) return [];
    return await db.select().from(quotes).where(eq(quotes.userUid, userUid)).orderBy(desc(quotes.createdAt));
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function saveQuoteAction(quoteData: {
  id?: number;
  userUid: string;
  clientName: string;
  clientPhone?: string;
  equipment?: string;
  description?: string;
  totalAmount: number;
  status?: string;
  validityDays?: number;
  items?: any[];
  notes?: string;
}) {
  try {
    const itemsJson = quoteData.items ? JSON.stringify(quoteData.items) : null;

    if (quoteData.id) {
      const res = await db.update(quotes)
        .set({
          clientName: quoteData.clientName,
          clientPhone: quoteData.clientPhone || null,
          equipment: quoteData.equipment || null,
          description: quoteData.description || null,
          totalAmount: quoteData.totalAmount,
          status: quoteData.status || 'pendente',
          validityDays: quoteData.validityDays || 15,
          items: itemsJson,
          notes: quoteData.notes || null,
        })
        .where(and(eq(quotes.id, quoteData.id), eq(quotes.userUid, quoteData.userUid)))
        .returning();
      return res[0];
    } else {
      const res = await db.insert(quotes)
        .values({
          userUid: quoteData.userUid,
          clientName: quoteData.clientName,
          clientPhone: quoteData.clientPhone || null,
          equipment: quoteData.equipment || null,
          description: quoteData.description || null,
          totalAmount: quoteData.totalAmount,
          status: quoteData.status || 'pendente',
          validityDays: quoteData.validityDays || 15,
          items: itemsJson,
          notes: quoteData.notes || null,
        })
        .returning();
      return res[0];
    }
  } catch (error) {
    console.error('Error saving quote:', error);
    throw new Error('Falha ao salvar orçamento no banco de dados.');
  }
}

export async function updateQuoteStatusAction(id: number, status: string, userUid: string) {
  try {
    const res = await db.update(quotes)
      .set({ status })
      .where(and(eq(quotes.id, id), eq(quotes.userUid, userUid)))
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error updating quote status:', error);
    return null;
  }
}

export async function deleteQuoteAction(id: number, userUid: string) {
  try {
    await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('Error deleting quote:', error);
    return false;
  }
}

// -------------------------------------------------------------
// ORDENS DE SERVIÇO / INSTALAÇÕES
// -------------------------------------------------------------
export async function getInstallationsAction(userUid: string) {
  try {
    if (!userUid) return [];
    return await db.select().from(installations).where(eq(installations.userUid, userUid)).orderBy(desc(installations.createdAt));
  } catch (error) {
    console.error('Error fetching installations:', error);
    return [];
  }
}

export async function saveInstallationAction(instData: {
  id?: number;
  userUid: string;
  clientName: string;
  clientPhone?: string;
  equipment: string;
  brand?: string;
  btus?: string;
  type?: string;
  status?: string;
  date: string;
  address?: string;
  value?: number;
  notes?: string;
  warrantyMonths?: number;
  qrCode?: string;
}) {
  try {
    if (instData.id) {
      const res = await db.update(installations)
        .set({
          clientName: instData.clientName,
          clientPhone: instData.clientPhone || null,
          equipment: instData.equipment,
          brand: instData.brand || null,
          btus: instData.btus || null,
          type: instData.type || 'instalacao',
          status: instData.status || 'agendado',
          date: instData.date,
          address: instData.address || null,
          value: instData.value || 0,
          notes: instData.notes || null,
          warrantyMonths: instData.warrantyMonths || 12,
          qrCode: instData.qrCode || null,
        })
        .where(and(eq(installations.id, instData.id), eq(installations.userUid, instData.userUid)))
        .returning();
      return res[0];
    } else {
      const res = await db.insert(installations)
        .values({
          userUid: instData.userUid,
          clientName: instData.clientName,
          clientPhone: instData.clientPhone || null,
          equipment: instData.equipment,
          brand: instData.brand || null,
          btus: instData.btus || null,
          type: instData.type || 'instalacao',
          status: instData.status || 'agendado',
          date: instData.date,
          address: instData.address || null,
          value: instData.value || 0,
          notes: instData.notes || null,
          warrantyMonths: instData.warrantyMonths || 12,
          qrCode: instData.qrCode || null,
        })
        .returning();
      return res[0];
    }
  } catch (error) {
    console.error('Error saving installation:', error);
    throw new Error('Falha ao salvar ordem de serviço no banco de dados.');
  }
}

export async function updateInstallationStatusAction(id: number, status: string, userUid: string) {
  try {
    const res = await db.update(installations)
      .set({ status })
      .where(and(eq(installations.id, id), eq(installations.userUid, userUid)))
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error updating installation status:', error);
    return null;
  }
}

export async function deleteInstallationAction(id: number, userUid: string) {
  try {
    await db.delete(installations).where(and(eq(installations.id, id), eq(installations.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('Error deleting installation:', error);
    return false;
  }
}

// -------------------------------------------------------------
// HISTÓRICO DE DIAGNÓSTICOS
// -------------------------------------------------------------
export async function getDiagnosesAction(userUid: string) {
  try {
    if (!userUid) return [];
    const rows = await db.select().from(errorDiagnoses).where(eq(errorDiagnoses.userUid, userUid)).orderBy(desc(errorDiagnoses.createdAt));
    return rows.map((r) => ({
      id: r.id,
      brand: r.brand,
      code: r.code,
      equipmentType: r.equipmentType,
      result: typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching diagnoses:', error);
    return [];
  }
}

export async function saveDiagnosisAction(diagData: {
  userUid: string;
  brand: string;
  code: string;
  equipmentType?: string;
  result: any;
}) {
  try {
    const res = await db.insert(errorDiagnoses)
      .values({
        userUid: diagData.userUid,
        brand: diagData.brand,
        code: diagData.code,
        equipmentType: diagData.equipmentType || null,
        result: JSON.stringify(diagData.result),
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error saving diagnosis log:', error);
    return null;
  }
}

// -------------------------------------------------------------
// ESTOQUE DE MATERIAIS
// -------------------------------------------------------------
export async function getStockAction(userUid: string) {
  try {
    if (!userUid) return [];
    return await db.select().from(materialsStock).where(eq(materialsStock.userUid, userUid)).orderBy(desc(materialsStock.createdAt));
  } catch (error) {
    console.error('Error fetching stock items:', error);
    return [];
  }
}

export async function saveStockItemAction(itemData: {
  id?: number;
  userUid: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  minQuantity?: number;
  unitCost?: number;
}) {
  try {
    if (itemData.id) {
      const res = await db.update(materialsStock)
        .set({
          name: itemData.name,
          category: itemData.category || 'fluido',
          quantity: itemData.quantity,
          unit: itemData.unit || 'un',
          minQuantity: itemData.minQuantity ?? 2,
          unitCost: itemData.unitCost ?? 0,
        })
        .where(and(eq(materialsStock.id, itemData.id), eq(materialsStock.userUid, itemData.userUid)))
        .returning();
      return res[0];
    } else {
      const res = await db.insert(materialsStock)
        .values({
          userUid: itemData.userUid,
          name: itemData.name,
          category: itemData.category || 'fluido',
          quantity: itemData.quantity,
          unit: itemData.unit || 'un',
          minQuantity: itemData.minQuantity ?? 2,
          unitCost: itemData.unitCost ?? 0,
        })
        .returning();
      return res[0];
    }
  } catch (error) {
    console.error('Error saving stock item:', error);
    throw new Error('Falha ao salvar item no estoque.');
  }
}

export async function updateStockQuantityAction(id: number, quantity: number, userUid: string) {
  try {
    const res = await db.update(materialsStock)
      .set({ quantity })
      .where(and(eq(materialsStock.id, id), eq(materialsStock.userUid, userUid)))
      .returning();
    return res[0];
  } catch (error) {
    console.error('Error updating stock quantity:', error);
    return null;
  }
}

export async function deleteStockItemAction(id: number, userUid: string) {
  try {
    await db.delete(materialsStock).where(and(eq(materialsStock.id, id), eq(materialsStock.userUid, userUid)));
    return true;
  } catch (error) {
    console.error('Error deleting stock item:', error);
    return false;
  }
}

// -------------------------------------------------------------
// CONSULTA PÚBLICA DE ORDEM DE SERVIÇO / PMOC (VIA LINK WHATSAPP)
// -------------------------------------------------------------
export async function getPublicInstallationAction(orderNumberOrId: string) {
  try {
    if (!orderNumberOrId) return null;
    const cleanId = decodeURIComponent(orderNumberOrId).trim();

    // Tenta buscar por ID numérico
    const numericId = parseInt(cleanId, 10);
    if (!isNaN(numericId) && numericId > 0 && String(numericId) === cleanId) {
      const byId = await db.select().from(installations).where(eq(installations.id, numericId)).limit(1);
      if (byId && byId.length > 0) return byId[0];
    }

    // Tenta buscar por qrCode / número da OS (ex: OS-2026-0001)
    const byQr = await db.select().from(installations).where(eq(installations.qrCode, cleanId)).limit(1);
    if (byQr && byQr.length > 0) return byQr[0];

    return null;
  } catch (error) {
    console.error('Error fetching public installation:', error);
    return null;
  }
}

