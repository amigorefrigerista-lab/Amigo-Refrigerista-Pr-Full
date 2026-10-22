import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const origin =
    req.nextUrl.origin || 'https://ais-pre-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app';

  // Redireciona diretamente para a aplicação com o modal de instalação nativo PWA aberto
  return NextResponse.redirect(`${origin}/?install=1`, 302);
}

