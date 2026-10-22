'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Snowflake, ShieldCheck } from 'lucide-react';
import { AdminSupportChatView } from '@/components/AdminSupportChatView';

export default function SuporteAdminPage() {
  return (
    <div className="min-h-screen bg-[#070e1c] text-white p-4 sm:p-8 space-y-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Snowflake size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">CANAL EXCLUSIVO</span>
              <h1 className="text-lg font-black text-white">Suporte Admin PRO</h1>
            </div>
          </div>
        </div>

        <Link
          href="/admin"
          className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition flex items-center gap-1.5"
        >
          <ShieldCheck size={16} />
          <span>Painel Admin</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        <AdminSupportChatView />
      </div>
    </div>
  );
}
