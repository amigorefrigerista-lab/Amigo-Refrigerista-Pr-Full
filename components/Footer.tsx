import React from 'react';
import Link from 'next/link';
import { Shield, FileText, Mail, Snowflake, MapPin, ShieldCheck } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-4 border-t border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-5 pb-3 sm:pt-6 sm:pb-3.5">
        {/* Linha Principal: Identidade + Links Legais + Contato DPO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 items-start md:items-center">
          {/* Bloco 1: Marca e Descrição */}
          <div className="md:col-span-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20">
              <Snowflake size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                  Amigo Refrigerista <span className="text-sky-500 dark:text-sky-400">PRO</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/25 font-mono">
                  HVAC-R
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                Plataforma digital de Ordens de Serviço, PMOC com QR Code, Diagnóstico IA e gestão financeira para técnicos de climatização.
              </p>
            </div>
          </div>

          {/* Bloco 2: Documentos Legais e Privacidade */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Transparência &amp; Conformidade Legal
            </span>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Link
                href="/termos"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-500/10 dark:bg-slate-900 dark:hover:bg-sky-500/15 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 transition flex items-center gap-1.5"
              >
                <FileText size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />
                <span>Termos de Uso</span>
              </Link>
              <Link
                href="/privacidade"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-500/10 dark:bg-slate-900 dark:hover:bg-sky-500/15 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 transition flex items-center gap-1.5"
              >
                <Shield size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span>Privacidade &amp; LGPD</span>
              </Link>
            </div>
          </div>

          {/* Bloco 3: Suporte e Contato DPO */}
          <div className="md:col-span-3 flex flex-col items-center md:items-end text-center md:text-right gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Atendimento &amp; DPO
            </span>
            <a
              href="mailto:amigorefrigerista@gmail.com"
              className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition inline-flex items-center gap-1.5"
            >
              <Mail size={13} className="text-sky-500 dark:text-sky-400 shrink-0" />
              <span>amigorefrigerista@gmail.com</span>
            </a>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span>São Paulo - SP, Brasil</span>
            </span>
          </div>
        </div>

        {/* Linha Inferior: Direitos Autorais e Selo LGPD */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            © {currentYear} <strong className="font-semibold text-slate-700 dark:text-slate-300">Amigo Refrigerista Tecnologia e Sistemas Digitais para Climatização Ltda.</strong> • Todos os direitos reservados.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
            <ShieldCheck size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>Dados Protegidos • Lei nº 13.709/2018 (LGPD)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

