'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function MobileInstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileOrInstallable, setIsMobileOrInstallable] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // 1. Verifica se o navegador está em modo standalone (já instalado como PWA)
    const checkStandalone = () => {
      const standaloneMatch = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
      return standaloneMatch || iosStandalone;
    };

    const currentStandalone = checkStandalone();
    setIsStandalone(currentStandalone);

    // 2. Detecta se está em um dispositivo móvel (iOS ou Android), tela mobile ou navegador com suporte a instalação
    const detectEnvironment = () => {
      const ua = window.navigator?.userAgent?.toLowerCase() || '';
      const iosDevice =
        /iphone|ipad|ipod/.test(ua) ||
        (window.navigator?.platform === 'MacIntel' && window.navigator?.maxTouchPoints > 1);
      const androidDevice = /android/.test(ua);
      const mobileUA = /mobile|tablet|android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini/.test(ua);
      const smallViewport = window.innerWidth <= 1024;
      const hasTouch = (window.navigator?.maxTouchPoints ?? 0) > 0;

      setIsIOS(iosDevice);
      setIsAndroid(androidDevice);
      // Permite exibir em dispositivos móveis reais (iOS/Android), viewports mobile/touch ou no preview web quando standalone === false
      setIsMobileOrInstallable(iosDevice || androidDevice || mobileUA || smallViewport || hasTouch || !currentStandalone);
    };

    detectEnvironment();

    // 3. Escuta o evento 'beforeinstallprompt' para dispositivos Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsMobileOrInstallable(true);
    };

    // 4. Escuta quando o app é instalado com sucesso
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    // Escuta mudanças no display-mode e redimensionamento de tela
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('resize', detectEnvironment);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('resize', detectEnvironment);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallAction = async () => {
    // Se for Android / Chromium e tivermos o evento nativo 'beforeinstallprompt' capturado, dispara o prompt nativo
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Erro ao acionar prompt de instalação:', err);
        setShowGuideModal(true);
      }
      return;
    }

    // Caso seja iOS ou o navegador Android/Web ainda não tenha emitido o beforeinstallprompt, abre o guia passo a passo
    setShowGuideModal(true);
  };

  // Exibe apenas quando montado, standalone === false, e não dispensado pelo usuário
  if (!mounted || isStandalone || !isMobileOrInstallable || dismissed) {
    return null;
  }

  return (
    <>
      <div
        role="region"
        aria-label="Aviso para baixar o aplicativo no celular"
        className="w-full bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_25px_rgba(14,165,233,0.2)] mb-4 animate-in fade-in slide-in-from-top-3 duration-300"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.45)]">
              <Smartphone size={20} strokeWidth={2.5} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  Baixar Amigo Refrigerista no Celular
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {isIOS ? 'iPhone / iOS' : isAndroid ? 'Android' : 'App Mobile'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
                {deferredPrompt
                  ? 'Instale o aplicativo oficial no seu celular com 1 toque para acesso rápido em campo.'
                  : isIOS
                  ? 'Adicione o aplicativo à Tela de Início do seu iPhone para usar em tela cheia.'
                  : 'Baixe e adicione o aplicativo na tela inicial do seu celular para acesso rápido em campo.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallAction}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <Download size={14} strokeWidth={2.5} />
              <span>{deferredPrompt ? 'Instalar Agora' : 'Baixar App'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Dispensar aviso"
              aria-label="Dispensar aviso de instalação"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Instruções Guiadas para iOS ou Android (fallback caso beforeinstallprompt não esteja disponível) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {isIOS ? 'Instalar no iPhone / iPad' : 'Instalar no Android'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Acesso rápido na tela inicial do seu celular
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-200">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <Share size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">1. Toque em Compartilhar</span>
                    <span className="text-[11px] text-slate-400">
                      Na barra do Safari, toque no ícone de compartilhamento (quadrado com seta para cima).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <PlusSquare size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">2. Adicionar à Tela de Início</span>
                    <span className="text-[11px] text-slate-400">
                      Role as opções e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">3. Confirme em Adicionar</span>
                    <span className="text-[11px] text-slate-400">
                      Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior direito para finalizar.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-200">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <MoreVertical size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">1. Abra o menu do navegador</span>
                    <span className="text-[11px] text-slate-400">
                      Toque nos <strong>três pontos</strong> no canto superior direito do Chrome.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0 mt-0.5">
                    <Download size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">2. Instalar aplicativo</span>
                    <span className="text-[11px] text-slate-400">
                      Toque em <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              Entendi, vou instalar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileInstallBanner;
