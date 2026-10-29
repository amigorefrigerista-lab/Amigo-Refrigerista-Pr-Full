'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const AmigoApp = dynamic(() => import('@/components/AmigoApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070e1c] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
        Carregando Amigo Refrigerista PRO...
      </p>
    </div>
  ),
});

export default function AmigoAppLoader() {
  return <AmigoApp />;
}
