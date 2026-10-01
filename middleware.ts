import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Se o seu middleware possui uma regra bloqueando /admin:
  // Remova ou comente o redirecionamento que força a ida para '/'
  
  /* CÓDIGO ANTERIOR QUE CAUSAVA O PROBLEMA:
  if (pathname.startsWith('/admin') && !hasAdminSession) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  */

  // CORREÇÃO: Permita a requisição passar para que o fallback de login da tela seja exibido
  if (pathname.startsWith('/admin/configuracoes') || pathname.startsWith('/admin-master')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};