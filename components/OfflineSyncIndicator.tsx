'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { offlineSyncManager } from '@/lib/offlineSyncManager';

interface OfflineSyncIndicatorProps {
  userId?: string;
  onSynced?: () => void;
}

export default function OfflineSyncIndicator({ userId, onSynced }: OfflineSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const triggerSync = useCallback(async (uid: string) => {
    const queue = offlineSyncManager.getPendingQueue();
    if (queue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage('Sincronizando OS pendentes...');
    try {
      const { successCount, failCount } = await offlineSyncManager.syncPendingQueue(uid);
      if (successCount > 0) {
        setSyncMessage(`${successCount} OS sincronizadas com o Supabase!`);
        if (onSynced) onSynced();
        setTimeout(() => setSyncMessage(null), 4000);
      } else if (failCount > 0) {
        setSyncMessage(`Falha ao sincronizar ${failCount} OS.`);
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage(null);
      }
    } catch {
      setSyncMessage('Erro na sincronização.');
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncing(false);
      setPendingCount(offlineSyncManager.getPendingQueue().length);
    }
  }, [isSyncing, onSynced]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(offlineSyncManager.getPendingQueue().length);

    const handleOnline = async () => {
      setIsOnline(true);
      if (userId) {
        triggerSync(userId);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdate = (e: any) => {
      if (e?.detail?.count !== undefined) {
        setPendingCount(e.detail.count);
      } else {
        setPendingCount(offlineSyncManager.getPendingQueue().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('amigo-sync-queue-updated', handleQueueUpdate as EventListener);

    // Initial check sync if online
    if (navigator.onLine && userId) {
      triggerSync(userId);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('amigo-sync-queue-updated', handleQueueUpdate as EventListener);
    };
  }, [userId, triggerSync]);

  if (isOnline && pendingCount === 0 && !syncMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-slate-950/95 border border-slate-800 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-2xl text-xs text-white animate-fade-in">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        ) : (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
        )}

        <div className="flex items-center gap-1.5 font-semibold">
          {isOnline ? (
            <Wifi size={14} className="text-emerald-400" />
          ) : (
            <WifiOff size={14} className="text-rose-400" />
          )}
          <span>{isOnline ? 'Online' : 'Modo Offline'}</span>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 text-amber-400 font-mono">
          <AlertCircle size={13} />
          <span>{pendingCount} OS pendente{pendingCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {syncMessage && (
        <span className="text-[11px] text-sky-400 font-medium pl-2 border-l border-slate-800 animate-pulse">
          {syncMessage}
        </span>
      )}

      {userId && pendingCount > 0 && isOnline && (
        <button
          type="button"
          disabled={isSyncing}
          onClick={() => triggerSync(userId)}
          className="ml-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-slate-950 font-bold px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1 transition cursor-pointer"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          <span>Sincronizar</span>
        </button>
      )}
    </div>
  );
}
