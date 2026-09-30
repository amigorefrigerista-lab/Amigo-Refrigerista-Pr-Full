import { createClient, SupabaseClient } from '@supabase/supabase-js';

function isValidHttpUrl(urlString?: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  isValidHttpUrl(rawUrl) &&
  !rawUrl.includes('your-project') &&
  !rawUrl.includes('placeholder')
);

// URL e chave segura
const safeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-amigorefrigerista.supabase.co';
const safeKey = isSupabaseConfigured ? rawKey : 'dummy_key';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'amigo-refrigerista-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export interface SupabaseProfile {
  id: string;
  email: string;
  nome?: string;
  name?: string;
  telefone?: string;
  empresa?: string;
  cnpj_cpf?: string;
  is_admin: boolean;
  role: string;
  plano: string;
  created_at?: string;
}

export interface SupabaseClientRecord {
  id?: string;
  user_id?: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  documento?: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  observacoes?: string;
  created_at?: string;
}

export interface SupabaseWorkOrder {
  id?: string;
  user_id?: string;
  client_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  equipamento: string;
  marca?: string;
  modelo?: string;
  capacidade?: string;
  defeito_reclamado?: string;
  diagnostico_tecnico?: string;
  solucao_aplicada?: string;
  pecas_utilizadas?: string;
  valor_mao_obra?: number;
  valor_pecas?: number;
  valor_total?: number;
  status: string;
  data_agendamento?: string;
  data_conclusao?: string;
  fotos?: string[];
  garantia_dias?: number;
  observacoes?: string;
  created_at?: string;
}

export interface SupabaseDiagnostic {
  id?: string;
  user_id?: string;
  tipo: string;
  marca?: string;
  codigo_erro?: string;
  descricao?: string;
  resultado_ia?: any;
  parametros?: any;
  created_at?: string;
}

/**
 * Serviços auxiliares de dados com suporte a modo LocalStorage e serviço de e-mail integrado
 */
export const supabaseService = {
  async signInWithGoogle(emailHint?: string, nameHint?: string) {
    const cleanedEmail = emailHint?.trim().toLowerCase();
    if (!cleanedEmail || !cleanedEmail.includes('@')) {
      return { error: new Error('Informe um e-mail do Google válido para vincular sua conta real.') };
    }
    const targetEmail = cleanedEmail;
    const formattedName = targetEmail.split('@')[0].replace(/[._-]/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const targetName = nameHint?.trim() || formattedName || 'Técnico';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}&background=0284c7&color=fff&size=150&bold=true`;

    if (!isSupabaseConfigured) {
      const newUser = {
        id: 'usr-' + targetEmail.replace(/[^a-z0-9]/gi, ''),
        email: targetEmail,
        user_metadata: { full_name: targetName, avatar_url: avatarUrl, role: 'user', is_admin: false }
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(newUser));
      }
      return { data: { user: newUser, session: { access_token: 'local-user-token' } }, error: null };
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
  },

  async signInWithPassword(email: string, pass: string) {
    if (!isSupabaseConfigured) {
      const demoUser = {
        id: 'local-demo-user-' + email.replace(/[^a-z0-9]/gi, ''),
        email: email.trim(),
        user_metadata: { full_name: email.split('@')[0] }
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(demoUser));
      }
      return { data: { user: demoUser, session: { access_token: 'local-demo-token' } }, error: null };
    }
    return await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
  },

  async signUpWithPassword(email: string, pass: string, fullName?: string) {
    if (!isSupabaseConfigured) {
      const demoUser = {
        id: 'local-demo-user-' + email.replace(/[^a-z0-9]/gi, ''),
        email: email.trim(),
        user_metadata: { full_name: fullName || email.split('@')[0] }
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('amigo_local_user', JSON.stringify(demoUser));
      }
      return { data: { user: demoUser, session: { access_token: 'local-demo-token' } }, error: null };
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    return await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });
  },

  async resetPasswordForEmail(email: string) {
    if (!isSupabaseConfigured) {
      return { data: { message: 'Link de redefinição enviado com sucesso (modo demo)' }, error: null };
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
    return await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
  },

  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amigo_local_user');
    }
    if (!isSupabaseConfigured) return;
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amigo_local_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.id !== 'local-demo-admin') {
              return parsed;
            }
          } catch {
            return null;
          }
        }
      }
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Perfil
  async getProfile(userId: string) {
    if (!isSupabaseConfigured) {
      let email = '';
      let nome = 'Técnico';
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amigo_local_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            email = parsed.email || '';
            nome = parsed.user_metadata?.full_name || 'Técnico';
          } catch {}
        }
      }
      const isRealAdmin = email.toLowerCase().trim() === 'amigorefrigerista@gmail.com';
      return {
        id: userId,
        email,
        nome,
        is_admin: isRealAdmin,
        role: isRealAdmin ? 'admin' : 'user',
        plano: isRealAdmin ? 'pro' : 'free'
      };
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as SupabaseProfile;
  },

  // Clientes
  async getClients(userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return [];
      try {
        const cached = localStorage.getItem('amigo_clients');
        return cached ? JSON.parse(cached) : [];
      } catch { return []; }
    }
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SupabaseClientRecord[];
  },

  async saveClient(client: SupabaseClientRecord, userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return client;
      const clients = await this.getClients(userId);
      const newClient = { ...client, id: client.id || 'cli-' + Date.now(), user_id: userId, created_at: client.created_at || new Date().toISOString() };
      const updated = [newClient, ...clients.filter(c => c.id !== newClient.id)];
      localStorage.setItem('amigo_clients', JSON.stringify(updated));
      return newClient;
    }
    const { data, error } = await supabase
      .from('clients')
      .upsert({ ...client, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Ordens de Serviço (OS)
  async getWorkOrders(userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return [];
      try {
        const cached = localStorage.getItem('amigo_work_orders');
        return cached ? JSON.parse(cached) : [];
      } catch { return []; }
    }
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SupabaseWorkOrder[];
  },

  async saveWorkOrder(order: SupabaseWorkOrder, userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return order;
      const orders = await this.getWorkOrders(userId);
      const newOrder = { ...order, id: order.id || 'os-' + Date.now(), user_id: userId, created_at: order.created_at || new Date().toISOString() };
      const updated = [newOrder, ...orders.filter(o => o.id !== newOrder.id)];
      localStorage.setItem('amigo_work_orders', JSON.stringify(updated));
      return newOrder;
    }
    const { data, error } = await supabase
      .from('work_orders')
      .upsert({ ...order, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteWorkOrder(orderId: string, userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return;
      const orders = await this.getWorkOrders(userId);
      const updated = orders.filter(o => o.id !== orderId);
      localStorage.setItem('amigo_work_orders', JSON.stringify(updated));
      return;
    }
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  // Histórico de Diagnósticos
  async saveDiagnostic(diag: SupabaseDiagnostic, userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return diag;
      const diags = await this.getDiagnosticHistory(userId);
      const newDiag = { ...diag, id: diag.id || 'diag-' + Date.now(), user_id: userId, created_at: new Date().toISOString() };
      const updated = [newDiag, ...diags].slice(0, 50);
      localStorage.setItem('amigo_diagnostics', JSON.stringify(updated));
      return newDiag;
    }
    const { data, error } = await supabase
      .from('diagnostic_history')
      .insert({ ...diag, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDiagnosticHistory(userId: string) {
    if (!isSupabaseConfigured) {
      if (typeof window === 'undefined') return [];
      try {
        const cached = localStorage.getItem('amigo_diagnostics');
        return cached ? JSON.parse(cached) : [];
      } catch { return []; }
    }
    const { data, error } = await supabase
      .from('diagnostic_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },
};
