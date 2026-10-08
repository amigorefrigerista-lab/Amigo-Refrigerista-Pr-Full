import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __amigoDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function openPWAInstallModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install-modal'));
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Detect standalone mode (already installed)
    const checkStandalone = () =>
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true;

    setIsInstalled(checkStandalone());

    // Detect if running inside an iframe (e.g., preview iframe where browsers block beforeinstallprompt)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Detect mobile devices (iOS or Android)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isIOSDevice || isAndroidDevice);

    if (window.__amigoDeferredPrompt) {
      setDeferredPrompt(window.__amigoDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__amigoDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePwaReady = () => {
      if (window.__amigoDeferredPrompt) {
        setDeferredPrompt(window.__amigoDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__amigoDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('amigo-pwa-ready', handlePwaReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('amigo-pwa-installed', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('amigo-pwa-ready', handlePwaReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('amigo-pwa-installed', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__amigoDeferredPrompt : null);
    if (!promptEvent) {
      openPWAInstallModal();
      return false;
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (typeof window !== 'undefined') {
          window.__amigoDeferredPrompt = null;
        }
        setDeferredPrompt(null);
        return true;
      }
    } catch {
      openPWAInstallModal();
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!(deferredPrompt || (typeof window !== 'undefined' && window.__amigoDeferredPrompt)),
    isInstalled,
    isStandalone: isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    isInIframe,
    install,
    openInstallModal: openPWAInstallModal,
  };
}

