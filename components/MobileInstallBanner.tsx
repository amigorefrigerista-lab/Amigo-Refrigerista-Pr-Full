'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  X,
  CheckCircle2,
  ExternalLink,
  Share,
  PlusSquare,
  MoreVertical,
  Monitor,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall, openPWAInstallModal, BeforeInstallPromptEvent } from '@/hooks/usePWAInstall';

export function triggerDirectLauncherDownload() {
  if (typeof window === 'undefined') return;

  const promptEvent = window.__amigoDeferredPrompt;
  if (promptEvent) {
    promptEvent
      .prompt()
      .then(() => promptEvent.userChoice)
      .then(({ outcome }) => {
        if (outcome === 'accepted') {
          window.__amigoDeferredPrompt = null;
          window.dispatchEvent(new CustomEvent('amigo-pwa-installed'));
        }
      })
      .catch(() => {
        openPWAInstallModal();
      });
    return;
  }

  openPWAInstallModal();
}

export function MobileInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    install,
  } = usePWAInstall();

  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [topLevelInstallUrl, setTopLevelInstallUrl] = useState('/?install=1');

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    if (isIOS) {
      setSelectedPlatform('ios');
    } else if (isAndroid) {
      setSelectedPlatform('android');
    } else {
      setSelectedPlatform('desktop');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('install', '1');
    setTopLevelInstallUrl(url.toString());

    // Se a página foi aberta com ?install=1, abre automaticamente o modal de instalação
    if (window.location.search.includes('install=1')) {
      setShowModal(true);
    }

    const handleOpenModal = () => {
      setShowModal(true);
    };

    const handleInstalled = () => {
      setInstalledNow(true);
      setShowModal(false);
    };

    window.addEventListener('open-pwa-install-modal', handleOpenModal);
    window.addEventListener('amigo-pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('open-pwa-install-modal', handleOpenModal);
      window.removeEventListener('amigo-pwa-installed', handleInstalled);
    };
  }, [isIOS, isAndroid]);

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      const promptToUse: BeforeInstallPromptEvent | null | undefined =
        typeof window !== 'undefined' ? window.__amigoDeferredPrompt : null;

      if (isInstallable || promptToUse) {
        const accepted = await install();
        if (accepted) {
          setInstalledNow(true);
          setShowModal(false);
        }
        return;
      }

      // Se o prompt nativo não estiver disponível (ex: iOS, iframe ou navegador já instalado), abre o modal interativo
      setShowModal(true);
    } finally {
      setInstalling(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {!isInstalled && !dismissed && (
        <div
          role="region"
          aria-label="Instalar aplicativo no dispositivo"
          className="w-full bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_25px_rgba(14,165,233,0.2)] mb-4 animate-in fade-in slide-in-from-top-3 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
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
                    <span className="text-sm font-black text-white truncate">
                      {installedNow ? 'Aplicativo Instalado com Sucesso!' : 'Amigo Refrigerista Pro'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {isIOS ? 'iOS PWA' : isAndroid ? 'Android PWA' : 'App PWA'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-snug mt-0.5">
                    {installedNow
                      ? 'O aplicativo já está disponível na sua tela inicial.'
                      : isInstallable
                      ? 'Instalador nativo pronto! Toque abaixo para instalar direto no seu aparelho.'
                      : 'Instale o aplicativo na sua tela inicial para acesso rápido e tela cheia.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="sm:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                title="Fechar"
                aria-label="Fechar aviso de instalação"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDirectInstall}
                disabled={installing}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Download size={15} strokeWidth={2.5} />
                <span>
                  {installing
                    ? 'Instalando...'
                    : installedNow
                    ? 'Instalado'
                    : 'Instalar Aplicativo'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="hidden sm:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar aviso de instalação"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Interativo de Instalação Nativa PWA */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-slate-100 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.45)] shrink-0">
                  <Smartphone size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white leading-tight">
                      Instalar Amigo Refrigerista
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[9px] font-black uppercase">
                      PWA Oficial
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instalação direta sem baixar arquivos HTML
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                aria-label="Fechar modal de instalação"
              >
                <X size={16} />
              </button>
            </div>

            {/* Botão de Instalação 1-Clique quando o navegador disponibiliza beforeinstallprompt */}
            {isInstallable && (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <Sparkles size={15} className="shrink-0" />
                  <span>Instalador nativo do seu navegador está pronto!</span>
                </div>
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95"
                >
                  <Download size={17} strokeWidth={2.5} />
                  <span>Instalar Agora com 1 Clique</span>
                </button>
              </div>
            )}

            {/* Aviso caso esteja rodando dentro de um iframe (como o preview do painel) */}
            {!isInstallable && isInIframe && (
              <div className="mb-5 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-3">
                <p className="text-xs text-sky-200 leading-relaxed">
                  Você está visualizando o app dentro de uma janela incorporada. Para liberar o <strong>instalador automático de 1 clique</strong> do navegador, abra o aplicativo em uma guia direta:
                </p>
                <a
                  href={topLevelInstallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition active:scale-95"
                >
                  <ExternalLink size={15} strokeWidth={2.5} />
                  <span>Abrir em Nova Guia para Instalar</span>
                </a>
              </div>
            )}

            {/* Seletor de Plataforma */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setSelectedPlatform('android')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'android'
                    ? 'bg-sky-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={13} />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform('ios')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'ios'
                    ? 'bg-sky-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={13} />
                <span>iPhone / iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform('desktop')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'desktop'
                    ? 'bg-sky-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor size={13} />
                <span>PC / Mac</span>
              </button>
            </div>

            {/* Passos por Plataforma */}
            {selectedPlatform === 'android' && (
              <div className="space-y-2.5 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <p className="font-bold text-sky-400 mb-1">
                  Como instalar no Android (Chrome / Samsung / Edge):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Toque no ícone de menu <strong className="text-white inline-flex items-center gap-0.5"><MoreVertical size={13} className="inline text-sky-400" /> (três pontos)</strong> no canto superior direito do Chrome.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Toque em <strong className="text-white">&ldquo;Instalar aplicativo&rdquo;</strong> ou <strong className="text-white">&ldquo;Adicionar à tela inicial&rdquo;</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Confirme tocando em <strong className="text-emerald-400">Instalar</strong> — o ícone oficial será criado na sua gaveta de aplicativos!
                  </p>
                </div>
              </div>
            )}

            {selectedPlatform === 'ios' && (
              <div className="space-y-2.5 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <p className="font-bold text-sky-400 mb-1">
                  Como instalar no iPhone ou iPad (Safari):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Toque no botão <strong className="text-white inline-flex items-center gap-1"><Share size={13} className="inline text-sky-400" /> Compartilhar</strong> na barra inferior do Safari.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Role para baixo e toque em <strong className="text-white inline-flex items-center gap-1"><PlusSquare size={13} className="inline text-sky-400" /> Adicionar à Tela de Início</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Toque em <strong className="text-emerald-400">Adicionar</strong> no canto superior direito.
                  </p>
                </div>
              </div>
            )}

            {selectedPlatform === 'desktop' && (
              <div className="space-y-2.5 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <p className="font-bold text-sky-400 mb-1">
                  Como instalar no Computador (Chrome / Edge):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Olhe para o lado direito da <strong className="text-white">barra de endereço</strong> no topo do navegador e clique no ícone de <strong className="text-white">Instalar (monitor com seta)</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Ou clique no menu <strong className="text-white">⋮ (três pontos)</strong> → <strong className="text-white">Salvar e compartilhar</strong> → <strong className="text-white">Instalar página como aplicativo</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Confirme em <strong className="text-emerald-400">Instalar</strong> para adicionar à sua Área de Trabalho.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>App verificado • Funciona em tela cheia</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileInstallBanner;

