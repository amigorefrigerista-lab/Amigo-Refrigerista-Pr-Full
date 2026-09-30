'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { recordDeviceLogin } from '@/lib/deviceService';

export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string;
  role: 'admin' | 'support' | 'user';
  isVip?: boolean;
  subscription?: {
    plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    isLifetimeFree?: boolean;
    licenseKeyUsed?: string;
    startDate?: string;
    endDate?: string;
    updatedAt?: string;
  };
  lastActiveDevice?: string;
  lastLoginAt?: string;
  deviceInfo?: any;
}

export const ADMIN_EMAIL = 'amigorefrigerista@gmail.com';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authProvider, setAuthProvider] = useState<'supabase' | 'firebase'>('firebase');

  useEffect(() => {
    let isSubscribed = true;

    // Se o Supabase estiver configurado com credenciais válidas, usar Supabase Auth como prioridade
    if (isSupabaseConfigured) {
      setAuthProvider('supabase');

      const initSupabaseAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isSubscribed) {
            handleSupabaseUser(session.user);
          } else if (isSubscribed) {
            setProfile(null);
            setUser(null);
            setLoading(false);
          }
        } catch (err) {
          console.warn('Erro ao obter sessão do Supabase:', err);
          if (isSubscribed) setLoading(false);
        }
      };

      const handleSupabaseUser = async (sbUser: any) => {
        const normalizedEmail = sbUser.email?.toLowerCase().trim() || '';
        const isAdminEmail = normalizedEmail === ADMIN_EMAIL || normalizedEmail.endsWith('@amigorefrigerista.com.br');
        const role: 'admin' | 'support' | 'user' = isAdminEmail ? 'admin' : 'user';

        const userProfile: UserProfile = {
          uid: sbUser.id,
          email: sbUser.email || '',
          name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Técnico',
          role,
          subscription: {
            plan: role === 'admin' ? 'pro' : 'free',
            status: 'active',
            updatedAt: new Date().toISOString(),
          },
          lastLoginAt: new Date().toISOString(),
        };

        if (isSubscribed) {
          setUser({
            uid: sbUser.id,
            id: sbUser.id,
            email: sbUser.email,
            displayName: userProfile.name,
            photoURL: sbUser.user_metadata?.avatar_url || null,
          });
          setProfile(userProfile);
          setLoading(false);
        }

        // Tenta buscar/atualizar dados do perfil no Supabase
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();

          if (profileData && isSubscribed) {
            setProfile((prev) => prev ? {
              ...prev,
              name: profileData.nome || prev.name,
              role: profileData.is_admin || isAdminEmail ? 'admin' : (profileData.role as any || prev.role),
            } : null);
          }
        } catch (e) {
          console.warn('Sync profile Supabase error:', e);
        }
      };

      initSupabaseAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!isSubscribed) return;
        if (session?.user) {
          await handleSupabaseUser(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

      return () => {
        isSubscribed = false;
        subscription.unsubscribe();
      };
    }

    // Fallback: Firebase Auth caso o Supabase não esteja com as chaves inseridas ainda
    setAuthProvider('firebase');
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: FirebaseUser | null) => {
      if (!isSubscribed) return;
      setUser(currentUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        const normalizedEmail = currentUser.email?.toLowerCase().trim() || '';
        const isAdminEmail = normalizedEmail === ADMIN_EMAIL || normalizedEmail.endsWith('@amigorefrigerista.com.br');
        const initialRole: 'admin' | 'support' | 'user' = isAdminEmail ? 'admin' : 'user';
        
        const initialProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
          role: initialRole,
          subscription: {
            plan: initialRole === 'admin' ? 'pro' : 'free',
            status: 'active',
            updatedAt: new Date().toISOString()
          }
        };
        setProfile(initialProfile);
        setLoading(false);

        // Real-time Firestore document sync
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribeDoc = onSnapshot(userDocRef, async (snap) => {
          if (!isSubscribed) return;
          if (snap.exists()) {
            const data = snap.data();
            let role: 'admin' | 'support' | 'user' = initialRole;
            if (isAdminEmail || data.role === 'admin') {
              role = 'admin';
              if (isAdminEmail && data.role !== 'admin') {
                setDoc(userDocRef, { role: 'admin' }, { merge: true }).catch(console.warn);
              }
            } else if (data.role === 'support') {
              role = 'support';
            }

            setProfile({
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || data.name || 'Usuário',
              role,
              isVip: data.isVip || false,
              subscription: data.subscription || {
                plan: role === 'admin' ? 'pro' : 'free',
                status: 'active',
                updatedAt: new Date().toISOString()
              },
              lastActiveDevice: data.lastActiveDevice,
              lastLoginAt: data.lastLoginAt,
              deviceInfo: data.deviceInfo,
            });
          } else {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
              role: initialRole,
              subscription: {
                plan: initialRole === 'admin' ? 'pro' : 'free',
                status: 'active',
                updatedAt: new Date().toISOString()
              },
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        }, (err) => {
          console.warn('Snapshot error on user doc:', err);
        });

        recordDeviceLogin(currentUser.uid).catch(console.warn);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const normalizedUserEmail = user?.email?.toLowerCase().trim() || '';
  const isEmailAdmin = normalizedUserEmail === ADMIN_EMAIL || normalizedUserEmail.endsWith('@amigorefrigerista.com.br');
  const role: 'admin' | 'support' | 'user' = profile?.role || (isEmailAdmin ? 'admin' : 'user');
  const isAdmin = role === 'admin' || isEmailAdmin;
  const isSupportOrAdmin = role === 'admin' || role === 'support' || isEmailAdmin;

  return {
    user,
    profile,
    loading,
    role,
    isAdmin,
    isSupportOrAdmin,
    authProvider,
    isSupabaseActive: isSupabaseConfigured,
  };
}
