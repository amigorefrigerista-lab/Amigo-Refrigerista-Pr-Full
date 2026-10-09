'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SupabaseProfile } from '@/lib/supabase';
import { recordDeviceLogin } from '@/lib/deviceService';
import { getUserProfileAction, syncUserAction } from '@/app/actions/dbActions';

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

export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'amigorefrigerista@gmail.com'
)
  .toLowerCase()
  .trim();

async function syncServerHttpOnlySession(accessToken?: string | null): Promise<{
  ok: boolean;
  role?: 'admin' | 'support' | 'user';
  plan?: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  planExpiresAt?: string | null;
}> {
  if (typeof window === 'undefined' || !accessToken) return { ok: false };
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.sessionToken) {
        sessionStorage.setItem('amigo_hmac_session', json.sessionToken);
      }
      return {
        ok: true,
        role: json.role,
        plan: json.plan,
        planExpiresAt: json.planExpiresAt,
      };
    }
  } catch {
    // ignore network errors
  }
  return { ok: false };
}

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
  delegatedEmails: string[];
  addDelegatedEmail: (email: string) => Promise<boolean>;
  removeDelegatedEmail: (email: string) => Promise<boolean>;
  signInWithGoogle: (
    emailHint?: string,
    nameHint?: string
  ) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signInWithEmail: (
    email: string,
    pass: string
  ) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name?: string
  ) => Promise<{ data?: any; error?: AuthError | Error | null }>;
  resetPasswordForEmail: (
    email: string
  ) => Promise<{ data?: any; error?: AuthError | Error | null }>;
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
      emailVerified: Boolean(sbUser.email_confirmed_at),
    };
  }, []);

  const syncProfile = useCallback(async (sbUser: any, accessToken?: string | null) => {
    const normalizedEmail = sbUser.email?.toLowerCase().trim() || '';

    // 1. Primeiro sincroniza o accessToken real do Supabase no servidor (/api/auth/session)
    let verifiedRole: 'admin' | 'support' | 'user' = 'user';
    let verifiedPlan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid' = 'free';
    let verifiedExpiresAt: string | undefined = undefined;

    if (accessToken) {
      const serverSession = await syncServerHttpOnlySession(accessToken);
      if (serverSession.ok) {
        if (serverSession.role) verifiedRole = serverSession.role;
        if (serverSession.plan) verifiedPlan = serverSession.plan;
        if (serverSession.planExpiresAt) {
          verifiedExpiresAt = serverSession.planExpiresAt.split('T')[0];
        }
      }
    }

    let initialName =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      normalizedEmail.split('@')[0] ||
      'Técnico';

    try {
      if (sbUser.id) {
        const dbUser = await getUserProfileAction(sbUser.id);
        if (dbUser?.name) {
          initialName = dbUser.name;
        }
      }
    } catch {
      // ignore
    }

    const baseProfile: UserProfileState = {
      uid: sbUser.id,
      email: sbUser.email || '',
      name: initialName,
      role: verifiedRole,
      empresa: sbUser.user_metadata?.empresa || '',
      telefone: sbUser.user_metadata?.telefone || '',
      isVip: verifiedRole === 'admin' || verifiedPlan === 'pro' || verifiedPlan === 'pro_paid',
      subscription: {
        plan: verifiedPlan,
        status: 'active',
        endDate: verifiedExpiresAt,
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
            dbProfile.role === 'admin' || dbProfile.is_admin
              ? 'admin'
              : dbProfile.role === 'support'
              ? 'support'
              : verifiedRole;

          const expiresAtRaw: string | null = (dbProfile as any).plan_expires_at || null;
          const isExpired =
            expiresAtRaw &&
            !Number.isNaN(new Date(expiresAtRaw).getTime()) &&
            new Date(expiresAtRaw).getTime() < Date.now();

          const effectivePlanFromDb: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid' =
            roleFromDb === 'admin'
              ? 'pro'
              : isExpired
              ? 'free'
              : ((dbProfile.plano as any) || 'free');

          setProfile((prev) => ({
            uid: sbUser.id,
            email: sbUser.email || '',
            name: dbProfile.nome || prev?.name || 'Técnico',
            role: roleFromDb,
            empresa: dbProfile.empresa || '',
            telefone: dbProfile.telefone || '',
            isVip: roleFromDb === 'admin' || effectivePlanFromDb === 'pro',
            subscription: {
              plan: effectivePlanFromDb,
              status: isExpired ? 'past_due' : 'active',
              endDate: expiresAtRaw ? expiresAtRaw.split('T')[0] : verifiedExpiresAt,
              updatedAt: dbProfile.updated_at || new Date().toISOString(),
            },
            lastLoginAt: new Date().toISOString(),
          }));
        } else if (!error) {
          // Nunca cria perfil como admin ou pro pelo cliente; privilégio admin é atribuído apenas pelo servidor/trigger
          await supabase.from('profiles').upsert({
            id: sbUser.id,
            email: sbUser.email,
            nome: baseProfile.name,
            role: 'user',
            is_admin: false,
            plano: 'free',
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
          if (isMounted) {
            setRawUser(null);
            setSession(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.warn('Aviso na recuperação da sessão Supabase:', error);
        }

        if (isMounted) {
          if (currentSession?.user) {
            setSession(currentSession);
            setRawUser(currentSession.user);
            await syncProfile(currentSession.user, currentSession.access_token);
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
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      if (newSession?.user) {
        setSession(newSession);
        setRawUser(newSession.user);
        await syncProfile(newSession.user, newSession.access_token);
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

  const [delegatedEmails, setDelegatedEmails] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('amigo_delegated_support_emails');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const addDelegatedEmail = useCallback(async (emailToAdd: string): Promise<boolean> => {
    const cleaned = emailToAdd.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) return false;

    setDelegatedEmails((prev) => {
      if (prev.includes(cleaned)) return prev;
      const updated = [...prev, cleaned];
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_delegated_support_emails', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('profiles')
          .update({ role: 'support', is_admin: false, updated_at: new Date().toISOString() })
          .ilike('email', cleaned);
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar delegado no Supabase:', err);
    }

    return true;
  }, []);

  const removeDelegatedEmail = useCallback(async (emailToRemove: string): Promise<boolean> => {
    const cleaned = emailToRemove.trim().toLowerCase();
    setDelegatedEmails((prev) => {
      const updated = prev.filter((e) => e.toLowerCase() !== cleaned);
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_delegated_support_emails', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('profiles')
          .update({ role: 'user', updated_at: new Date().toISOString() })
          .ilike('email', cleaned);
      }
    } catch (err) {
      console.warn('Aviso ao remover delegado no Supabase:', err);
    }

    return true;
  }, []);

  const user = useMemo(() => {
    return rawUser ? mapSupabaseUser(rawUser) : null;
  }, [rawUser, mapSupabaseUser]);

  const normalizedEmail = user?.email?.toLowerCase().trim() || '';
  const isDelegatedSupport = delegatedEmails.some((e) => e.toLowerCase() === normalizedEmail);

  // O papel de admin só é concedido quando verificado pela sessão/perfil autenticado, nunca por simples e-mail não autenticado
  const role: 'admin' | 'support' | 'user' =
    profile?.role === 'admin'
      ? 'admin'
      : isDelegatedSupport || profile?.role === 'support'
      ? 'support'
      : 'user';

  const isAdmin = role === 'admin';
  const isSupportOrAdmin = role === 'admin' || role === 'support' || isDelegatedSupport;

  /**
   * Login com Google: exige OAuth real no Supabase quando configurado e PROÍBE fabricação de sessão admin local.
   */
  const signInWithGoogle = useCallback(
    async (emailHint?: string, nameHint?: string) => {
      try {
        if (isSupabaseConfigured) {
          const redirectTo =
            typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo },
          });
          return { data, error };
        }

        let cleanedEmail = emailHint?.trim().toLowerCase();
        if (!cleanedEmail && typeof window !== 'undefined') {
          cleanedEmail =
            localStorage.getItem('amigo_last_google_email')?.trim().toLowerCase() || '';
        }

        if (!cleanedEmail || !cleanedEmail.includes('@')) {
          return {
            error: new Error('NEED_GOOGLE_ACCOUNT'),
          };
        }

        // SEGURANÇA CRÍTICA: Nunca permite fabricar sessão de Admin Master sem senha/JWT verificado pelo Supabase
        if (cleanedEmail === ADMIN_EMAIL) {
          return {
            error: new Error(
              'O acesso administrativo exige autenticação verificada com e-mail e senha no Supabase Auth.'
            ),
          };
        }

        const formattedName = cleanedEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        let targetName = nameHint?.trim();
        if (!targetName && typeof window !== 'undefined') {
          targetName = localStorage.getItem('amigo_last_google_name')?.trim() || '';
        }
        if (!targetName) {
          targetName = formattedName || 'Técnico';
        }

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          targetName
        )}&background=0284c7&color=fff&size=150&bold=true`;

        const googleUser = {
          id: 'usr-' + cleanedEmail.replace(/[^a-z0-9]/gi, ''),
          email: cleanedEmail,
          user_metadata: {
            full_name: targetName,
            avatar_url: avatarUrl,
            provider: 'google',
            role: 'user',
            is_admin: false,
          },
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('amigo_last_google_email', cleanedEmail);
          localStorage.setItem('amigo_last_google_name', targetName);
        }
        setRawUser(googleUser as any);
        setSession({ access_token: '', user: googleUser } as any);
        await syncProfile(googleUser, null);
        return { data: { user: googleUser }, error: null };
      } catch (err: any) {
        console.error('Erro na autenticação Google:', err);
        return { error: err };
      }
    },
    [syncProfile]
  );

  /**
   * Login com E-mail e Senha: sem fabricação de admin local caso a senha falhe ou Supabase não autentique.
   */
  const signInWithEmail = useCallback(
    async (email: string, pass: string) => {
      try {
        const normalizedEmail = email.trim().toLowerCase();

        if (!isSupabaseConfigured) {
          if (normalizedEmail === ADMIN_EMAIL) {
            return {
              error: new Error(
                'Autenticação de Administrador exige o Supabase Auth configurado com credenciais reais.'
              ),
            };
          }
          const demoUser = {
            id: 'usr-' + normalizedEmail.replace(/[^a-z0-9]/gi, ''),
            email: normalizedEmail,
            user_metadata: {
              full_name: normalizedEmail.split('@')[0],
              role: 'user',
              is_admin: false,
            },
          };
          setRawUser(demoUser as any);
          setSession({ access_token: '', user: demoUser } as any);
          await syncProfile(demoUser, null);
          return { data: { user: demoUser }, error: null };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pass,
        });

        if (error || !data?.user || !data?.session) {
          return {
            data: null,
            error: error || new Error('Credenciais inválidas.'),
          };
        }

        setRawUser(data.user);
        setSession(data.session);
        await syncProfile(data.user, data.session.access_token);
        return { data, error: null };
      } catch (err: any) {
        return { error: err };
      }
    },
    [syncProfile]
  );

  const signUpWithEmail = useCallback(
    async (email: string, pass: string, name?: string) => {
      try {
        if (email.trim().toLowerCase() === ADMIN_EMAIL) {
          return {
            error: new Error(
              'Este e-mail é exclusivo da administração. Faça login na aba "Já tenho Conta".'
            ),
          };
        }

        if (!isSupabaseConfigured) {
          const demoUser = {
            id: 'usr-' + email.replace(/[^a-z0-9]/gi, ''),
            email: email.trim(),
            user_metadata: {
              full_name: name || email.split('@')[0],
              role: 'user',
              is_admin: false,
            },
          };
          setRawUser(demoUser as any);
          setSession({ access_token: '', user: demoUser } as any);
          await syncProfile(demoUser, null);
          return { data: { user: demoUser }, error: null };
        }

        const redirectTo =
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
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

        if (error) {
          return { data, error };
        }

        // Se o Supabase exigiu confirmação por e-mail mas não retornou sessão, tenta autenticar diretamente com a senha recém criada
        if (data.user && !data.session) {
          const loginAttempt = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: pass,
          });
          if (loginAttempt.data.session) {
            setRawUser(loginAttempt.data.user);
            setSession(loginAttempt.data.session);
            await syncProfile(loginAttempt.data.user, loginAttempt.data.session.access_token);
            return { data: loginAttempt.data, error: null };
          }
        }

        if (data.user && data.session) {
          setRawUser(data.user);
          setSession(data.session);
          await syncProfile(data.user, data.session.access_token);
        }
        return { data, error };
      } catch (err: any) {
        return { error: err };
      }
    },
    [syncProfile]
  );

  const resetPasswordForEmail = useCallback(async (email: string) => {
    try {
      if (!isSupabaseConfigured) {
        return {
          data: { message: 'Link de redefinição enviado com sucesso' },
          error: null,
        };
      }
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/redefinir-senha`
          : undefined;
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
        sessionStorage.removeItem('amigo_hmac_session');
        await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(
          () => {}
        );
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
      await syncProfile(rawUser, session?.access_token || null);
    }
  }, [rawUser, session, syncProfile]);

  const updateProfileData = useCallback(
    async (updates: Partial<SupabaseProfile>) => {
      if (!rawUser) return;
      const newName = updates.name || updates.nome;
      const newEmail = updates.email || rawUser.email;

      if (newName && rawUser.id) {
        try {
          await syncUserAction({
            uid: rawUser.id,
            email: newEmail || '',
            name: newName,
          });
        } catch (e) {
          console.warn('Erro ao atualizar PostgreSQL:', e);
        }
      }

      if (typeof window !== 'undefined') {
        if (newName) localStorage.setItem('amigo_last_google_name', newName);
        if (newEmail) localStorage.setItem('amigo_last_google_email', newEmail);
      }

      if (isSupabaseConfigured) {
        try {
          // Nunca envia is_admin, role ou plano em atualizações de perfil do cliente
          const safeUpdates: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          if (updates.nome !== undefined || updates.name !== undefined) {
            safeUpdates.nome = updates.nome || updates.name;
          }
          if (updates.telefone !== undefined) safeUpdates.telefone = updates.telefone;
          if (updates.empresa !== undefined) safeUpdates.empresa = updates.empresa;

          const { error } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', rawUser.id);
          if (error) throw error;
          await refreshProfile();
        } catch (err) {
          console.error('Erro ao atualizar perfil:', err);
          throw err;
        }
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                name: newName || prev.name,
                email: newEmail || prev.email,
              }
            : null
        );
      }
    },
    [rawUser, refreshProfile]
  );

  const value = useMemo<SupabaseAuthContextType>(
    () => ({
      user,
      rawUser,
      session,
      profile,
      loading,
      role,
      isAdmin,
      isSupportOrAdmin,
      isSupabaseConfigured,
      delegatedEmails,
      addDelegatedEmail,
      removeDelegatedEmail,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      signOut,
      refreshProfile,
      updateProfileData,
    }),
    [
      user,
      rawUser,
      session,
      profile,
      loading,
      role,
      isAdmin,
      isSupportOrAdmin,
      delegatedEmails,
      addDelegatedEmail,
      removeDelegatedEmail,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      signOut,
      refreshProfile,
      updateProfileData,
    ]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth deve ser utilizado dentro de um SupabaseAuthProvider');
  }
  return context;
}
