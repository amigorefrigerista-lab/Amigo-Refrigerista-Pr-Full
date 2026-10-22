import React from 'react';
import Link from 'next/link';
import { Shield, FileText, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium">
          <Link
            href="/termos"
            className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1"
          >
            <FileText size={12} />
            <span>Termos e Condições de Uso</span>
          </Link>
          <span className="text-slate-400 dark:text-slate-700">•</span>
          <Link
            href="/privacidade"
            className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1"
          >
            <Shield size={12} />
            <span>Política de Privacidade e Segurança (LGPD)</span>
          </Link>
          <span className="text-slate-400 dark:text-slate-700">•</span>
          <a
            href="mailto:amigorefrigerista@gmail.com"
            className="text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1"
          >
            <Mail size={12} />
            <span>DPO &amp; Suporte: amigorefrigerista@gmail.com</span>
          </a>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Amigo Refrigerista Tecnologia e Sistemas Digitais para Climatização Ltda. • São Paulo - SP, Brasil • Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
