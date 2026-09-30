import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !profile) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const updatedSub = {
      plan: profile.plano || "pro",
      status: "cancelled",
      autoRenew: false,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        plano: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateErr) throw updateErr;

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
