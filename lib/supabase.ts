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

// URL e chave padrão seguras para inicialização sem quebra de execução
const safeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-amigorefrigerista.supabase.co';
const safeKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_app_startup';

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
 * Serviços auxiliares de dados para o Supabase
 */
export const supabaseService = {
  // Autenticação
  async signInWithGoogle() {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    }
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
  },

  async signInWithPassword(email: string, pass: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    }
    return await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
  },

  async signUpWithPassword(email: string, pass: string, fullName?: string) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    }
    return await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Perfil
  async getProfile(userId: string) {
    if (!isSupabaseConfigured) return null;
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
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SupabaseClientRecord[];
  },

  async saveClient(client: SupabaseClientRecord, userId: string) {
    if (!isSupabaseConfigured) return null;
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
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SupabaseWorkOrder[];
  },

  async saveWorkOrder(order: SupabaseWorkOrder, userId: string) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('work_orders')
      .upsert({ ...order, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteWorkOrder(orderId: string, userId: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  // Histórico de Diagnósticos
  async saveDiagnostic(diag: SupabaseDiagnostic, userId: string) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('diagnostic_history')
      .insert({ ...diag, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDiagnosticHistory(userId: string) {
    if (!isSupabaseConfigured) return [];
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
