'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Erro no callback de autenticação:', error);
          }
        }
      } catch (err) {
        console.error('Erro ao processar login:', err);
      } finally {
        router.replace('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <h2 className="text-lg font-bold">Conectando sua conta...</h2>
        <p className="text-xs text-slate-400">Finalizando autenticação com o Supabase.</p>
      </div>
    </div>
  );
}
