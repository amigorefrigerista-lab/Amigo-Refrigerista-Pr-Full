import { supabaseService, SupabaseWorkOrder } from './supabase';

const PENDING_QUEUE_KEY = 'amigo_offline_os_queue';
const LOCAL_ORDERS_KEY = 'amigo_work_orders';

export interface PendingSyncItem {
  id: string;
  action: 'upsert' | 'delete';
  order: SupabaseWorkOrder;
  timestamp: number;
}

export const offlineSyncManager = {
  // Get pending offline sync queue
  getPendingQueue(): PendingSyncItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PENDING_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save order offline (upsert) and add to sync queue if offline or failed
  async saveWorkOrderOfflineFirst(order: SupabaseWorkOrder, userId: string): Promise<{ order: SupabaseWorkOrder; synced: boolean }> {
    if (typeof window === 'undefined') return { order, synced: false };

    const orderId = order.id || 'os-' + Date.now();
    const enrichedOrder: SupabaseWorkOrder = {
      ...order,
      id: orderId,
      user_id: userId,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Save locally immediately (Offline First)
    try {
      const existingRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
      const orders: SupabaseWorkOrder[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedOrders = [enrichedOrder, ...orders.filter(o => o.id !== orderId)];
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch (err) {
      console.error('Error saving OS locally:', err);
    }

    // 2. Check online status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Queue for background sync
      this.addToQueue({
        id: orderId,
        action: 'upsert',
        order: enrichedOrder,
        timestamp: Date.now(),
      });
      return { order: enrichedOrder, synced: false };
    }

    // 3. Try syncing with Supabase
    try {
      const saved = await supabaseService.saveWorkOrder(enrichedOrder, userId);
      return { order: saved || enrichedOrder, synced: true };
    } catch (err) {
      // Network failed or offline, add to queue
      this.addToQueue({
        id: orderId,
        action: 'upsert',
        order: enrichedOrder,
        timestamp: Date.now(),
      });
      return { order: enrichedOrder, synced: false };
    }
  },

  // Delete work order offline first
  async deleteWorkOrderOfflineFirst(orderId: string, userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Remove locally immediately
    try {
      const existingRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
      const orders: SupabaseWorkOrder[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedOrders = orders.filter(o => o.id !== orderId);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updatedOrders));
    } catch {}

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      this.addToQueue({
        id: orderId,
        action: 'delete',
        order: { id: orderId, cliente_nome: '', equipamento: '', status: '' },
        timestamp: Date.now(),
      });
      return false;
    }

    try {
      await supabaseService.deleteWorkOrder(orderId, userId);
      return true;
    } catch {
      this.addToQueue({
        id: orderId,
        action: 'delete',
        order: { id: orderId, cliente_nome: '', equipamento: '', status: '' },
        timestamp: Date.now(),
      });
      return false;
    }
  },

  addToQueue(item: PendingSyncItem) {
    if (typeof window === 'undefined') return;
    try {
      const queue = this.getPendingQueue();
      const filtered = queue.filter(q => q.id !== item.id);
      filtered.push(item);
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('amigo-sync-queue-updated', { detail: { count: filtered.length } }));
    } catch {}
  },

  // Sync all pending items with Supabase
  async syncPendingQueue(userId: string): Promise<{ successCount: number; failCount: number }> {
    if (typeof window === 'undefined' || !navigator.onLine) return { successCount: 0, failCount: 0 };
    const queue = this.getPendingQueue();
    if (queue.length === 0) return { successCount: 0, failCount: 0 };

    let successCount = 0;
    let failCount = 0;
    const remainingQueue: PendingSyncItem[] = [];

    for (const item of queue) {
      try {
        if (item.action === 'upsert') {
          await supabaseService.saveWorkOrder(item.order, userId);
        } else if (item.action === 'delete') {
          await supabaseService.deleteWorkOrder(item.id, userId);
        }
        successCount++;
      } catch (err) {
        failCount++;
        remainingQueue.push(item);
      }
    }

    try {
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remainingQueue));
      window.dispatchEvent(new CustomEvent('amigo-sync-queue-updated', { detail: { count: remainingQueue.length } }));
    } catch {}

    return { successCount, failCount };
  }
};
