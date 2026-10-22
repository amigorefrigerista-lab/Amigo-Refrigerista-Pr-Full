import { NextRequest, NextResponse } from 'next/server';
import {
  signSessionToken,
  fetchVerifiedServerProfile,
  checkRateLimitAsync,
  getClientIp,
} from '@/lib/security';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`auth_session:${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Muitas tentativas de autenticação. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { accessToken } = body || {};

    // 1. Exige obrigatoriamente um accessToken válido do Supabase
    if (
      !accessToken ||
      typeof accessToken !== 'string' ||
      accessToken.trim().length < 20 ||
      accessToken.startsWith('local-') ||
      accessToken.startsWith('admin-') ||
      accessToken === 'google-oauth-token'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Sessão negada: um accessToken válido do Supabase é obrigatório para emitir o cookie de sessão.',
        },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseUrl.includes('your-project') ||
      supabaseUrl.includes('placeholder')
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Autenticação Supabase não está configurada no servidor.',
        },
        { status: 503 }
      );
    }

    // 2. Valida o JWT diretamente no servidor do Supabase Auth (ignora uid, email e plan vindos do body)
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await sb.auth.getUser(accessToken.trim());
    if (authError || !authData?.user || !authData.user.id || !authData.user.email) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token de acesso do Supabase inválido ou expirado.',
        },
        { status: 401 }
      );
    }

    // 3. Exige obrigatoriamente que o e-mail tenha sido confirmado no Supabase (email_confirmed_at)
    const emailConfirmed = Boolean(authData.user.email_confirmed_at);
    if (!emailConfirmed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'E-mail ainda não confirmado. Verifique sua caixa de entrada e confirme seu e-mail antes de iniciar a sessão.',
        },
        { status: 403 }
      );
    }

    const verifiedUid = authData.user.id;
    const verifiedEmail = authData.user.email.toLowerCase().trim();

    // 4. Lê role (somente via is_admin/role na tabela profiles), plano e expiração diretamente no servidor
    const serverProfile = await fetchVerifiedServerProfile(
      verifiedUid,
      verifiedEmail,
      emailConfirmed
    );

    // Token com TTL curto (1 hora = 3600s) para que revogações reflitam rapidamente
    const token = signSessionToken(
      {
        uid: verifiedUid,
        email: verifiedEmail,
        emailConfirmed: true,
        role: serverProfile.role,
        plan: serverProfile.plan,
        planExpiresAt: serverProfile.planExpiresAt,
      },
      60 * 60
    );

    const response = NextResponse.json({
      ok: true,
      uid: verifiedUid,
      email: verifiedEmail,
      emailConfirmed: true,
      role: serverProfile.role,
      plan: serverProfile.plan,
      planExpiresAt: serverProfile.planExpiresAt,
      sessionToken: token,
    });

    response.cookies.set('amigo_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hora
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Falha ao estabelecer sessão segura' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('amigo_session');
  return response;
}
