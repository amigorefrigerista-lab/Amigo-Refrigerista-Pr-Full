'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';

interface CspNonceContextValue {
  nonce: string;
}

const CspNonceContext = createContext<CspNonceContextValue>({
  nonce: '',
});

declare global {
  interface Window {
    __amigoCspNonce?: string;
  }
}

export function CspScriptProvider({
  nonce = '',
  children,
}: {
  nonce?: string;
  children: React.ReactNode;
}) {
  // Mantém o nonce gerado no servidor estável durante todo o ciclo de hidratação e re-renderizações no cliente
  const stableNonceRef = useRef<string>(nonce || '');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (stableNonceRef.current) {
      window.__amigoCspNonce = stableNonceRef.current;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__amigoDeferredPrompt = e;
      window.dispatchEvent(new CustomEvent('amigo-pwa-ready'));
    };

    const handleAppInstalled = () => {
      (window as any).__amigoDeferredPrompt = null;
      window.dispatchEvent(new CustomEvent('amigo-pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((k) => {
            if (k.indexOf('v7') === -1) {
              caches.delete(k);
            }
          });
        })
        .catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      const registerSw = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            reg.update();
          })
          .catch(() => {});
      };

      if (document.readyState === 'complete') {
        registerSw();
      } else {
        window.addEventListener('load', registerSw, { once: true });
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return (
    <CspNonceContext.Provider value={{ nonce: stableNonceRef.current }}>
      {children}
    </CspNonceContext.Provider>
  );
}

export function useCspNonce(): string {
  return useContext(CspNonceContext).nonce;
}
