import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

const db = getFirestore();
const authAdmin = getAuth();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário não fornecido' }, { status: 400 });
    }

    // 1. Remove os documentos do usuário no Firestore
    await db.collection('users').doc(userId).delete();

    // 2. Apaga o usuário do Firebase Authentication
    await authAdmin.deleteUser(userId);

    return NextResponse.json({ success: true, message: 'Conta excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return NextResponse.json({ error: 'Falha ao excluir conta' }, { status: 500 });
  }
}
