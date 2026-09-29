import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário não fornecido" },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const currentSub = userData.subscription || { plan: "pro", status: "active" };

    // Atualiza os dados de assinatura no banco Firestore
    const updatedSub = {
      ...currentSub,
      status: "cancelled",
      autoRenew: false,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, {
      subscription: updatedSub,
    });

    return NextResponse.json({
      success: true,
      message: "Sua assinatura foi cancelada e não haverá novas cobranças. Os benefícios permanecem ativos até o fim do ciclo atual.",
      subscription: updatedSub,
    });
  } catch (err: any) {
    console.error("Erro ao cancelar assinatura:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno ao processar o cancelamento" },
      { status: 500 }
    );
  }
}
