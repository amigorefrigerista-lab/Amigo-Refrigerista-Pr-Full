import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_HMAC_SECRET = process.env.SESSION_HMAC_SECRET?.trim() || '';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return uint8ArrayToBase64Url(bytes);
}

/**
 * Valida criptograficamente o token de sessão HMAC-SHA256 usando Web Crypto API no Edge Middleware
 */
async function verifyEdgeSessionToken(token?: string | null): Promise<{
  uid: string;
  email: string;
  emailConfirmed?: boolean;
  role: 'admin' | 'support' | 'user';
  plan: string;
  exp: number;
} | null> {
  if (!token || !token.includes('.') || !SESSION_HMAC_SECRET || SESSION_HMAC_SECRET.length < 32) {
    return null;
  }

  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_HMAC_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(encoded));
    const expectedSig = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));

    if (!constantTimeEqual(sig, expectedSig)) {
      return null;
    }

    const decodedBytes = base64UrlToUint8Array(encoded);
    const jsonStr = new TextDecoder().decode(decodedBytes);
    const payload = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (!payload?.uid || !payload?.exp || payload.exp < now) {
      return null;
    }

    if (payload.emailConfirmed === false) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Em rotas críticas (/admin* e /suporte-admin), revalida o papel ('role') diretamente na tabela 'profiles' do Supabase
 * quando SUPABASE_SERVICE_ROLE_KEY estiver configurado, impedindo que um admin revogado continue usando o cookie antigo.
 */
async function verifyAdminRoleAgainstDatabase(
  uid: string,
  fallbackRole: 'admin' | 'support' | 'user'
): Promise<'admin' | 'support' | 'user'> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (
    !supabaseUrl ||
    !serviceKey ||
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('placeholder')
  ) {
    return fallbackRole;
  }

  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(
        uid
      )}&select=is_admin,role`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0]) {
        const row = rows[0];
        if (row.is_admin === true || row.role === 'admin') return 'admin';
        if (row.role === 'support') return 'support';
        return 'user';
      }
      return 'user';
    }
  } catch {
    // ignore network errors
  }

  return fallbackRole;
}

function applySecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  res.headers.set('x-nonce', nonce);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self), payment=(self)'
  );
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // CSP com Nonce criptográfico por requisição (sem 'unsafe-inline' em script-src e sem 'unsafe-inline' em style-src em produção)
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://sdk.mercadopago.com`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.mercadopago.com`;
  const styleSrc = isDev
    ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`;

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    ...(isDev ? ["style-src-attr 'unsafe-inline'"] : []),
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos https://ui-avatars.com https://api.qrserver.com https://*.googleusercontent.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org https://api.mercadopago.com https://generativelanguage.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001",
    'upgrade-insecure-requests',
  ].join('; ');

  res.headers.set('Content-Security-Policy', cspDirectives);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = generateCspNonce();

  // 1. Proteção CSRF estrita para rotas mutáveis de API (exceto Webhooks externos autenticados por assinatura HMAC)
  // Bloqueia domínios compartilhados (*.run.app genérico) e exige lista exata de origens próprias (Host atual, ALLOWED_ORIGINS ou Referer da mesma origem)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/webhooks/') &&
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH')
  ) {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').trim().toLowerCase();
    const originHeader = req.headers.get('origin')?.trim();
    const refererHeader = req.headers.get('referer')?.trim();
    const secFetchSite = req.headers.get('sec-fetch-site')?.trim().toLowerCase();

    if (secFetchSite === 'cross-site') {
      return NextResponse.json(
        { ok: false, error: 'Requisição cross-site bloqueada por proteção CSRF.' },
        { status: 403 }
      );
    }

    const explicitAllowedHosts = new Set<string>([
      'amigorefrigerista.com.br',
      'www.amigorefrigerista.com.br',
      'app.amigorefrigerista.com.br',
    ]);
    if (process.env.NODE_ENV !== 'production') {
      explicitAllowedHosts.add('localhost:3000');
      explicitAllowedHosts.add('127.0.0.1:3000');
    }
    if (host) {
      explicitAllowedHosts.add(host);
    }

    const envOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    for (const rawOrigin of envOrigins) {
      try {
        const parsedHost = rawOrigin.includes('://')
          ? new URL(rawOrigin).host.toLowerCase()
          : rawOrigin.toLowerCase();
        if (parsedHost) explicitAllowedHosts.add(parsedHost);
      } catch {
        // ignore invalid env entry
      }
    }

    const sourceUrl = originHeader || refererHeader;
    if (sourceUrl) {
      try {
        const sourceHost = new URL(sourceUrl).host.toLowerCase();
        if (!explicitAllowedHosts.has(sourceHost)) {
          return NextResponse.json(
            { ok: false, error: 'Requisição bloqueada por proteção CSRF (Origin não autorizada).' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Cabeçalho Origin/Referer inválido.' },
          { status: 403 }
        );
      }
    }
  }

  // 2. Validação criptográfica do token HMAC + checagem de papel no banco para /admin* e /suporte-admin
  // Não decide admin pelo e-mail: exige role === 'admin' verificado na tabela profiles
  const isAdminRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/suporte-admin');

  if (isAdminRoute) {
    const sessionCookie = req.cookies.get('amigo_session')?.value;
    const verifiedSession = await verifyEdgeSessionToken(sessionCookie);

    let effectiveRole: 'admin' | 'support' | 'user' = 'user';
    if (verifiedSession && verifiedSession.uid) {
      effectiveRole = await verifyAdminRoleAgainstDatabase(
        verifiedSession.uid,
        verifiedSession.role
      );
    }

    const isVerifiedAdmin = effectiveRole === 'admin';
    const isVerifiedSupport = effectiveRole === 'admin' || effectiveRole === 'support';

    const hasRequiredPrivilege = pathname.startsWith('/suporte-admin')
      ? isVerifiedSupport
      : isVerifiedAdmin;

    if (!hasRequiredPrivilege) {
      const isLoginEntryPage =
        pathname === '/admin' || pathname === '/admin/configuracoes';

      if (!isLoginEntryPage) {
        const redirectUrl = new URL('/admin/configuracoes', req.url);
        redirectUrl.searchParams.set('auth_required', '1');
        return applySecurityHeaders(NextResponse.redirect(redirectUrl), nonce);
      }
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
