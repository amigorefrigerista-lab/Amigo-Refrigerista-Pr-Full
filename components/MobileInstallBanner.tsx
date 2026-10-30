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
  Copy,
  Check,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall, openPWAInstallModal, BeforeInstallPromptEvent } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export function triggerDirectLauncherDownload(platform?: 'android' | 'ios' | 'desktop') {
  if (typeof window === 'undefined') return;

  const promptEvent = window.__amigoDeferredPrompt;
  if (promptEvent && platform !== 'ios') {
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
        openPWAInstallModal(platform);
      });
    return;
  }

  openPWAInstallModal(platform);
}

export function AndroidIosInstallCard() {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  const handleAndroidInstall = async () => {
    setInstalling(true);
    try {
      if (isInstallable) {
        await install();
        return;
      }
      openPWAInstallModal('android');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-sky-950/80 via-slate-900 to-slate-900 border border-sky-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white">
                Aplicativo para Android e iOS (iPhone / iPad)
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  isInstalled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                }`}
              >
                {isInstalled ? 'Instalado no Aparelho' : 'Pronto para Instalar'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instale o Amigo Refrigerista na tela inicial do seu celular para usar em tela cheia, com atalhos rápidos e suporte offline em campo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card Android */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} />
                Android (APK / PWA Nativo)
              </span>
              {isAndroid && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Seu Aparelho
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Compatível com Samsung, Motorola, Xiaomi e todos os aparelhos Android via Chrome, Edge ou Samsung Internet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAndroidInstall}
            disabled={installing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <Download size={15} strokeWidth={2.5} />
            <span>
              {isInstalled
                ? 'Ver Guia de Instalação Android'
                : isInstallable
                ? 'Instalar no Android (1 Clique)'
                : 'Instalar no Android'}
            </span>
          </button>
        </div>

        {/* Card iOS / iPhone */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} />
                iPhone & iPad (Apple iOS)
              </span>
              {isIOS && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Seu Aparelho
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Otimizado para iOS com ícone oficial Apple Touch, barra superior integrada e funcionamento em tela cheia via Safari ou Chrome.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPWAInstallModal('ios')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <Share size={15} strokeWidth={2.5} />
            <span>Instalar no iPhone / iOS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileInstallBanner({ compact = false }: { compact?: boolean }) {
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
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    if (isIOS) {
      setSelectedPlatform('ios');
    } else if (isAndroid) {
      setSelectedPlatform('android');
    } else {
      setSelectedPlatform('android');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('install', '1');
    setTopLevelInstallUrl(url.toString());

    // Se a página foi aberta com ?install=1, abre automaticamente o modal de instalação
    if (window.location.search.includes('install=1')) {
      setShowModal(true);
    }

    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ platform?: 'android' | 'ios' | 'desktop' }>;
      if (customEvent.detail?.platform) {
        setSelectedPlatform(customEvent.detail.platform);
      } else if (isIOS) {
        setSelectedPlatform('ios');
      } else if (isAndroid) {
        setSelectedPlatform('android');
      }
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

      if ((isInstallable || promptToUse) && !isIOS) {
        const accepted = await install();
        if (accepted) {
          setInstalledNow(true);
          setShowModal(false);
          toast.success('Aplicativo instalado com sucesso no seu dispositivo!');
        }
        return;
      }

      // Se o prompt nativo não estiver disponível (ex: iOS, iframe ou navegador já instalado), abre o modal interativo
      if (isIOS) {
        setSelectedPlatform('ios');
      }
      setShowModal(true);
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyAppLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      const cleanUrl = window.location.origin;
      await navigator.clipboard.writeText(cleanUrl);
      setCopiedLink(true);
      toast.success('Link do aplicativo copiado! Envie para o seu celular Android ou iPhone.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error('Não foi possível copiar o link automaticamente.');
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
          aria-label="Instalar aplicativo no Android ou iOS"
          className={`w-full bg-gradient-to-r from-sky-950 via-slate-900 to-cyan-950 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_25px_rgba(14,165,233,0.2)] ${
            compact ? 'mb-3' : 'mb-4'
          } animate-in fade-in slide-in-from-top-3 duration-300`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                      {installedNow
                        ? 'Aplicativo Instalado com Sucesso!'
                        : 'Instale no Android ou iPhone (iOS)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Android
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      iOS / iPhone
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-snug mt-0.5">
                    {installedNow
                      ? 'O aplicativo já está disponível na sua tela inicial em tela cheia.'
                      : isInstallable
                      ? 'Instalador nativo pronto! Toque abaixo para instalar direto na tela inicial.'
                      : 'Adicione o aplicativo na tela inicial do seu Android ou iPhone para acesso rápido e modo offline.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                title="Fechar"
                aria-label="Fechar aviso de instalação"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleDirectInstall}
                disabled={installing}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Download size={14} strokeWidth={2.5} />
                <span>
                  {installing
                    ? 'Instalando...'
                    : installedNow
                    ? 'Instalado'
                    : isIOS
                    ? 'Instalar no iPhone'
                    : 'Instalar no Android'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlatform(isIOS ? 'android' : 'ios');
                  setShowModal(true);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-sky-500/30 text-sky-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Share size={14} />
                <span>{isIOS ? 'Guia Android' : 'Guia iPhone (iOS)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Fechar"
                aria-label="Fechar aviso de instalação"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Interativo de Instalação Nativa PWA (Android, iOS e Desktop) */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-sky-500/40 p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-slate-100 relative overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.45)] shrink-0">
                  <Smartphone size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-black text-white leading-tight">
                      Instalar Amigo Refrigerista
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-black uppercase">
                      Android & iOS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aplicativo oficial em tela cheia com funcionamento offline
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
              <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <Sparkles size={15} className="shrink-0" />
                  <span>Instalador automático do seu dispositivo está pronto!</span>
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
              <div className="mb-4 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
                <p className="text-xs text-sky-200 leading-relaxed">
                  Você está visualizando o aplicativo em uma janela de pré-visualização. Para liberar o <strong>instalador de 1 clique no Android</strong> ou adicionar à tela inicial do <strong>iPhone</strong>, abra o link direto no navegador do celular:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={topLevelInstallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 transition active:scale-95"
                  >
                    <ExternalLink size={14} strokeWidth={2.5} />
                    <span>Abrir em Nova Guia</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyAppLink}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link p/ Celular'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Seletor de Plataforma */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setSelectedPlatform('android')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'android'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform('ios')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'ios'
                    ? 'bg-sky-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone size={14} />
                <span>iPhone / iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlatform('desktop')}
                className={`py-2.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPlatform === 'desktop'
                    ? 'bg-sky-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor size={14} />
                <span>PC / Mac</span>
              </button>
            </div>

            {/* Passos por Plataforma */}
            {selectedPlatform === 'android' && (
              <div className="space-y-3 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black text-emerald-400">
                    Como instalar no Android (Chrome / Samsung / Edge):
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    100% Compatível
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Abra o aplicativo no <strong className="text-white">Google Chrome</strong> do seu Android e toque no menu <strong className="text-white inline-flex items-center gap-0.5"><MoreVertical size={13} className="inline text-emerald-400" /> (três pontos)</strong> no canto superior direito.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Selecione <strong className="text-white">&ldquo;Instalar aplicativo&rdquo;</strong> ou <strong className="text-white">&ldquo;Adicionar à tela inicial&rdquo;</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Toque em <strong className="text-emerald-400">Instalar</strong> — o ícone oficial <strong className="text-white">AmigoRefri</strong> aparecerá na sua tela inicial e gaveta de apps como um aplicativo nativo!
                  </p>
                </div>
              </div>
            )}

            {selectedPlatform === 'ios' && (
              <div className="space-y-3 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black text-sky-400">
                    Como instalar no iPhone ou iPad (Safari ou Chrome iOS):
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    iOS / iPadOS
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    No <strong className="text-white">Safari</strong> (ou Chrome do iPhone), toque no botão <strong className="text-white inline-flex items-center gap-1"><Share size={13} className="inline text-sky-400" /> Compartilhar</strong> (quadrado com seta para cima na barra do navegador).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-relaxed">
                    Role o menu para baixo e toque em <strong className="text-white inline-flex items-center gap-1"><PlusSquare size={13} className="inline text-sky-400" /> Adicionar à Tela de Início</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="leading-relaxed">
                    Confirme tocando em <strong className="text-emerald-400">Adicionar</strong> no canto superior direito. O app abrirá em tela cheia no seu iPhone!
                  </p>
                </div>
              </div>
            )}

            {selectedPlatform === 'desktop' && (
              <div className="space-y-3 text-xs text-slate-200 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-4">
                <p className="font-black text-sky-400 mb-1">
                  Como instalar no Computador (Chrome / Edge):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-relaxed">
                    Clique no ícone de <strong className="text-white">Instalar (monitor com seta)</strong> no lado direito da barra de endereço do navegador.
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
                    Confirme em <strong className="text-emerald-400">Instalar</strong> para criar o atalho na sua Área de Trabalho.
                  </p>
                </div>
              </div>
            )}

            {/* Benefícios rápidos do App Instalado */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-slate-300">
                <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                <span>Tela cheia sem barras</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-slate-300">
                <WifiOff size={15} className="text-sky-400 shrink-0" />
                <span>Funciona mesmo offline</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleCopyAppLink}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do App'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-black text-slate-950 transition cursor-pointer"
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
