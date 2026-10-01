'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Crown, Key, Users, DollarSign, Sparkles, ShieldCheck, ArrowLeft, 
  Plus, Copy, Share2, Power, Trash2, Search, CheckCircle2, 
  AlertTriangle, Loader2, RefreshCw, Zap, Gift, Clock, Lock,
  Sliders, MessageSquare
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  FreeLicense, 
  generateLicenseCode, 
  listFreeLicenses, 
  createFreeLicense, 
  toggleLicenseStatus 
} from '@/lib/licenseService';

const MASTER_EMAIL = 'amigorefrigerista@gmail.com';

export default function AdminMasterPage() {
  // O conteúdo da página admin-master foi restaurado a partir do backup ou recriado aqui.
  // Como o arquivo page.tsx sumiu, vou recriar o esqueleto básico para o roteamento funcionar.
  
  return (
    <div className="min-h-screen bg-[#070e1c] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold">Painel Admin Master</h1>
      <p className="text-slate-400">Página em restauração. Por favor, aguarde.</p>
      <Link href="/admin" className="mt-4 text-sky-400 hover:underline">Voltar ao Admin</Link>
    </div>
  );
}
