'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { triggerDirectLauncherDownload } from '@/components/MobileInstallBanner';

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any)?.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    if ((window as any).__amigoDeferredPrompt) {
      setDeferredPrompt((window as any).__amigoDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__amigoDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      (window as any).__amigoDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).__amigoDeferredPrompt;
    if (promptEvent) {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      (window as any).__amigoDeferredPrompt = null;
      setDeferredPrompt(null);
      return;
    }

    triggerDirectLauncherDownload();
    setIsInstalled(true);
  };

  if (!mounted || isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-slate-900/95 border border-sky-500/30 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.4)]">
          <Smartphone size={20} />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>Instalar Aplicativo</span>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase">
              PWA
            </span>
          </h4>
          <p className="text-[11px] text-slate-300">
            Instale direto na sua tela inicial com 1 clique.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Download size={14} />
          <span>Instalar Agora</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
