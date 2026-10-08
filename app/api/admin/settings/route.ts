import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getSupabaseServiceClient } from '@/lib/security';
import { getAppSettings, DEFAULT_APP_SETTINGS } from '@/lib/getAppSettings';

declare global {
  var _serverMasterSettings: any | undefined;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.role !== 'admin') {
    return NextResponse.json(
      { ok: false, error: 'Acesso restrito ao Administrador Master.' },
      { status: 403 }
    );
  }

  const current = global._serverMasterSettings || (await getAppSettings());
  return NextResponse.json({
    ok: true,
    settings: current,
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const updated = {
      ...DEFAULT_APP_SETTINGS,
      ...body,
      id: 1,
      pro_plan_price: Number(body.pro_plan_price) > 0 ? Number(body.pro_plan_price) : 39.9,
      flex_plan_price: Number(body.flex_plan_price) > 0 ? Number(body.flex_plan_price) : 19.9,
      maintenance_interval_months: Number(body.maintenance_interval_months) || 6,
      free_trial_days: Number(body.free_trial_days) || 7,
      updated_at: new Date().toISOString(),
    };

    global._serverMasterSettings = updated;

    const serviceSb = getSupabaseServiceClient();
    if (serviceSb) {
      const { error } = await serviceSb.from('app_settings').upsert(updated);
      if (error) {
        return NextResponse.json(
          { ok: false, error: 'Não foi possível salvar no banco Supabase.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Configurações salvas com segurança no servidor!',
      settings: updated,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Falha ao salvar as configurações.' },
      { status: 500 }
    );
  }
}
