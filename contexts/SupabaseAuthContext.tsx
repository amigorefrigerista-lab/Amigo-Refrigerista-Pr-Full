'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SupabaseProfile } from '@/lib/supabase';
import { recordDeviceLogin } from '@/lib/deviceService';

export interface AppUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string;
  photoURL?: string | null;
  emailVerified?: boolean;
}

export interface UserSubscriptionInfo {
  plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  isLifetimeFree?: boolean;
  licenseKeyUsed?: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
}

export interface UserProfileState {
  uid: string;
  email: string | null;
  name: string;
  role: 'admin' | 'support' | 'user';
  isVip?: boolean;
  empresa?: string;
  telefone?: string;
  subscription?: UserSubscriptionInfo;
  lastActiveDevice?: string;
  lastLoginAt?: string;
}

export const ADMIN_EMAIL = 'amigorefrigerista@gmail.com';

interface SupabaseAuthContextType {
  user: AppUser | null;
  rawUser: User | null;
  session: Session | null;
  profile: UserProfileState | null;
  loading: boolean;
  role: 'admin' | 'support' | 'user';
  isAdmin: boolean;
  isSupportOrAdmin: boolean;
  isSupabaseConfigured: boolean;
  signInWithGoogle: () => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (updates: Partial<SupabaseProfile>) => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Mapeia o usuário do Supabase para formato compatível consistente
  const mapSupabaseUser = useCallback((sbUser: User): AppUser => {
    const name =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.nome ||
      sbUser.email?.split('@')[0] ||
      'Técnico';

    return {
      uid: sbUser.id,
      id: sbUser.id,
      email: sbUser.email || '',
      displayName: name,
      photoURL: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
      emailVerified: Boolean(sbUser.email_confirmed_at),
    };
  }, []);

  // Busca e sincroniza o perfil do usuário no PostgreSQL
  const syncProfile = useCallback(async (sbUser: User) => {
    const normalizedEmail = sbUser.email?.toLowerCase().trim() || '';
    const isEmailAdmin = normalizedEmail === ADMIN_EMAIL || normalizedEmail.endsWith('@amigorefrigerista.com.br');
    const defaultRole: 'admin' | 'support' | 'user' = isEmailAdmin ? 'admin' : 'user';

    const baseProfile: UserProfileState = {
      uid: sbUser.id,
      email: sbUser.email || '',
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || normalizedEmail.split('@')[0] || 'Técnico',
      role: defaultRole,
      empresa: sbUser.user_metadata?.empresa || '',
      telefone: sbUser.user_metadata?.telefone || '',
      subscription: {
        plan: defaultRole === 'admin' ? 'pro' : 'free',
        status: 'active',
        updatedAt: new Date().toISOString(),
      },
      lastLoginAt: new Date().toISOString(),
    };

    setProfile(baseProfile);

    if (isSupabaseConfigured) {
      try {
        const { data: dbProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (dbProfile) {
          const roleFromDb: 'admin' | 'support' | 'user' = 
            isEmailAdmin ? 'admin' : (dbProfile.role === 'admin' || dbProfile.is_admin ? 'admin' : dbProfile.role === 'support' ? 'support' : 'user');

          setProfile((prev) => ({
            uid: sbUser.id,
            email: sbUser.email || '',
            name: dbProfile.nome || prev?.name || 'Técnico',
            role: roleFromDb,
            empresa: dbProfile.empresa || '',
            telefone: dbProfile.telefone || '',
            isVip: roleFromDb === 'admin',
            subscription: {
              plan: roleFromDb === 'admin' ? 'pro' : (dbProfile.plano as any) || 'free',
              status: 'active',
              updatedAt: dbProfile.updated_at || new Date().toISOString(),
            },
            lastLoginAt: new Date().toISOString(),
          }));
        } else if (!error) {
          // Insere o perfil inicial se não existir
          await supabase.from('profiles').upsert({
            id: sbUser.id,
            email: sbUser.email,
            nome: baseProfile.name,
            role: defaultRole,
            is_admin: defaultRole === 'admin',
            plano: defaultRole === 'admin' ? 'pro' : 'trial',
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Erro ao sincronizar perfil Supabase:', err);
      }
    }

    recordDeviceLogin(sbUser.id).catch(console.warn);
  }, []);

  // Inicialização e escuta em tempo real do Supabase Auth com persistência de sessão
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (isMounted) setLoading(false);
          return;
        }

        // Recupera sessão persistida no storage local
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Aviso na recuperação da sessão Supabase:', error);
        }

        if (isMounted) {
          if (currentSession?.user) {
            setSession(currentSession);
            setRawUser(currentSession.user);
            await syncProfile(currentSession.user);
          } else {
            setSession(null);
            setRawUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão Supabase:', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listener de mudança de estado de autenticação (LOGIN, LOGOUT, TOKEN_REFRESHED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (newSession?.user) {
        setSession(newSession);
        setRawUser(newSession.user);
        await syncProfile(newSession.user);
      } else {
        setSession(null);
        setRawUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const user = useMemo(() => {
    return rawUser ? mapSupabaseUser(rawUser) : null;
  }, [rawUser, mapSupabaseUser]);

  const normalizedEmail = user?.email?.toLowerCase().trim() || '';
  const isEmailAdmin = normalizedEmail === ADMIN_EMAIL || normalizedEmail.endsWith('@amigorefrigerista.com.br');
  const role: 'admin' | 'support' | 'user' = profile?.role || (isEmailAdmin ? 'admin' : 'user');
  const isAdmin = role === 'admin' || isEmailAdmin;
  const isSupportOrAdmin = role === 'admin' || role === 'support' || isEmailAdmin;

  // Funções de Ação
  const signInWithGoogle = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.');
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (data.user) {
        setRawUser(data.user);
        setSession(data.session);
        await syncProfile(data.user);
      }
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, [syncProfile]);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name?: string) => {
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.');
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: name || email.split('@')[0],
          },
        },
      });
      if (data.user) {
        setRawUser(data.user);
        setSession(data.session);
        await syncProfile(data.user);
      }
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setSession(null);
      setRawUser(null);
      setProfile(null);
    } catch (err) {
      console.warn('Erro ao deslogar:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (rawUser) {
      await syncProfile(rawUser);
    }
  }, [rawUser, syncProfile]);

  const updateProfileData = useCallback(async (updates: Partial<SupabaseProfile>) => {
    if (!rawUser || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', rawUser.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      console.error('Erro ao atualizar dados do perfil:', err);
      throw err;
    }
  }, [rawUser, refreshProfile]);

  const value = useMemo<SupabaseAuthContextType>(() => ({
    user,
    rawUser,
    session,
    profile,
    loading,
    role,
    isAdmin,
    isSupportOrAdmin,
    isSupabaseConfigured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
    updateProfileData,
  }), [
    user,
    rawUser,
    session,
    profile,
    loading,
    role,
    isAdmin,
    isSupportOrAdmin,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
    updateProfileData,
  ]);

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth deve ser utilizado dentro de um SupabaseAuthProvider');
  }
  return context;
}
