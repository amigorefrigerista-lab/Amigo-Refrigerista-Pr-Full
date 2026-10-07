'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

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

export function triggerDirectLauncherDownload() {
  if (typeof window === 'undefined') return;

  const appUrl = window.location.origin;
  const iconUrl = `${appUrl}/icon-512.png`;

  const launcherHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#070e1c" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="AmigoRefri" />
  <title>Amigo Refrigerista Pro</title>
  <link rel="icon" type="image/png" href="${iconUrl}" />
  <link rel="apple-touch-icon" href="${iconUrl}" />
  <meta http-equiv="refresh" content="0; url=${appUrl}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #070e1c;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #0f172a;
      border: 1px solid rgba(14, 165, 233, 0.35);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .logo {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      margin: 0 auto 16px;
      display: block;
      box-shadow: 0 0 25px rgba(14, 165, 233, 0.4);
    }
    h1 { font-size: 20px; font-weight: 900; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      background: linear-gradient(90deg, #0ea5e9, #22d3ee);
      color: #020617;
      font-weight: 900;
      font-size: 14px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${iconUrl}" alt="Amigo Refrigerista Pro" class="logo" />
    <h1>Amigo Refrigerista Pro</h1>
    <p>Iniciando o aplicativo oficial...</p>
    <a href="${appUrl}" class="btn">Abrir Amigo Refrigerista Pro</a>
  </div>
  <script>
    window.location.replace("${appUrl}");
  </script>
</body>
</html>`;

  const blob = new Blob([launcherHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'Amigo-Refrigerista-Pro.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

export function MobileInstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const checkStandalone = () => {
      const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
      return standaloneMatch || iosStandalone;
    };

    setIsStandalone(checkStandalone());

    const ua = window.navigator?.userAgent?.toLowerCase() || '';
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator?.platform === 'MacIntel' && window.navigator?.maxTouchPoints > 1);
    const androidDevice = /android/.test(ua);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    if (window.__amigoDeferredPrompt) {
      setDeferredPrompt(window.__amigoDeferredPrompt);
    }

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
      }, 2500);
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

      // 1. Se o navegador tiver o instalador nativo pronto, dispara imediatamente
      if (promptToUse) {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          setInstalledNow(true);
          window.__amigoDeferredPrompt = null;
          setDeferredPrompt(null);
          setTimeout(() => setIsStandalone(true), 2500);
          return;
        }
      }

      // 2. Faz o download imediato do arquivo executável/atalho do aplicativo para o dispositivo
      triggerDirectLauncherDownload();
      setInstalledNow(true);
    } catch (err) {
      console.warn('Erro ao iniciar download/instalação direta:', err);
      triggerDirectLauncherDownload();
      setInstalledNow(true);
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted || isStandalone || dismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Baixar e instalar aplicativo no celular"
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
                {installedNow ? 'Download do Aplicativo Concluído!' : 'Amigo Refrigerista Pro'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {isIOS ? 'iOS' : isAndroid ? 'Android' : 'App'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
              {installedNow
                ? 'O arquivo do aplicativo foi baixado no seu aparelho. Abra o arquivo baixado para iniciar.'
                : 'Baixe e instale o aplicativo direto no seu celular para acesso rápido.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDirectInstall}
            disabled={installing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>
              {installing
                ? 'Baixando...'
                : installedNow
                ? 'Baixar Novamente'
                : 'Instalar Aplicativo'}
            </span>
          </button>

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
