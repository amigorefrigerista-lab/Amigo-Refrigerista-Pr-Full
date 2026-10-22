import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  getSupabaseServiceClient,
  checkRateLimitAsync,
  getClientIp,
} from '@/lib/security';
import { FreeLicense, UserSubscription, calculateSubscriptionEndDate } from '@/lib/licenseService';
import { db, isSqlAvailable } from '@/src/db';
import { users, licenseRedemptions } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

declare global {
  var _serverLicensesStore: FreeLicense[] | undefined;
  var _serverLicenseRedemptions: Set<string> | undefined;
}

function getServerLicenses(): FreeLicense[] {
  if (!global._serverLicensesStore) {
    global._serverLicensesStore = [
      {
        id: 'lic-default-1',
        code: 'PROMO-REFRIGERACAO-30',
        type: 'promotional',
        durationDays: 30,
        maxUses: 1000,
        usedCount: 12,
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lic-default-2',
        code: 'PARCEIRO60',
        type: 'partner',
        durationDays: 60,
        maxUses: 500,
        usedCount: 5,
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'lic-default-3',
        code: 'VIP30',
        type: 'promotional',
        durationDays: 30,
        maxUses: 100,
        usedCount: 2,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return global._serverLicensesStore;
}

function getMemoryRedemptions(): Set<string> {
  if (!global._serverLicenseRedemptions) {
    global._serverLicenseRedemptions = new Set();
  }
  return global._serverLicenseRedemptions;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`licenses_api:${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Muitas tentativas. Aguarde um minuto.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const auth = await authenticateRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    const serviceSb = getSupabaseServiceClient();

    if (action === 'redeem') {
      const rawCode = String(body.code || '').trim().toUpperCase();

      if (!rawCode) {
        return NextResponse.json(
          { success: false, message: 'Informe o código da licença para resgatar.' },
          { status: 400 }
        );
      }

      if (!auth.authenticated || !auth.uid) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Você precisa estar logado com uma sessão verificada para resgatar uma licença.',
          },
          { status: 401 }
        );
      }

      const userId = auth.uid;

      // Impede que assinante pago ativo ('pro', 'pro_paid', 'flex') seja rebaixado para 'pro_trial'
      if (
        (auth.plan === 'pro' || auth.plan === 'pro_paid' || auth.plan === 'flex') &&
        (!auth.planExpiresAt || new Date(auth.planExpiresAt).getTime() > Date.now())
      ) {
        return NextResponse.json({
          success: false,
          message:
            'Você já possui uma assinatura paga ativa. Não é necessário aplicar licença de avaliação.',
        });
      }

      // 1. Execução via função SQL atômica no Supabase (redeem_license_atomic com FOR UPDATE e tabela license_redemptions)
      if (serviceSb) {
        const { data: rpcResult, error: rpcError } = await serviceSb.rpc(
          'redeem_license_atomic',
          {
            p_user_id: userId,
            p_code: rawCode,
          }
        );

        if (!rpcError && rpcResult && typeof rpcResult === 'object') {
          const ok = Boolean((rpcResult as any).success);
          if (!ok) {
            return NextResponse.json({
              success: false,
              message:
                (rpcResult as any).message || 'Não foi possível resgatar o código de licença.',
            });
          }

          const durationDays = Number((rpcResult as any).duration_days || 30);
          const startDate = new Date().toISOString().split('T')[0];
          const endDate =
            (rpcResult as any).end_date || calculateSubscriptionEndDate(startDate, durationDays);

          const subscription: UserSubscription = {
            userId,
            plan: 'pro_trial',
            licenseKeyUsed: rawCode,
            startDate,
            endDate,
            isVip: true,
            status: 'active',
          };

          return NextResponse.json({
            success: true,
            message: `🎉 Licença ativada! Você liberou o Plano Pró por ${durationDays} dias (até ${endDate}).`,
            subscription,
          });
        }
      }

      // 2. Verifica na tabela PostgreSQL license_redemptions ou Set em memória se o usuário já resgatou este código
      const redemptionKey = `${userId}:${rawCode}`;
      if (getMemoryRedemptions().has(redemptionKey)) {
        return NextResponse.json({
          success: false,
          message: 'Você já utilizou este código promocional anteriormente.',
        });
      }

      if (isSqlAvailable()) {
        try {
          const existingRedemption = await db
            .select()
            .from(licenseRedemptions)
            .where(
              and(
                eq(licenseRedemptions.userUid, userId),
                eq(licenseRedemptions.licenseCode, rawCode)
              )
            )
            .limit(1);

          if (existingRedemption && existingRedemption.length > 0) {
            return NextResponse.json({
              success: false,
              message: 'Você já utilizou este código promocional anteriormente.',
            });
          }
        } catch {
          // ignore
        }
      }

      const store = getServerLicenses();
      const found = store.find((l) => l.code === rawCode);
      if (!found) {
        return NextResponse.json({
          success: false,
          message: 'Código de licença não encontrado ou inválido.',
        });
      }

      if (!found.active) {
        return NextResponse.json({
          success: false,
          message: 'Esta licença foi desativada pelo administrador.',
        });
      }

      if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
        return NextResponse.json({
          success: false,
          message: 'Este código de licença já expirou.',
        });
      }

      if (found.usedCount >= found.maxUses) {
        return NextResponse.json({
          success: false,
          message: 'Esta licença atingiu o limite máximo de usuários.',
        });
      }

      // Marca resgate único por usuário e incrementa contador
      getMemoryRedemptions().add(redemptionKey);
      found.usedCount += 1;

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = calculateSubscriptionEndDate(startDate, found.durationDays || 30);
      const expiresAtDate = new Date(endDate + 'T23:59:59.000Z');

      if (isSqlAvailable()) {
        try {
          await db.insert(licenseRedemptions).values({
            licenseCode: rawCode,
            userUid: userId,
            expiresAt: expiresAtDate,
          });

          await db
            .update(users)
            .set({
              plan: 'pro_trial',
              subscriptionStatus: 'active',
              planExpiresAt: expiresAtDate,
            })
            .where(eq(users.uid, userId));
        } catch {
          // ignore
        }
      }

      const subscription: UserSubscription = {
        userId,
        plan: 'pro_trial',
        licenseKeyUsed: rawCode,
        startDate,
        endDate,
        isVip: true,
        status: 'active',
      };

      return NextResponse.json({
        success: true,
        message: `🎉 Licença ativada! Você liberou o Plano Pró por ${found.durationDays} dias (até ${endDate}).`,
        subscription,
      });
    }

    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    if (action === 'list') {
      if (serviceSb) {
        const { data, error } = await serviceSb
          .from('licenses')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return NextResponse.json({ success: true, licenses: data });
        }
      }
      return NextResponse.json({ success: true, licenses: getServerLicenses() });
    }

    if (action === 'create') {
      const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
      const type = body.type || 'promotional';
      const durationDays = Number(body.durationDays) || 30;
      const maxUses = Number(body.maxUses) || 50;
      const prefix = type === 'partner' ? 'PARCEIRO' : type === 'promotional' ? 'PROMO' : 'TRIAL';
      const cleanCode = String(
        body.code || `${prefix}-REFRIGERACAO-${durationDays}-${randomHex}`
      )
        .trim()
        .toUpperCase();

      const newLicense: FreeLicense = {
        id: `lic-${crypto.randomUUID()}`,
        code: cleanCode,
        type,
        durationDays,
        maxUses,
        usedCount: 0,
        active: body.active ?? true,
        createdAt: new Date().toISOString(),
        expiresAt: body.expiresAt || undefined,
      };

      if (serviceSb) {
        await serviceSb.from('licenses').insert({
          id: newLicense.id,
          code: newLicense.code,
          type: newLicense.type,
          duration_days: newLicense.durationDays,
          max_uses: newLicense.maxUses,
          used_count: 0,
          active: newLicense.active,
        });
      }

      const store = getServerLicenses();
      store.unshift(newLicense);
      return NextResponse.json({ success: true, license: newLicense });
    }

    if (action === 'toggle') {
      const licenseId = String(body.licenseId || '').trim();
      const active = Boolean(body.active);

      if (serviceSb && licenseId) {
        await serviceSb.from('licenses').update({ active }).eq('id', licenseId);
      }

      const store = getServerLicenses();
      const item = store.find((l) => l.id === licenseId);
      if (item) item.active = active;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Ação inválida.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erro ao processar operação de licença.' },
      { status: 500 }
    );
  }
}
