'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __amigoDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function MobileInstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // Registra o Service Worker para garantir que o navegador habilite a instalação direta (beforeinstallprompt)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 1. Verifica se já está instalado (standalone)
    const checkStandalone = () => {
      const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
      return standaloneMatch || iosStandalone;
    };

    const currentStandalone = checkStandalone();
    setIsStandalone(currentStandalone);

    // Detecta se está rodando dentro de um iframe (como o preview)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // 2. Detecta dispositivo (iOS / Android / Mobile)
    const ua = window.navigator?.userAgent?.toLowerCase() || '';
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator?.platform === 'MacIntel' && window.navigator?.maxTouchPoints > 1);
    const androidDevice = /android/.test(ua);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);
    setIsMobile(!currentStandalone);

    // Recupera prompt global caso já tenha sido disparado antes da montagem
    if (window.__amigoDeferredPrompt) {
      setDeferredPrompt(window.__amigoDeferredPrompt);
    }

    // 3. Captura o evento 'beforeinstallprompt' para instalação direta
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__amigoDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledNow(true);
      setTimeout(() => {
        setIsStandalone(true);
      }, 2000);
      window.__amigoDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      const promptToUse = deferredPrompt || window.__amigoDeferredPrompt;

      // 1. Dispara diretamente o instalador nativo do sistema operacional quando disponível
      if (promptToUse) {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          setInstalledNow(true);
          window.__amigoDeferredPrompt = null;
          setDeferredPrompt(null);
          setTimeout(() => setIsStandalone(true), 2000);
        }
        return;
      }

      // 2. Se estiver dentro de um iframe (onde o navegador bloqueia beforeinstallprompt),
      // abre ou redireciona diretamente para a URL principal com parâmetro de instalação automática
      if (isInIframe && typeof window !== 'undefined') {
        const directUrl = `${window.location.origin}/?install=direct`;
        window.top ? (window.top.location.href = directUrl) : (window.location.href = directUrl);
        return;
      }

      // 3. Em dispositivos Android sem o evento ainda engatilhado, aciona o intent direto do Chrome para a URL atual
      if (isAndroid && typeof window !== 'undefined') {
        const hostAndPath = `${window.location.host}${window.location.pathname}`;
        const protocol = window.location.protocol.replace(':', '');
        window.location.href = `intent://${hostAndPath}#Intent;scheme=${protocol};package=com.android.chrome;end`;
        return;
      }

      // 4. Em outros navegadores, força atualização do Service Worker e tenta disparar o prompt capturado
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await reg.update();
      }

      if (window.__amigoDeferredPrompt) {
        await window.__amigoDeferredPrompt.prompt();
      }
    } catch (err) {
      console.warn('Erro ao iniciar instalação direta:', err);
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted || isStandalone || !isMobile || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo no celular"
      className="w-full bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_25px_rgba(14,165,233,0.2)] mb-4 animate-in fade-in slide-in-from-top-3 duration-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.45)]">
            {installedNow ? (
              <CheckCircle2 size={20} strokeWidth={2.5} />
            ) : (
              <Smartphone size={20} strokeWidth={2.5} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {installedNow ? 'Aplicativo Instalado!' : 'Amigo Refrigerista Pro'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {isIOS ? 'iOS' : isAndroid ? 'Android' : 'App'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug line-clamp-1 mt-0.5">
              {installedNow
                ? 'O aplicativo já foi adicionado à sua tela inicial.'
                : 'Instale o aplicativo direto no seu celular para acesso rápido.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!installedNow && (
            <button
              type="button"
              onClick={handleDirectInstall}
              disabled={installing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isInIframe && !deferredPrompt ? (
                <ExternalLink size={14} strokeWidth={2.5} />
              ) : (
                <Download size={14} strokeWidth={2.5} />
              )}
              <span>{installing ? 'Instalando...' : 'Instalar Aplicativo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar"
            aria-label="Fechar aviso de instalação"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileInstallBanner;
