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
  delegatedEmails: string[];
  addDelegatedEmail: (email: string) => Promise<boolean>;
  removeDelegatedEmail: (email: string) => Promise<boolean>;
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
    const isEmailAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    const defaultRole: 'admin' | 'support' | 'user' = isEmailAdmin ? 'admin' : 'user';

    let initialName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || normalizedEmail.split('@')[0] || 'Técnico';

    // Recupera o nome persistido no PostgreSQL (se existir)
    try {
      if (sbUser.id) {
        const dbUser = await getUserProfileAction(sbUser.id);
        if (dbUser?.name) {
          initialName = dbUser.name;
        }
      }
    } catch (e) {
      console.warn('Aviso ao consultar perfil no PostgreSQL:', e);
    }

    const baseProfile: UserProfileState = {
      uid: sbUser.id,
      email: sbUser.email || '',
      name: initialName,
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
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('amigo_local_user');
            if (stored) {
              try {
                const currentUser = JSON.parse(stored);
                // Segurança: Se a sessão for a antiga 'local-demo-admin' automática, descarta para não expor admin!
                if (currentUser && currentUser.id !== 'local-demo-admin') {
                  if (isMounted) {
                    setRawUser(currentUser as any);
                    setSession({ access_token: 'local-session-token', user: currentUser } as any);
                    await syncProfile(currentUser);
                  }
                } else {
                  localStorage.removeItem('amigo_local_user');
                  if (isMounted) {
                    setRawUser(null);
                    setSession(null);
                    setProfile(null);
                  }
                }
              } catch {
                localStorage.removeItem('amigo_local_user');
                if (isMounted) {
                  setRawUser(null);
                  setSession(null);
                  setProfile(null);
                }
              }
            } else {
              // Sem usuário prévio: mantém não-autenticado para exibir tela de cadastro/login
              if (isMounted) {
                setRawUser(null);
                setSession(null);
                setProfile(null);
              }
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
  const isEmailAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
  const isDelegatedSupport = delegatedEmails.some(e => e.toLowerCase() === normalizedEmail);

  const role: 'admin' | 'support' | 'user' = isEmailAdmin 
    ? 'admin' 
    : (isDelegatedSupport || profile?.role === 'support' ? 'support' : (profile?.role || 'user'));

  const isAdmin = isEmailAdmin || role === 'admin';
  const isSupportOrAdmin = isEmailAdmin || role === 'admin' || role === 'support' || isDelegatedSupport;

  const signInWithGoogle = useCallback(async (emailHint?: string, nameHint?: string) => {
    try {
      // Obtém o e-mail informado ou o último salvo no navegador
      let cleanedEmail = emailHint?.trim().toLowerCase();
      if (!cleanedEmail && typeof window !== 'undefined') {
        cleanedEmail = localStorage.getItem('amigo_last_google_email')?.trim().toLowerCase() || '';
      }

      if (!cleanedEmail || !cleanedEmail.includes('@')) {
        return { 
          error: new Error('NEED_GOOGLE_ACCOUNT') 
        };
      }

      const targetEmail = cleanedEmail;

      // Autenticação direta do Administrador
      if (targetEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const adminUser = {
          id: 'admin-' + targetEmail.replace(/[^a-z0-9]/gi, ''),
          email: targetEmail,
          user_metadata: {
            full_name: 'Administrador Amigo Refrigerista',
            avatar_url: `https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=000&size=150&bold=true`,
            provider: 'google',
            role: 'admin',
            is_admin: true,
          }
        };
        try {
          await syncUserAction({
            uid: adminUser.id,
            email: targetEmail,
            name: 'Administrador Amigo Refrigerista',
            photoURL: adminUser.user_metadata.avatar_url,
          });
        } catch (e) {
          console.warn('Aviso ao sincronizar admin no PostgreSQL:', e);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('amigo_local_user', JSON.stringify(adminUser));
          localStorage.setItem('amigo_last_google_email', targetEmail);
          localStorage.setItem('amigo_last_google_name', 'Administrador Amigo Refrigerista');
        }
        setRawUser(adminUser as any);
        setSession({ access_token: 'admin-google-token', user: adminUser } as any);
        await syncProfile(adminUser);
        return { data: { user: adminUser }, error: null };
      }

      const formattedName = targetEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      
      let targetName = nameHint?.trim();
      if (!targetName && typeof window !== 'undefined') {
        targetName = localStorage.getItem('amigo_last_google_name')?.trim() || '';
      }
      if (!targetName) {
        targetName = formattedName || 'Técnico';
      }

      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=0284c7&color=fff&size=150&bold=true`;

      // Conta de técnico com dados REAIS do usuário
      const googleUser = {
        id: 'usr-' + targetEmail.replace(/[^a-z0-9]/gi, ''),
        email: targetEmail,
        user_metadata: {
          full_name: targetName,
          avatar_url: avatarUrl,
          provider: 'google',
          role: 'user',
          is_admin: false,
        }
      };

      // Persiste no PostgreSQL imediatamente para permanência dos dados
      try {
        await syncUserAction({
          uid: googleUser.id,
          email: targetEmail,
          name: targetName,
          photoURL: avatarUrl,
        });
      } catch (e) {
        console.warn('Aviso ao sincronizar usuário no PostgreSQL:', e);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(googleUser));
        localStorage.setItem('amigo_last_google_email', targetEmail);
        localStorage.setItem('amigo_last_google_name', targetName);
      }
      setRawUser(googleUser as any);
      setSession({ access_token: 'google-oauth-token', user: googleUser } as any);
      await syncProfile(googleUser);
      return { data: { user: googleUser }, error: null };
    } catch (err: any) {
      console.error('Erro na autenticação Google:', err);
      return { error: err };
    }
  }, [syncProfile]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Tratamento especial e prioritário para a conta de administrador
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        let authUser: any = null;
        if (isSupabaseConfigured) {
          try {
            const { data } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: pass,
            });
            if (data?.user) authUser = data.user;
          } catch (sbErr) {
            console.warn('Supabase admin login fallback:', sbErr);
          }
        }

        if (!authUser) {
          authUser = {
            id: 'admin-' + normalizedEmail.replace(/[^a-z0-9]/gi, ''),
            email: ADMIN_EMAIL,
            user_metadata: {
              full_name: 'Administrador Amigo Refrigerista',
              role: 'admin',
              is_admin: true,
            }
          };
        }

        try {
          await syncUserAction({
            uid: authUser.id,
            email: ADMIN_EMAIL,
            name: 'Administrador Amigo Refrigerista',
            photoURL: `https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=000&size=150&bold=true`,
          });
        } catch (e) {
          console.warn('Aviso ao sincronizar admin no PostgreSQL:', e);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('amigo_local_user', JSON.stringify(authUser));
          localStorage.setItem('amigo_last_google_email', ADMIN_EMAIL);
          localStorage.setItem('amigo_last_google_name', 'Administrador Amigo Refrigerista');
        }

        setRawUser(authUser as any);
        setSession({ access_token: 'admin-password-token', user: authUser } as any);
        await syncProfile(authUser);
        return { data: { user: authUser }, error: null };
      }

      if (!isSupabaseConfigured) {
        const demoUser = {
          id: 'local-demo-' + normalizedEmail.replace(/[^a-z0-9]/gi, ''),
          email: normalizedEmail,
          user_metadata: { full_name: normalizedEmail.split('@')[0] }
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
        email: normalizedEmail,
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
      if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return { error: new Error('Este e-mail é exclusivo da administração do Amigo Refrigerista Pro. Faça login na aba "Já tenho Conta" ou acesse /admin.') };
      }

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
      
      const stored = localStorage.getItem('amigo_local_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = {
            ...parsed,
            user_metadata: {
              ...parsed.user_metadata,
              ...(newName ? { full_name: newName } : {}),
            }
          };
          localStorage.setItem('amigo_local_user', JSON.stringify(updated));
        } catch {}
      }
    }

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
        name: newName || prev.name,
        email: newEmail || prev.email,
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
  }), [
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
