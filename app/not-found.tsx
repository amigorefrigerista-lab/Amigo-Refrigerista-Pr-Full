import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Snowflake } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070e1c] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
        <Snowflake className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black tracking-tight mb-2">Página Não Encontrada</h1>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao Início</span>
      </Link>
    </div>
  );
}
