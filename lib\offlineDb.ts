export interface OfflineClient {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: any[];
  equipment?: any[];
  history?: any[];
  updatedAt: string;
}

export async function saveOfflineClient(client: OfflineClient): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('amigo_offline_clients') || '[]';
    const list: OfflineClient[] = JSON.parse(raw);
    const index = list.findIndex(c => c.id === client.id);
    if (index >= 0) {
      list[index] = client;
    } else {
      list.push(client);
    }
    localStorage.setItem('amigo_offline_clients', JSON.stringify(list));
  } catch (err) {
    console.error('Error saving offline client:', err);
  }
}

export function getOfflineClients(): OfflineClient[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('amigo_offline_clients') || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
