'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Snowflake, CheckCircle2, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem. Por favor, verifique.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error('Erro ao atualizar senha: ' + error.message);
      } else {
        setSuccess(true);
        toast.success('Senha alterada com sucesso! Sua nova senha já está valendo.');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1c] text-white flex flex-col items-center justify-center p-4">
      <Toaster position="top-center" richColors theme="dark" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center space-y-6">
        {/* Header Marca */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(14,165,233,0.4)]">
            <Snowflake size={30} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              Amigo <span className="text-sky-400">Refrigerista</span> <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">PRO</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Redefinição Segura de Senha de Acesso
            </p>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-3 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-base font-bold text-emerald-300">Senha Alterada com Sucesso!</h2>
            <p className="text-xs text-slate-300">
              Sua senha foi redefinida com segurança. Redirecionando para o aplicativo...
            </p>
            <div className="pt-2">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-left text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nova Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Atualizar Senha Agora</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield size={13} className="text-sky-400" />
          <span>Ambiente Seguro com Criptografia de Ponta a Ponta</span>
        </div>
      </div>
    </div>
  );
}
