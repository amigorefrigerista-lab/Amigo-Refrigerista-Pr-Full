'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, Sparkles } from 'lucide-react';

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // Detecta se já está no modo instalado (standalone)
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any)?.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detecta aparelhos iOS
    const ua = window.navigator?.userAgent?.toLowerCase() || '';
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Escuta o evento do navegador informando que o app pode ser instalado
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
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
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!mounted || isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
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
              Acesse mais rápido direto da sua tela inicial offline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Download size={14} />
            <span>Instalar</span>
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

      {/* Modal Guia do iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone size={18} className="text-sky-400" />
                <span>Instalar no iPhone / iPad</span>
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta no Safari).<br />
              2. Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. Confirme em <strong>Adicionar</strong> no canto superior.
            </p>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallPrompt;
