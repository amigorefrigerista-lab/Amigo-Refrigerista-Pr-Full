'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { recordDeviceLogin } from '@/lib/deviceService';

import { UserSubscription } from '@/lib/licenseService';

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        // Perform server-side token verification with firebase-applet-config credentials
        try {
          const idToken = await currentUser.getIdToken();
          await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
        } catch (verifyErr) {
          console.warn('Server-side token verification warning:', verifyErr);
        }

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
            // Document creation for new user
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

        // Record device login
        recordDeviceLogin(currentUser.uid).catch(console.warn);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
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
  };
}
