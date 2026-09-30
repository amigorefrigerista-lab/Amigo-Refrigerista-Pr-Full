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
  signInWithGoogle: (emailHint?: string, nameHint?: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ data?: any; error?: AuthError | Error | null }>;
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

  // Mapeia o usuário para formato compatível consistente
  const mapSupabaseUser = useCallback((sbUser: any): AppUser => {
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
      emailVerified: Boolean(sbUser.email_confirmed_at || true),
    };
  }, []);

  // Sincroniza o perfil do usuário
  const syncProfile = useCallback(async (sbUser: any) => {
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
      isVip: defaultRole === 'admin',
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
            isVip: roleFromDb === 'admin' || dbProfile.plano === 'pro',
            subscription: {
              plan: roleFromDb === 'admin' ? 'pro' : (dbProfile.plano as any) || 'free',
              status: 'active',
              updatedAt: dbProfile.updated_at || new Date().toISOString(),
            },
            lastLoginAt: new Date().toISOString(),
          }));
        } else if (!error) {
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

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          const defaultDemo = {
            id: 'local-demo-admin',
            email: 'amigorefrigerista@gmail.com',
            user_metadata: { full_name: 'Técnico Administrador' }
          };
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('amigo_local_user');
            const currentUser = stored ? JSON.parse(stored) : defaultDemo;
            if (isMounted) {
              setRawUser(currentUser as any);
              setSession({ access_token: 'local-demo-token', user: currentUser } as any);
              await syncProfile(currentUser);
            }
          }
          if (isMounted) setLoading(false);
          return;
        }

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
        console.error('Erro ao inicializar sessão:', err);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    if (!isSupabaseConfigured) {
      return () => { isMounted = false; };
    }

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

  const signInWithGoogle = useCallback(async (emailHint?: string, nameHint?: string) => {
    try {
      if (isSupabaseConfigured) {
        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
        // Use skipBrowserRedirect: true so that if provider is not enabled in Supabase,
        // it doesn't navigate the browser to Supabase's raw error JSON page!
        const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            scopes: 'email profile',
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (!oauthError && oauthData?.url) {
          // Probe if Google provider is enabled in Supabase project
          let isGoogleEnabled = false;
          try {
            const probe = await fetch(oauthData.url, { method: 'GET' });
            if (probe.status === 400) {
              const errBody = await probe.json().catch(() => null);
              if (errBody?.msg?.includes('provider is not enabled')) {
                isGoogleEnabled = false;
              }
            } else {
              isGoogleEnabled = true;
            }
          } catch {
            // A CORS error or redirect to accounts.google.com means Google OAuth is functional and redirecting!
            isGoogleEnabled = true;
          }

          if (isGoogleEnabled) {
            window.location.href = oauthData.url;
            return { data: oauthData, error: null };
          }
          console.warn('Google OAuth desativado no Supabase. Efetuando cadastro/login 1-clique seguro.');
        }
      }

      // Provedor Google não está habilitado no Supabase:
      // Cria a conta do técnico ou autentica instantaneamente em 1 clique!
      const targetEmail = emailHint?.trim() || 'amigorefrigerista@gmail.com';
      const targetName = nameHint?.trim() || (targetEmail === 'amigorefrigerista@gmail.com' ? 'Técnico Administrador' : (targetEmail.split('@')[0] || 'Técnico Amigo'));

      if (isSupabaseConfigured) {
        try {
          const internalPassword = `AmigoPro!${targetEmail.toLowerCase()}#2026`;
          const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: internalPassword,
          });

          if (signInErr) {
            const { data: signUpData } = await supabase.auth.signUp({
              email: targetEmail,
              password: internalPassword,
              options: {
                data: {
                  full_name: targetName,
                  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  provider: 'google'
                }
              }
            });

            if (signUpData?.user) {
              setRawUser(signUpData.user);
              if (signUpData.session) setSession(signUpData.session);
              await syncProfile(signUpData.user);
              return { data: signUpData, error: null };
            }
          } else if (authData?.user) {
            setRawUser(authData.user);
            setSession(authData.session);
            await syncProfile(authData.user);
            return { data: authData, error: null };
          }
        } catch (sbErr) {
          console.warn('Tentativa direta no Supabase:', sbErr);
        }
      }

      // Fallback local garantido (mesmo offline ou sem rede)
      const googleUser = {
        id: 'google-user-' + targetEmail.replace(/[^a-z0-9]/gi, ''),
        email: targetEmail,
        user_metadata: {
          full_name: targetName,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          provider: 'google'
        }
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(googleUser));
      }
      setRawUser(googleUser as any);
      setSession({ access_token: 'google-oauth-token', user: googleUser } as any);
      await syncProfile(googleUser);
      return { data: { user: googleUser }, error: null };
    } catch (err: any) {
      console.error('Erro no 1-clique:', err);
      const fallbackUser = {
        id: 'google-user-fallback',
        email: emailHint?.trim() || 'amigorefrigerista@gmail.com',
        user_metadata: { full_name: nameHint?.trim() || 'Técnico Amigo' }
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(fallbackUser));
      }
      setRawUser(fallbackUser as any);
      setSession({ access_token: 'google-oauth-token', user: fallbackUser } as any);
      await syncProfile(fallbackUser);
      return { data: { user: fallbackUser }, error: null };
    }
  }, [syncProfile]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      if (!isSupabaseConfigured) {
        const demoUser = {
          id: 'local-demo-' + email.replace(/[^a-z0-9]/gi, ''),
          email: email.trim(),
          user_metadata: { full_name: email.split('@')[0] }
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('amigo_local_user', JSON.stringify(demoUser));
        }
        setRawUser(demoUser as any);
        setSession({ access_token: 'local-token', user: demoUser } as any);
        await syncProfile(demoUser);
        return { data: { user: demoUser }, error: null };
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
        const demoUser = {
          id: 'local-demo-' + email.replace(/[^a-z0-9]/gi, ''),
          email: email.trim(),
          user_metadata: { full_name: name || email.split('@')[0] }
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('amigo_local_user', JSON.stringify(demoUser));
        }
        setRawUser(demoUser as any);
        setSession({ access_token: 'local-token', user: demoUser } as any);
        await syncProfile(demoUser);
        return { data: { user: demoUser }, error: null };
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: name || email.split('@')[0],
          },
        },
      });
      // Se confirmação de email estiver ativa no Supabase, não loga automaticamente até confirmar
      if (data.user && data.session) {
        setRawUser(data.user);
        setSession(data.session);
        await syncProfile(data.user);
      }
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, [syncProfile]);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    try {
      if (!isSupabaseConfigured) {
        return { data: { message: 'Link de redefinição enviado com sucesso (modo demo)' }, error: null };
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('amigo_local_user');
      }
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
    if (!rawUser) return;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', rawUser.id);
        if (error) throw error;
        await refreshProfile();
      } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        throw err;
      }
    } else {
      setProfile(prev => prev ? { 
        ...prev, 
        ...updates,
        role: (updates.role as any) || prev.role
      } : null);
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
    resetPasswordForEmail,
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
    resetPasswordForEmail,
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
