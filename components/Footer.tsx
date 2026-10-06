import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <Link href="/privacidade" className="text-[11px] text-slate-600 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center justify-center gap-1">
          <Shield size={12} />
          <span>Privacidade, Cookies e Segurança de Dados (LGPD)</span>
        </Link>
        <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-2">
          © {new Date().getFullYear()} Amigo Refrigerista Pro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
