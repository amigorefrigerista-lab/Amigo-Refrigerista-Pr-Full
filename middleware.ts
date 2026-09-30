import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_EMAIL = 'amigorefrigerista@gmail.com';

function isValidHttpUrl(urlString?: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    isValidHttpUrl(supabaseUrl) &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder')
  );

  // Se o Supabase estiver configurado no ambiente, valida a sessão via cookies no servidor
  if (isConfigured) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Recupera os dados do usuário autenticado no Supabase
    const { data: { user } } = await supabase.auth.getUser();

    // Rotas protegidas
    const isProtectedAdmin = pathname.startsWith('/admin');
    const isProtectedSupport = pathname.startsWith('/suporte-central');

    if (isProtectedAdmin || isProtectedSupport) {
      // Usuário não autenticado: redireciona para a home
      if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/';
        redirectUrl.searchParams.set('auth_required', 'true');
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Verificação de privilégios de Admin
      if (isProtectedAdmin) {
        const normalizedEmail = user.email?.toLowerCase().trim() || '';
        const isAdmin = normalizedEmail === ADMIN_EMAIL || normalizedEmail.endsWith('@amigorefrigerista.com.br');

        if (!isAdmin) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/';
          redirectUrl.searchParams.set('unauthorized', 'true');
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas protegidas:
     * - /admin/:path*
     * - /suporte-central/:path*
     * Excluindo arquivos estáticos e de mídia
     */
    '/admin/:path*',
    '/suporte-central/:path*',
  ],
};
