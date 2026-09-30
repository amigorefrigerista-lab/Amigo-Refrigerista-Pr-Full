'use client';

import { useSupabaseAuth, UserProfileState } from '@/contexts/SupabaseAuthContext';

export type UserProfile = UserProfileState;
export { ADMIN_EMAIL } from '@/contexts/SupabaseAuthContext';

/**
 * Hook de Autenticação Principal do App alimentado pelo Supabase AuthProvider.
 * Garante persistência de sessão, sincronização de perfil no PostgreSQL e controle de acesso (RBAC).
 */
export function useAuth() {
  const authContext = useSupabaseAuth();

  return {
    user: authContext.user,
    rawUser: authContext.rawUser,
    session: authContext.session,
    profile: authContext.profile,
    loading: authContext.loading,
    role: authContext.role,
    isAdmin: authContext.isAdmin,
    isSupportOrAdmin: authContext.isSupportOrAdmin,
    isSupabaseActive: authContext.isSupabaseConfigured,
    // Métodos de autenticação
    signInWithGoogle: authContext.signInWithGoogle,
    signInWithEmail: authContext.signInWithEmail,
    signUpWithEmail: authContext.signUpWithEmail,
    signOut: authContext.signOut,
    refreshProfile: authContext.refreshProfile,
    updateProfileData: authContext.updateProfileData,
  };
}
