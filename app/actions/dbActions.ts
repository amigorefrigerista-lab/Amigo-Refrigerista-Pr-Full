function getClientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  try {
    const sbTokenRaw = localStorage.getItem('amigo-refrigerista-auth-token');
    if (sbTokenRaw) {
      const parsed = JSON.parse(sbTokenRaw);
      const token = parsed?.access_token || parsed?.currentSession?.access_token;
      if (token && typeof token === 'string') {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const sessionToken = sessionStorage.getItem('amigo_hmac_session');
    if (sessionToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
  } catch {
    // ignore storage errors
  }
  return headers;
}

async function callDbApi<T>(action: string, payload: any, fallbackValue: T): Promise<T> {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) return fallbackValue;
    const json = await res.json();
    if (json && json.ok && json.data !== undefined && json.data !== null) {
      return json.data as T;
    }
    return fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function readLocalList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalList<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

// -------------------------------------------------------------
// USUÁRIOS
// -------------------------------------------------------------
export async function syncUserAction(userData: {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
}) {
  if (!userData.uid || !userData.email) return null;
  const fallback = {
    id: 1,
    uid: userData.uid,
    email: userData.email,
    name: userData.name || userData.email.split('@')[0],
    photoURL: userData.photoURL || null,
  };
  return await callDbApi('syncUser', userData, fallback);
}

export async function getUserProfileAction(userUid: string) {
  if (!userUid) return null;
  return await callDbApi<any>('getUserProfile', { userUid }, null);
}

export async function updateUserProfileAction(userData: {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
}) {
  if (!userData.uid || !userData.email || !userData.name) return null;
  const fallback = {
    id: 1,
    uid: userData.uid,
    email: userData.email,
    name: userData.name,
    photoURL: userData.photoURL || null,
  };
  return await callDbApi('updateUserProfile', userData, fallback);
}

// -------------------------------------------------------------
// CLIENTES
// -------------------------------------------------------------
export async function getClientsAction(userUid: string) {
  if (!userUid) return [];
  const localKey = `amigo_clients_${userUid}`;
  const localData = readLocalList<any>(localKey);
  const remote = await callDbApi<any[]>('getClients', { userUid }, localData);
  if (Array.isArray(remote) && remote.length > 0) {
    writeLocalList(localKey, remote);
    return remote;
  }
  return localData;
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
  const localKey = `amigo_clients_${clientData.userUid}`;
  const fallbackItem = {
    id: clientData.id || Date.now(),
    userUid: clientData.userUid,
    name: clientData.name,
    phone: clientData.phone || null,
    email: clientData.email || null,
    address: clientData.address || null,
    document: clientData.document || null,
    notes: clientData.notes || null,
    createdAt: new Date().toISOString(),
  };

  const saved = await callDbApi('saveClient', clientData, fallbackItem);
  const current = readLocalList<any>(localKey);
  const next = clientData.id
    ? current.map((c) => (c.id === clientData.id ? saved : c))
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function deleteClientAction(id: number, userUid: string) {
  const localKey = `amigo_clients_${userUid}`;
  await callDbApi('deleteClient', { id, userUid }, true);
  const current = readLocalList<any>(localKey);
  writeLocalList(
    localKey,
    current.filter((c) => c.id !== id)
  );
  return true;
}

// -------------------------------------------------------------
// ORÇAMENTOS
// -------------------------------------------------------------
export async function getQuotesAction(userUid: string) {
  if (!userUid) return [];
  const localKey = `amigo_quotes_${userUid}`;
  const localData = readLocalList<any>(localKey);
  const remote = await callDbApi<any[]>('getQuotes', { userUid }, localData);
  if (Array.isArray(remote) && remote.length > 0) {
    writeLocalList(localKey, remote);
    return remote;
  }
  return localData;
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
  const localKey = `amigo_quotes_${quoteData.userUid}`;
  const fallbackItem = {
    id: quoteData.id || Date.now(),
    userUid: quoteData.userUid,
    clientName: quoteData.clientName,
    clientPhone: quoteData.clientPhone || null,
    equipment: quoteData.equipment || null,
    description: quoteData.description || null,
    totalAmount: quoteData.totalAmount,
    status: quoteData.status || 'pendente',
    validityDays: quoteData.validityDays || 15,
    items: quoteData.items ? JSON.stringify(quoteData.items) : null,
    notes: quoteData.notes || null,
    createdAt: new Date().toISOString(),
  };

  const saved = await callDbApi('saveQuote', quoteData, fallbackItem);
  const current = readLocalList<any>(localKey);
  const next = quoteData.id
    ? current.map((q) => (q.id === quoteData.id ? saved : q))
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function updateQuoteStatusAction(id: number, status: string, userUid: string) {
  const localKey = `amigo_quotes_${userUid}`;
  const current = readLocalList<any>(localKey);
  const existing = current.find((q) => q.id === id) || { id, status, userUid };
  const updatedFallback = { ...existing, status };
  const saved = await callDbApi('updateQuoteStatus', { id, status, userUid }, updatedFallback);
  writeLocalList(
    localKey,
    current.map((q) => (q.id === id ? saved : q))
  );
  return saved;
}

export async function deleteQuoteAction(id: number, userUid: string) {
  const localKey = `amigo_quotes_${userUid}`;
  await callDbApi('deleteQuote', { id, userUid }, true);
  const current = readLocalList<any>(localKey);
  writeLocalList(
    localKey,
    current.filter((q) => q.id !== id)
  );
  return true;
}

// -------------------------------------------------------------
// ORDENS DE SERVIÇO / INSTALAÇÕES
// -------------------------------------------------------------
export async function getInstallationsAction(userUid: string) {
  if (!userUid) return [];
  const localKey = `amigo_installations_${userUid}`;
  const localData = readLocalList<any>(localKey);
  const remote = await callDbApi<any[]>('getInstallations', { userUid }, localData);
  if (Array.isArray(remote) && remote.length > 0) {
    writeLocalList(localKey, remote);
    return remote;
  }
  return localData;
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
  const localKey = `amigo_installations_${instData.userUid}`;
  const fallbackItem = {
    id: instData.id || Date.now(),
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
    createdAt: new Date().toISOString(),
  };

  const saved = await callDbApi('saveInstallation', instData, fallbackItem);
  const current = readLocalList<any>(localKey);
  const next = instData.id
    ? current.map((i) => (i.id === instData.id ? saved : i))
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function updateInstallationStatusAction(
  id: number | string,
  status: string,
  userUid: string = 'public'
) {
  const numericId = typeof id === 'number' ? id : Number(id);
  const resolvedId = Number.isNaN(numericId) ? id : numericId;
  const localKey = `amigo_installations_${userUid}`;
  const current = readLocalList<any>(localKey);
  const existing = current.find((i) => String(i.id) === String(resolvedId)) || {
    id: resolvedId,
    status,
    userUid,
  };
  const updatedFallback = { ...existing, status };
  const saved = await callDbApi(
    'updateInstallationStatus',
    { id: resolvedId, status, userUid },
    updatedFallback
  );
  writeLocalList(
    localKey,
    current.map((i) => (String(i.id) === String(resolvedId) ? saved : i))
  );
  return saved;
}

export async function updateInstallationDetailsAction(updateData: {
  id: number | string;
  orderNumber?: string;
  userUid?: string;
  clientName?: string;
  address?: string;
  equipment?: string;
  brand?: string;
  btus?: string;
  status?: string;
  notes?: string;
  customerNotes?: string;
  customerSignature?: string | null;
}) {
  const userUid = updateData.userUid || 'public';
  const numericId = typeof updateData.id === 'number' ? updateData.id : Number(updateData.id);
  const resolvedId = Number.isNaN(numericId) ? updateData.id : numericId;
  const localKey = `amigo_installations_${userUid}`;
  const current = readLocalList<any>(localKey);
  const existing = current.find(
    (i) =>
      String(i.id) === String(resolvedId) ||
      (updateData.orderNumber && i.qrCode === updateData.orderNumber)
  ) || {
    id: resolvedId,
    qrCode: updateData.orderNumber || String(resolvedId),
    userUid,
  };

  const combinedNotes = updateData.customerNotes
    ? `${updateData.notes || existing.notes || ''}\n[Customer Notes]: ${updateData.customerNotes}`.trim()
    : updateData.notes ?? existing.notes ?? null;

  const updatedFallback = {
    ...existing,
    ...(updateData.clientName !== undefined ? { clientName: updateData.clientName } : {}),
    ...(updateData.address !== undefined ? { address: updateData.address } : {}),
    ...(updateData.equipment !== undefined ? { equipment: updateData.equipment } : {}),
    ...(updateData.brand !== undefined ? { brand: updateData.brand } : {}),
    ...(updateData.btus !== undefined ? { btus: updateData.btus } : {}),
    ...(updateData.status !== undefined ? { status: updateData.status } : {}),
    notes: combinedNotes,
    customerNotes: updateData.customerNotes ?? existing.customerNotes ?? '',
    customerSignature:
      updateData.customerSignature !== undefined
        ? updateData.customerSignature
        : existing.customerSignature || null,
  };

  const saved = await callDbApi(
    'updateInstallationDetails',
    {
      ...updateData,
      id: resolvedId,
      userUid,
      notes: combinedNotes,
    },
    updatedFallback
  );

  const next = current.some((i) => String(i.id) === String(resolvedId))
    ? current.map((i) => (String(i.id) === String(resolvedId) ? saved : i))
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function saveCustomerSignatureAction(sigData: {
  id?: number | string | null;
  orderNumber?: string;
  userUid?: string;
  clientName?: string;
  equipment?: string;
  customerSignature: string;
}) {
  const userUid = sigData.userUid || 'public';
  const rawId = sigData.id || sigData.orderNumber || `OS-${Date.now()}`;
  const numericId = typeof rawId === 'number' ? rawId : Number(rawId);
  const resolvedId = Number.isNaN(numericId) ? rawId : numericId;
  const localKey = `amigo_installations_${userUid}`;
  const current = readLocalList<any>(localKey);
  const existing = current.find(
    (i) =>
      String(i.id) === String(resolvedId) ||
      (sigData.orderNumber && i.qrCode === sigData.orderNumber)
  ) || {
    id: resolvedId,
    qrCode: sigData.orderNumber || String(resolvedId),
    userUid,
    clientName: sigData.clientName || 'Cliente Amigo',
    equipment: sigData.equipment || 'Equipamento de Ar-Condicionado',
    status: 'concluido',
    date: new Date().toISOString().split('T')[0],
  };

  const updatedFallback = {
    ...existing,
    customerSignature: sigData.customerSignature,
  };

  const saved = await callDbApi(
    'saveCustomerSignature',
    {
      ...sigData,
      id: resolvedId,
      userUid,
    },
    updatedFallback
  );

  const next = current.some(
    (i) =>
      String(i.id) === String(resolvedId) ||
      (sigData.orderNumber && i.qrCode === sigData.orderNumber)
  )
    ? current.map((i) =>
        String(i.id) === String(resolvedId) ||
        (sigData.orderNumber && i.qrCode === sigData.orderNumber)
          ? saved
          : i
      )
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function deleteInstallationAction(id: number, userUid: string) {
  const localKey = `amigo_installations_${userUid}`;
  await callDbApi('deleteInstallation', { id, userUid }, true);
  const current = readLocalList<any>(localKey);
  writeLocalList(
    localKey,
    current.filter((i) => i.id !== id)
  );
  return true;
}

// -------------------------------------------------------------
// HISTÓRICO DE DIAGNÓSTICOS
// -------------------------------------------------------------
export async function getDiagnosesAction(userUid: string) {
  if (!userUid) return [];
  const localKey = `amigo_diagnoses_${userUid}`;
  const localData = readLocalList<any>(localKey);
  const remote = await callDbApi<any[]>('getDiagnoses', { userUid }, localData);
  if (Array.isArray(remote) && remote.length > 0) {
    writeLocalList(localKey, remote);
    return remote;
  }
  return localData;
}

export async function saveDiagnosisAction(diagData: {
  userUid: string;
  brand: string;
  code: string;
  equipmentType?: string;
  result: any;
}) {
  const localKey = `amigo_diagnoses_${diagData.userUid}`;
  const fallbackItem = {
    id: Date.now(),
    brand: diagData.brand,
    code: diagData.code,
    equipmentType: diagData.equipmentType || null,
    result: diagData.result,
    createdAt: new Date().toISOString(),
  };

  const saved = await callDbApi('saveDiagnosis', diagData, fallbackItem);
  const current = readLocalList<any>(localKey);
  writeLocalList(localKey, [saved, ...current].slice(0, 50));
  return saved;
}

// -------------------------------------------------------------
// ESTOQUE DE MATERIAIS
// -------------------------------------------------------------
export async function getStockAction(userUid: string) {
  if (!userUid) return [];
  const localKey = `amigo_stock_${userUid}`;
  const localData = readLocalList<any>(localKey);
  const remote = await callDbApi<any[]>('getStock', { userUid }, localData);
  if (Array.isArray(remote) && remote.length > 0) {
    writeLocalList(localKey, remote);
    return remote;
  }
  return localData;
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
  const localKey = `amigo_stock_${itemData.userUid}`;
  const fallbackItem = {
    id: itemData.id || Date.now(),
    userUid: itemData.userUid,
    name: itemData.name,
    category: itemData.category || 'fluido',
    quantity: itemData.quantity,
    unit: itemData.unit || 'un',
    minQuantity: itemData.minQuantity ?? 2,
    unitCost: itemData.unitCost ?? 0,
    createdAt: new Date().toISOString(),
  };

  const saved = await callDbApi('saveStockItem', itemData, fallbackItem);
  const current = readLocalList<any>(localKey);
  const next = itemData.id
    ? current.map((i) => (i.id === itemData.id ? saved : i))
    : [saved, ...current];
  writeLocalList(localKey, next);
  return saved;
}

export async function updateStockQuantityAction(id: number, quantity: number, userUid: string) {
  const localKey = `amigo_stock_${userUid}`;
  const current = readLocalList<any>(localKey);
  const existing = current.find((i) => i.id === id) || { id, quantity, userUid };
  const updatedFallback = { ...existing, quantity };
  const saved = await callDbApi('updateStockQuantity', { id, quantity, userUid }, updatedFallback);
  writeLocalList(
    localKey,
    current.map((i) => (i.id === id ? saved : i))
  );
  return saved;
}

export async function deleteStockItemAction(id: number, userUid: string) {
  const localKey = `amigo_stock_${userUid}`;
  await callDbApi('deleteStockItem', { id, userUid }, true);
  const current = readLocalList<any>(localKey);
  writeLocalList(
    localKey,
    current.filter((i) => i.id !== id)
  );
  return true;
}

// -------------------------------------------------------------
// CONSULTA PÚBLICA DE ORDEM DE SERVIÇO / PMOC
// -------------------------------------------------------------
export async function getPublicInstallationAction(orderNumberOrId: string): Promise<any> {
  if (!orderNumberOrId) return null;
  return await callDbApi<any>('getPublicInstallation', { orderNumberOrId }, null);
}
