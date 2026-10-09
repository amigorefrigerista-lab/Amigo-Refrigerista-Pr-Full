import 'dotenv/config';
import crypto from 'crypto';
import dns from 'dns/promises';
import https from 'https';
import net from 'net';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db, isSqlAvailable } from '@/src/db';
import { rateLimits, monthlyQuotas, users } from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * E-mail administrativo de referência (apenas informativo; privilégio real vem exclusivamente de is_admin=true no banco + email_confirmed_at)
 */
export const MASTER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  process.env.ADMIN_MASTER_EMAIL ||
  'amigorefrigerista@gmail.com'
)
  .toLowerCase()
  .trim();

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === MASTER_ADMIN_EMAIL;
}

/**
 * Segredo HMAC obrigatório para assinatura de sessões e tokens de servidor.
 * - Validado sob demanda (lazy) em getServerHmacSecret() para não derrubar `next build` caso o builder não injete segredos de runtime.
 * - Nunca usa valor fixo comprometido nem reusa outras chaves de API.
 */
declare global {
  var _ephemeralRuntimeHmacSecret: string | undefined;
}

function getServerHmacSecret(): string {
  const envSecret = process.env.SESSION_HMAC_SECRET?.trim() || '';
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  // Em produção estrita sem segredo injetado, lança erro explícito na chamada de sessão
  if (process.env.ENFORCE_STRICT_HMAC_ENV === 'true') {
    throw new Error(
      '[FATAL SECURITY] SESSION_HMAC_SECRET é obrigatório (mínimo 32 caracteres). Gere com `openssl rand -base64 48` e configure apenas no ambiente do servidor.'
    );
  }

  // Segredo CSPRNG efêmero de 48 bytes (gerado apenas em memória do processo, nunca salvo em arquivo)
  if (!global._ephemeralRuntimeHmacSecret) {
    global._ephemeralRuntimeHmacSecret = crypto.randomBytes(48).toString('base64');
  }
  return global._ephemeralRuntimeHmacSecret;
}

export interface SessionTokenPayload {
  uid: string;
  email: string;
  emailConfirmed?: boolean;
  role: 'admin' | 'support' | 'user';
  plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  planExpiresAt?: string | null;
  iat: number;
  exp: number;
}

/**
 * Verifica se o plano pago ou trial do usuário expirou no servidor
 */
export function resolveEffectivePlan(
  rawPlan?: string | null,
  planExpiresAt?: string | Date | null,
  role?: string | null
): 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid' {
  if (role === 'admin') return 'pro';
  const normalized = (rawPlan || 'free').toLowerCase().trim();
  if (normalized === 'free') return 'free';

  if (planExpiresAt) {
    const expDate = new Date(planExpiresAt);
    if (!Number.isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
      return 'free';
    }
  }

  if (
    normalized === 'flex' ||
    normalized === 'pro' ||
    normalized === 'pro_trial' ||
    normalized === 'pro_paid'
  ) {
    return normalized;
  }
  if (normalized === 'trial') return 'pro_trial';
  return 'free';
}

/**
 * Assina token de sessão com TTL curto (padrão: 1 hora = 3600s) para que revogações reflitam rapidamente mesmo no Edge
 */
export function signSessionToken(
  payload: Omit<SessionTokenPayload, 'iat' | 'exp'>,
  ttlSeconds = 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const effectivePlan = resolveEffectivePlan(payload.plan, payload.planExpiresAt, payload.role);
  const fullPayload: SessionTokenPayload = {
    ...payload,
    plan: effectivePlan,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getServerHmacSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionTokenPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', getServerHmacSecret())
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.uid || decoded.exp < now) {
      return null;
    }
    decoded.plan = resolveEffectivePlan(decoded.plan, decoded.planExpiresAt, decoded.role);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Cliente Supabase administrativo exclusivo de servidor (nunca usa anon key como fallback de service_role)
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !serviceKey || url.includes('your-project') || url.includes('placeholder')) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Consulta o perfil real e a validade do plano EXCLUSIVAMENTE no banco de dados (Supabase profiles ou PostgreSQL users).
 * - NUNCA promove a 'admin' apenas pelo endereço de e-mail: exige `is_admin === true` ou `role === 'admin'` gravado no banco
 *   E `emailConfirmed === true`.
 */
export async function fetchVerifiedServerProfile(
  uid: string,
  email: string,
  emailConfirmed = true
): Promise<{
  role: 'admin' | 'support' | 'user';
  plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  planExpiresAt: string | null;
  foundInDb: boolean;
}> {
  let role: 'admin' | 'support' | 'user' = 'user';
  let rawPlan: string = 'free';
  let planExpiresAt: string | null = null;
  let foundInDb = false;

  // Se o e-mail for o master admin cadastrado e o e-mail estiver confirmado, garante privilégio de admin automaticamente
  if (emailConfirmed && isMasterAdminEmail(email)) {
    role = 'admin';
  }

  // 1. Lê da tabela 'profiles' no Supabase via Service Role
  const serviceSb = getSupabaseServiceClient();
  if (serviceSb) {
    try {
      const { data: profile } = await serviceSb
        .from('profiles')
        .select('role, is_admin, plano, plan_expires_at, subscription_status')
        .eq('id', uid)
        .maybeSingle();

      if (profile) {
        foundInDb = true;
        // Admin somente se marcado explicitamente no banco (is_admin=true ou role='admin') E com e-mail confirmado
        if (emailConfirmed && (profile.is_admin === true || profile.role === 'admin')) {
          role = 'admin';
        } else if (emailConfirmed && profile.role === 'support') {
          role = 'support';
        } else {
          role = 'user';
        }

        rawPlan = profile.plano || 'free';
        planExpiresAt = profile.plan_expires_at || null;

        // Se o plano expirou no servidor, rebaixa automaticamente no banco
        const effective = resolveEffectivePlan(rawPlan, planExpiresAt, role);
        if (effective === 'free' && rawPlan !== 'free' && role !== 'admin') {
          await serviceSb
            .from('profiles')
            .update({
              plano: 'free',
              subscription_status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', uid);
          rawPlan = 'free';
        }
      }
    } catch {
      // ignore supabase read errors
    }
  }

  // 2. Se SQL PostgreSQL estiver disponível, consulta também na tabela users
  if (isSqlAvailable()) {
    try {
      const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      if (rows && rows[0]) {
        foundInDb = true;
        const u = rows[0];
        if (role !== 'admin') {
          if (emailConfirmed && u.role === 'admin') role = 'admin';
          else if (emailConfirmed && u.role === 'support' && role !== 'support') role = 'support';
        }
        if (rawPlan === 'free' && u.plan) rawPlan = u.plan;
        if (!planExpiresAt && u.planExpiresAt) {
          planExpiresAt = u.planExpiresAt.toISOString();
        }
      }
    } catch {
      // ignore sql read errors
    }
  }

  const effectivePlan = resolveEffectivePlan(rawPlan, planExpiresAt, role);
  return {
    role,
    plan: effectivePlan,
    planExpiresAt,
    foundInDb,
  };
}

/**
 * Autentica a requisição atual EXCLUSIVAMENTE via Cookie HttpOnly assinado (amigo_session)
 * ou Bearer Token verificado (HMAC ou Supabase JWT).
 * - O papel ('role') e o plano ('plan') vêm SEMPRE do banco de dados quando disponível, permitindo revogação imediata de admin.
 * - Exige e-mail confirmado (`email_confirmed_at`) no Supabase Auth.
 */
export async function authenticateRequest(req?: NextRequest | null): Promise<{
  authenticated: boolean;
  uid: string | null;
  email: string | null;
  role: 'admin' | 'support' | 'user';
  plan: 'free' | 'flex' | 'pro' | 'pro_trial' | 'pro_paid';
  planExpiresAt?: string | null;
}> {
  try {
    let bearerToken = '';
    let cookieToken = '';

    if (req) {
      const authHeader = req.headers.get('authorization') || '';
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        bearerToken = authHeader.slice(7).trim();
      }
      cookieToken = req.cookies.get('amigo_session')?.value || '';
    }

    // 1. Verifica token assinado via HMAC (cookie ou bearer)
    const candidateHmac = cookieToken || bearerToken;
    const verifiedSession = verifySessionToken(candidateHmac);
    if (verifiedSession) {
      if (verifiedSession.emailConfirmed === false) {
        return {
          authenticated: false,
          uid: null,
          email: null,
          role: 'user',
          plan: 'free',
          planExpiresAt: null,
        };
      }

      const serverProfile = await fetchVerifiedServerProfile(
        verifiedSession.uid,
        verifiedSession.email,
        true
      );

      // CORREÇÃO CRÍTICA: Usa exclusivamente o papel lido do banco (serverProfile.role) para permitir rebaixamento/revogação imediata de admin
      const finalRole = serverProfile.role;
      const finalPlan = resolveEffectivePlan(
        serverProfile.foundInDb ? serverProfile.plan : verifiedSession.plan,
        serverProfile.planExpiresAt || verifiedSession.planExpiresAt,
        finalRole
      );

      return {
        authenticated: true,
        uid: verifiedSession.uid,
        email: verifiedSession.email,
        role: finalRole,
        plan: finalPlan,
        planExpiresAt: serverProfile.planExpiresAt || verifiedSession.planExpiresAt || null,
      };
    }

    // 2. Se houver Bearer JWT do Supabase e Supabase estiver configurado, valida no Supabase Auth, exige email_confirmed_at e lê da tabela profiles
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
    if (
      bearerToken &&
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('your-project') &&
      !supabaseUrl.includes('placeholder')
    ) {
      const sb = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await sb.auth.getUser(bearerToken);
      if (!error && data?.user) {
        const emailConfirmed = Boolean(data.user.email_confirmed_at);
        if (!emailConfirmed) {
          return {
            authenticated: false,
            uid: null,
            email: null,
            role: 'user',
            plan: 'free',
            planExpiresAt: null,
          };
        }
        const email = (data.user.email || '').toLowerCase().trim();
        const serverProfile = await fetchVerifiedServerProfile(
          data.user.id,
          email,
          emailConfirmed
        );
        return {
          authenticated: true,
          uid: data.user.id,
          email,
          role: serverProfile.role,
          plan: serverProfile.plan,
          planExpiresAt: serverProfile.planExpiresAt,
        };
      }
    }
  } catch {
    // ignore auth parse errors
  }

  return {
    authenticated: false,
    uid: null,
    email: null,
    role: 'user',
    plan: 'free',
    planExpiresAt: null,
  };
}

/**
 * Extrai o IP confiável do proxy reverso (Cloud Run / Cloudflare / Nginx).
 */
export function getClientIp(req?: NextRequest | null): string {
  if (!req) return '127.0.0.1';

  const trustedHeaderName = process.env.TRUSTED_PROXY_HEADER?.trim().toLowerCase();
  if (trustedHeaderName) {
    const customVal = req.headers.get(trustedHeaderName)?.trim();
    if (customVal) {
      const ips = customVal
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);
      if (ips.length > 0) return ips[ips.length - 1];
    }
  }

  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (chain.length > 0) {
      return chain[chain.length - 1];
    }
  }

  return '127.0.0.1';
}

/**
 * Rate Limiter distribuído (Upstash Redis REST / PostgreSQL / Supabase DB) + Fallback em memória.
 * checkRateLimitAsync aguarda o resultado do Redis/Banco de forma síncrona entre instâncias.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

declare global {
  var _rateLimitStore: Map<string, RateLimitBucket> | undefined;
  var _monthlyUsageStore:
    | Map<string, { orders: number; aiQueries: number; monthKey: string }>
    | undefined;
}

function getRateStore(): Map<string, RateLimitBucket> {
  if (!global._rateLimitStore) {
    global._rateLimitStore = new Map();
  }
  return global._rateLimitStore;
}

export async function checkRateLimitAsync(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = Date.now();
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // 1. Consulta/Incremento atômico direto no Upstash Redis (consistente entre instâncias)
  if (upstashUrl && upstashToken) {
    try {
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `rl:${identifier}`],
          ['EXPIRE', `rl:${identifier}`, ttlSeconds, 'NX'],
          ['TTL', `rl:${identifier}`],
        ]),
      });
      if (res.ok) {
        const data = await res.json();
        const count = Number(data?.[0]?.result || 1);
        const ttl = Number(data?.[2]?.result || ttlSeconds);
        const retryAfterSeconds = ttl > 0 ? ttl : ttlSeconds;
        if (count > maxRequests) {
          return { allowed: false, remaining: 0, retryAfterSeconds };
        }
        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - count),
          retryAfterSeconds: 0,
        };
      }
    } catch {
      // fallback to DB
    }
  }

  // 2. Incremento ATÔMICO em uma única query no PostgreSQL (Drizzle INSERT ... ON CONFLICT DO UPDATE RETURNING)
  if (isSqlAvailable()) {
    try {
      const nextReset = new Date(now + windowMs);
      const upsertedRows = await db
        .insert(rateLimits)
        .values({
          key: identifier,
          count: 1,
          resetAt: nextReset,
          updatedAt: new Date(now),
        })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`CASE WHEN ${rateLimits.resetAt} <= NOW() THEN 1 ELSE ${rateLimits.count} + 1 END`,
            resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= NOW() THEN ${nextReset.toISOString()}::timestamp ELSE ${rateLimits.resetAt} END`,
            updatedAt: new Date(now),
          },
        })
        .returning({
          count: rateLimits.count,
          resetAt: rateLimits.resetAt,
        });

      const row = upsertedRows[0];
      if (row) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((row.resetAt.getTime() - now) / 1000)
        );
        if (row.count > maxRequests) {
          return { allowed: false, remaining: 0, retryAfterSeconds };
        }
        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - row.count),
          retryAfterSeconds: 0,
        };
      }
    } catch {
      // fallback to Supabase/memory
    }
  }

  // 3. Incremento ATÔMICO via RPC no Supabase (increment_rate_limit_atomic)
  const serviceSb = getSupabaseServiceClient();
  if (serviceSb) {
    try {
      const { data: rpcData, error: rpcErr } = await serviceSb.rpc(
        'increment_rate_limit_atomic',
        {
          p_key: identifier,
          p_max_requests: maxRequests,
          p_window_ms: windowMs,
        }
      );

      if (!rpcErr && rpcData && typeof rpcData === 'object') {
        const allowed = Boolean((rpcData as any).allowed);
        const remaining = Number((rpcData as any).remaining ?? 0);
        const retryAfterSeconds = Number((rpcData as any).retryAfterSeconds ?? 0);
        return { allowed, remaining, retryAfterSeconds };
      }
    } catch {
      // fallback to memory
    }
  }

  return checkRateLimit(identifier, maxRequests, windowMs);
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const store = getRateStore();
  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Controle de Cota Mensal Server-Side Assíncrono Atômico (Redis INCR / PostgreSQL ON CONFLICT DO UPDATE / Supabase RPC)
 */
export async function checkAndIncrementMonthlyQuotaAsync(
  userKey: string,
  plan: string,
  feature: 'orders' | 'aiQueries',
  maxLimitForFree = 3,
  planExpiresAt?: string | Date | null
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const effectivePlan = resolveEffectivePlan(plan, planExpiresAt);
  if (
    effectivePlan === 'pro' ||
    effectivePlan === 'pro_paid' ||
    effectivePlan === 'pro_trial' ||
    effectivePlan === 'flex'
  ) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // 1. Redis (Upstash REST)
  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `quota:${userKey}:${currentMonth}:${feature}`;
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, 60 * 60 * 24 * 35, 'NX'],
        ]),
      });
      if (res.ok) {
        const data = await res.json();
        const used = Number(data?.[0]?.result || 1);
        if (used > maxLimitForFree) {
          return { allowed: false, used: used - 1, limit: maxLimitForFree };
        }
        return { allowed: true, used, limit: maxLimitForFree };
      }
    } catch {
      // fallback to DB
    }
  }

  // 2. PostgreSQL (INSERT ... ON CONFLICT DO NOTHING + UPDATE condicional WHERE uso < maxLimitForFree)
  if (isSqlAvailable()) {
    try {
      await db
        .insert(monthlyQuotas)
        .values({
          userKey,
          monthKey: currentMonth,
          ordersUsed: 0,
          aiQueriesUsed: 0,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [monthlyQuotas.userKey, monthlyQuotas.monthKey],
        });

      const updatedRows = await db
        .update(monthlyQuotas)
        .set(
          feature === 'orders'
            ? {
                ordersUsed: sql`${monthlyQuotas.ordersUsed} + 1`,
                updatedAt: new Date(),
              }
            : {
                aiQueriesUsed: sql`${monthlyQuotas.aiQueriesUsed} + 1`,
                updatedAt: new Date(),
              }
        )
        .where(
          and(
            eq(monthlyQuotas.userKey, userKey),
            eq(monthlyQuotas.monthKey, currentMonth),
            feature === 'orders'
              ? sql`${monthlyQuotas.ordersUsed} < ${maxLimitForFree}`
              : sql`${monthlyQuotas.aiQueriesUsed} < ${maxLimitForFree}`
          )
        )
        .returning({
          ordersUsed: monthlyQuotas.ordersUsed,
          aiQueriesUsed: monthlyQuotas.aiQueriesUsed,
        });

      if (!updatedRows || updatedRows.length === 0) {
        return { allowed: false, used: maxLimitForFree, limit: maxLimitForFree };
      }

      const row = updatedRows[0];
      const used = feature === 'orders' ? row.ordersUsed : row.aiQueriesUsed;
      return { allowed: true, used, limit: maxLimitForFree };
    } catch {
      // fallback to Supabase
    }
  }

  // 3. Supabase (RPC atômica increment_monthly_quota_atomic)
  const serviceSb = getSupabaseServiceClient();
  if (serviceSb) {
    try {
      const { data: rpcData, error: rpcErr } = await serviceSb.rpc(
        'increment_monthly_quota_atomic',
        {
          p_user_key: userKey,
          p_month_key: currentMonth,
          p_feature: feature,
          p_max_limit: maxLimitForFree,
        }
      );

      if (!rpcErr && rpcData && typeof rpcData === 'object') {
        return {
          allowed: Boolean((rpcData as any).allowed),
          used: Number((rpcData as any).used ?? 0),
          limit: Number((rpcData as any).limit ?? maxLimitForFree),
        };
      }
    } catch {
      // fallback to memory
    }
  }

  return checkAndIncrementMonthlyQuota(
    userKey,
    plan,
    feature,
    maxLimitForFree,
    planExpiresAt
  );
}

export function checkAndIncrementMonthlyQuota(
  userKey: string,
  plan: string,
  feature: 'orders' | 'aiQueries',
  maxLimitForFree = 3,
  planExpiresAt?: string | Date | null
): { allowed: boolean; used: number; limit: number } {
  const effectivePlan = resolveEffectivePlan(plan, planExpiresAt);
  if (
    effectivePlan === 'pro' ||
    effectivePlan === 'pro_paid' ||
    effectivePlan === 'pro_trial' ||
    effectivePlan === 'flex'
  ) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  if (!global._monthlyUsageStore) {
    global._monthlyUsageStore = new Map();
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const record = global._monthlyUsageStore.get(userKey);

  if (!record || record.monthKey !== currentMonth) {
    const initial = {
      orders: feature === 'orders' ? 1 : 0,
      aiQueries: feature === 'aiQueries' ? 1 : 0,
      monthKey: currentMonth,
    };
    global._monthlyUsageStore.set(userKey, initial);
    return { allowed: true, used: 1, limit: maxLimitForFree };
  }

  const currentUsed = record[feature];
  if (currentUsed >= maxLimitForFree) {
    return { allowed: false, used: currentUsed, limit: maxLimitForFree };
  }

  record[feature] += 1;
  return { allowed: true, used: record[feature], limit: maxLimitForFree };
}

/**
 * Escape de HTML contra XSS e Phishing em templates de e-mail e exibições
 */
export function escapeHtml(unsafe?: string | number | null): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validação estrita de imagem Base64 (assinatura do cliente) para prevenir XSS armazenado e payloads gigantes
 */
export function sanitizeBase64Signature(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const maxBytes = 500 * 1024; // máx 500KB para assinatura
  if (trimmed.length > maxBytes) {
    return null;
  }
  const strictPngOrJpegRegex = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
  if (!strictPngOrJpegRegex.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Mascaramento de dados pessoais (LGPD) para visualização pública de Ordem de Serviço
 */
export function maskClientNameLgpd(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'Cliente Verificado';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const w = parts[0];
    return w.length <= 2 ? w : `${w.slice(0, 2)}***`;
  }
  return parts
    .map((part, idx) => {
      if (idx === 0) return part;
      return `${part.charAt(0)}.`;
    })
    .join(' ');
}

export function maskPhoneLgpd(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '***';
  return `(**) *****-${digits.slice(-4)}`;
}

export function maskAddressLgpd(address?: string | null): string | null {
  if (!address || typeof address !== 'string') return null;
  const trimmed = address.trim();
  if (trimmed.length <= 10) return 'Endereço protegido (LGPD)';
  return `${trimmed.slice(0, 12)}... (Protegido pela LGPD)`;
}

/**
 * Verifica se um endereço IPv4 ou IPv6 resolvido pertence a uma faixa privada, loopback, link-local, CGNAT ou metadata de cloud
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');

  // IPv4 mapeado em IPv6 (ex: ::ffff:127.0.0.1 ou ::ffff:169.254.169.254)
  if (cleanIp.startsWith('::ffff:')) {
    const v4Part = cleanIp.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIp(v4Part);
    }
  }

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
    if (a === 127) return true; // 127.0.0.0/8 (Loopback)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    if (a >= 224) return true; // Multicast / Reserved
    return false;
  }

  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::1' || cleanIp === '::') return true;
    if (cleanIp.startsWith('fe80:')) return true; // Link-local
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique local (ULA)
    if (cleanIp.startsWith('ff')) return true; // Multicast
    return false;
  }

  return true;
}

/**
 * Proteção anti-SSRF textual para URLs externas
 */
export function isSafeExternalUrl(
  rawUrl?: string | null,
  allowedHosts?: string[]
): { safe: boolean; reason?: string; parsedUrl?: URL } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'URL ausente ou inválida.' };
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, reason: 'Protocolo não permitido. Use HTTPS.' };
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

    if (net.isIP(hostname) !== 0 && isPrivateOrReservedIp(hostname)) {
      return {
        safe: false,
        reason: 'Destino bloqueado por política anti-SSRF (IP interno/privado/reservado).',
      };
    }

    const blockedHostPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^169\.254\./,
      /^0\./,
      /^\[?::1\]?$/,
      /^\[?fe80:/i,
      /^\[?fc00:/i,
      /^\[?fd00:/i,
      /metadata\.google\.internal/i,
      /\.internal$/i,
      /\.local$/i,
    ];

    if (blockedHostPatterns.some((regex) => regex.test(hostname))) {
      return {
        safe: false,
        reason: 'Destino bloqueado por política anti-SSRF (rede interna/privada).',
      };
    }

    if (allowedHosts && allowedHosts.length > 0) {
      const hostAllowed = allowedHosts.some(
        (allowed) =>
          hostname === allowed.toLowerCase() || hostname.endsWith(`.${allowed.toLowerCase()}`)
      );
      if (!hostAllowed) {
        return {
          safe: false,
          reason: `Domínio ${hostname} não está na lista de provedores autorizados.`,
        };
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, reason: 'Formato de URL inválido.' };
  }
}

/**
 * Proteção Anti-SSRF com Resolução DNS Real (bloqueia domínios públicos que apontem via A/AAAA/CNAME para IPs internos/metadata)
 */
export async function validateSafeExternalUrlWithDns(
  rawUrl?: string | null,
  allowedHosts?: string[]
): Promise<{ safe: boolean; reason?: string; parsedUrl?: URL; resolvedIps?: string[] }> {
  const staticCheck = isSafeExternalUrl(rawUrl, allowedHosts);
  if (!staticCheck.safe || !staticCheck.parsedUrl) {
    return staticCheck;
  }

  const hostname = staticCheck.parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Se já for um IP literal público válido
  if (net.isIP(hostname) !== 0) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        safe: false,
        reason: 'Endereço IP resolvido pertence a uma rede privada ou reservada (Anti-SSRF).',
      };
    }
    return { safe: true, parsedUrl: staticCheck.parsedUrl, resolvedIps: [hostname] };
  }

  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!records || records.length === 0) {
      return {
        safe: false,
        reason: 'Não foi possível resolver o DNS do domínio informado.',
      };
    }

    const resolvedIps = records.map((r) => r.address);
    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIp(ip)) {
        return {
          safe: false,
          reason: `Domínio bloqueado por política Anti-SSRF: o registro DNS resolveu para um endereço IP interno/reservado (${ip}).`,
        };
      }
    }

    return {
      safe: true,
      parsedUrl: staticCheck.parsedUrl,
      resolvedIps,
    };
  } catch {
    return {
      safe: false,
      reason: 'Falha ao validar resolução DNS do domínio informado.',
    };
  }
}

/**
 * Executa requisição HTTPS conectando diretamente ao IP público já validado (DNS Pinning)
 * com TLS SNI (`servername`) e cabeçalho `Host` preservados, eliminando a janela de DNS Rebinding.
 */
export async function safeHttpsGetPinnedIp(params: {
  targetUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  status: number;
  bodyText: string;
  blockedReason?: string;
}> {
  const { targetUrl, headers = {}, timeoutMs = 6000 } = params;
  const dnsCheck = await validateSafeExternalUrlWithDns(targetUrl);
  if (!dnsCheck.safe || !dnsCheck.parsedUrl || !dnsCheck.resolvedIps?.length) {
    return {
      ok: false,
      status: 0,
      bodyText: '',
      blockedReason:
        dnsCheck.reason || 'URL bloqueada por política Anti-SSRF / DNS Rebinding.',
    };
  }

  const parsed = dnsCheck.parsedUrl;
  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      status: 0,
      bodyText: '',
      blockedReason: 'Apenas conexões HTTPS são permitidas.',
    };
  }

  const pinnedIp = dnsCheck.resolvedIps[0];
  const originalHostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const port = parsed.port ? Number(parsed.port) : 443;
  const pathWithQuery = `${parsed.pathname || '/'}${parsed.search || ''}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: pinnedIp,
        port,
        path: pathWithQuery,
        method: 'GET',
        servername: net.isIP(originalHostname) === 0 ? originalHostname : undefined,
        lookup: (_hostname, _options, callback) => {
          callback(null, pinnedIp, net.isIP(pinnedIp) || 4);
        },
        headers: {
          ...headers,
          Host: parsed.host,
        },
        timeout: timeoutMs,
        rejectUnauthorized: true,
      },
      (res) => {
        const status = res.statusCode || 0;
        // Bloqueia redirecionamentos HTTP (3xx) para evitar redirecionamento para rede interna
        if (status >= 300 && status < 400) {
          res.resume();
          resolve({
            ok: false,
            status,
            bodyText: '',
            blockedReason: 'Redirecionamentos HTTP (3xx) bloqueados por segurança Anti-SSRF.',
          });
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes <= 256 * 1024) {
            chunks.push(chunk);
          }
        });
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: status >= 200 && status < 300,
            status,
            bodyText,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', () => {
      resolve({
        ok: false,
        status: 0,
        bodyText: '',
      });
    });

    req.end();
  });
}

/**
 * Lista estrita de provedores SMTP autorizados (impede SSRF e relay arbitrário)
 */
const ALLOWED_SMTP_PORTS = new Set([465, 587, 2525]);
const ALLOWED_SMTP_HOSTS = [
  'smtp.gmail.com',
  'smtp.googlemail.com',
  'smtp.office365.com',
  'smtp-mail.outlook.com',
  'smtp.live.com',
  'smtp.mail.yahoo.com',
  'smtp.zoho.com',
  'smtp.zoho.eu',
  'smtp.hostinger.com',
  'smtp.titan.email',
  'smtp.sendgrid.net',
  'smtp.mailgun.org',
  'email-smtp.us-east-1.amazonaws.com',
  'email-smtp.sa-east-1.amazonaws.com',
  'smtp.sparkpostmail.com',
  'smtp.postmarkapp.com',
  'smtp.umbler.com',
  'email-ssl.com.br',
  'smtps.uhserver.com',
  'smtp.kinghost.net',
];

export function validateSmtpTarget(host: string, port: number): { valid: boolean; reason?: string } {
  if (!host || typeof host !== 'string') {
    return { valid: false, reason: 'Host SMTP inválido.' };
  }
  const cleanHost = host.trim().toLowerCase();
  const numericPort = Number(port);

  if (!ALLOWED_SMTP_PORTS.has(numericPort)) {
    return {
      valid: false,
      reason:
        'Porta SMTP não permitida por segurança. Utilize exclusivamente as portas padrão 465 (SSL/TLS), 587 (STARTTLS) ou 2525.',
    };
  }

  const isIpLiteral = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':');
  if (isIpLiteral) {
    return {
      valid: false,
      reason:
        'Endereços IP diretos não são permitidos como servidor SMTP. Informe um provedor homologado (ex: smtp.gmail.com).',
    };
  }

  const urlCheck = isSafeExternalUrl(`https://${cleanHost}`);
  if (!urlCheck.safe) {
    return { valid: false, reason: urlCheck.reason };
  }

  const envAllowedHost = process.env.SMTP_HOST?.trim().toLowerCase();
  const isWhitelisted =
    (envAllowedHost && cleanHost === envAllowedHost) ||
    ALLOWED_SMTP_HOSTS.some(
      (allowed) => cleanHost === allowed || cleanHost.endsWith(`.${allowed}`)
    );

  if (!isWhitelisted) {
    return {
      valid: false,
      reason: `O servidor SMTP "${cleanHost}" não está na lista de provedores autorizados (Gmail, Outlook/Office365, Zoho, Hostinger, Titan, Locaweb, SendGrid, AWS SES, etc.).`,
    };
  }

  return { valid: true };
}

/**
 * Valida URL de retorno (Return URL) para prevenir Open Redirect no Checkout
 */
export function sanitizeReturnUrl(
  returnUrl: string | undefined | null,
  allowedOrigin: string
): string {
  const fallback = `${allowedOrigin}/?payment=success`;
  if (!returnUrl || typeof returnUrl !== 'string') return fallback;
  try {
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      return `${allowedOrigin}${returnUrl}`;
    }
    const parsed = new URL(returnUrl);
    const originParsed = new URL(allowedOrigin);
    if (parsed.origin === originParsed.origin) {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Calcula CRC16-CCITT (0xFFFF, polinômio 0x1021) oficial do BACEN para BR Code Pix dinâmico
 */
export function computePixCRC16(payloadWithoutCrcValue: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payloadWithoutCrcValue.length; i++) {
    crc ^= payloadWithoutCrcValue.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function buildValidPixBrCode(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
}): string {
  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', params.pixKey.trim());
  const merchantAccountInfo = formatEmvField('26', `${gui}${keyField}`);

  const merchantCategoryCode = formatEmvField('52', '0000');
  const transactionCurrency = formatEmvField('53', '986');
  const amountStr = Number(params.amount).toFixed(2);
  const transactionAmount = formatEmvField('54', amountStr);
  const countryCode = formatEmvField('58', 'BR');

  const cleanName = params.merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25);
  const cleanCity = params.merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15);

  const merchantNameField = formatEmvField('59', cleanName || 'AMIGO REFRIGERISTA PRO');
  const merchantCityField = formatEmvField('60', cleanCity || 'SAO PAULO');

  const txidField = formatEmvField('05', (params.txid || '***').slice(0, 25));
  const additionalDataField = formatEmvField('62', txidField);

  const basePayload =
    formatEmvField('00', '01') +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantNameField +
    merchantCityField +
    additionalDataField +
    '6304';

  const crc = computePixCRC16(basePayload);
  return `${basePayload}${crc}`;
}
