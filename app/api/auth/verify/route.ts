import { NextRequest, NextResponse } from 'next/server';
import firebaseConfig from '@/firebase-applet-config.json';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json().catch(() => ({}));
    const idToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : body.idToken;

    if (!idToken) {
      return NextResponse.json(
        { verified: false, error: 'ID Token de autenticação não fornecido' },
        { status: 400 }
      );
    }

    // Validação do Token junto à API segura de verificação do Firebase
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const googleRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const data = await googleRes.json();

    if (!googleRes.ok || !data.users || data.users.length === 0) {
      return NextResponse.json(
        { verified: false, error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const verifiedUser = data.users[0];
    const isEmailAdmin = verifiedUser.email?.toLowerCase().trim() === 'amigorefrigerista@gmail.com';

    return NextResponse.json({
      verified: true,
      uid: verifiedUser.localId,
      email: verifiedUser.email,
      emailVerified: verifiedUser.emailVerified || false,
      displayName: verifiedUser.displayName || verifiedUser.email?.split('@')[0],
      photoUrl: verifiedUser.photoUrl,
      role: isEmailAdmin ? 'admin' : 'user',
      projectId: firebaseConfig.projectId
    });
  } catch (err: any) {
    console.error('Erro na verificação do token Firebase:', err);
    return NextResponse.json(
      { verified: false, error: err.message || 'Erro interno na verificação do servidor' },
      { status: 500 }
    );
  }
}
