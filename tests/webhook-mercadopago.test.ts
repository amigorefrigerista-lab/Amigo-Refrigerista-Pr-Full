import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as webhookPost } from '@/app/api/webhooks/mercadopago/route';
import { POST as cancelPost } from '@/app/api/subscription/cancel/route';
import { signSessionToken } from '@/lib/security';

const TEST_WEBHOOK_SECRET = 'mp-test-webhook-secret-2026-hmac-sha256';
const TEST_MP_ACCESS_TOKEN = 'APP_USR-1234567890-test-token';
const TEST_USER_UID = '11111111-2222-3333-4444-555555555555';
const TEST_USER_EMAIL = 'assinante@amigorefrigerista.com.br';

process.env.MERCADOPAGO_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
process.env.MERCADOPAGO_ACCESS_TOKEN = TEST_MP_ACCESS_TOKEN;

function buildSignedWebhookRequest(resourceId: string, eventType = 'payment'): NextRequest {
  const ts = String(Math.floor(Date.now() / 1000));
  const requestId = `req-${crypto.randomUUID()}`;
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  const url = `http://localhost:3000/api/webhooks/mercadopago?id=${encodeURIComponent(
    resourceId
  )}&topic=${encodeURIComponent(eventType)}`;

  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-signature': `ts=${ts},v1=${v1}`,
    },
    body: JSON.stringify({
      id: resourceId,
      type: eventType,
      data: { id: resourceId },
    }),
  });
}

async function runTests() {
  console.log('=== Iniciando Testes Automatizados de Webhook Mercado Pago e Cancelamento ===');

  const externalRef = JSON.stringify({
    uid: TEST_USER_UID,
    email: TEST_USER_EMAIL,
    plan: 'pro',
    expectedAmount: 39.9,
    cycleDays: 30,
  });

  let mockPaymentResponse: any = {};
  let mockPreapprovalPutCalled = false;
  let mockPreapprovalPutBody: any = null;

  const originalFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();

    if (urlStr.includes('api.mercadopago.com/v1/payments/')) {
      return new Response(JSON.stringify(mockPaymentResponse), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (
      urlStr.includes('api.mercadopago.com/preapproval/') &&
      init?.method?.toUpperCase() === 'PUT'
    ) {
      mockPreapprovalPutCalled = true;
      mockPreapprovalPutBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(JSON.stringify({ id: 'preapp-999', status: 'cancelled' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return originalFetch(input, init);
  };

  try {
    // 1. Pagamento Aprovado (Approved)
    const fixedApprovedDate = '2026-10-01T12:00:00.000Z';
    mockPaymentResponse = {
      id: 'pay-approved-1001',
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 39.9,
      date_approved: fixedApprovedDate,
      external_reference: externalRef,
    };

    const res1 = await webhookPost(buildSignedWebhookRequest('pay-approved-1001'));
    const json1 = await res1.json();
    assert.equal(res1.status, 200, 'Pagamento aprovado deve responder 200');
    assert.equal(json1.idempotent_skip, false, 'Primeira entrega não deve pular por idempotência');
    assert.equal(
      json1.plan_expires_at,
      new Date(new Date(fixedApprovedDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      'Expiração deve ser calculada a partir de date_approved + 30 dias'
    );
    console.log('✔ [1/5] Pagamento aprovado: processado e plan_expires_at = date_approved + 30d');

    // 2. Reenvio do Mesmo Pagamento (Idempotência)
    const res2 = await webhookPost(buildSignedWebhookRequest('pay-approved-1001'));
    const json2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(
      json2.idempotent_skip,
      true,
      'Reenvio do mesmo payment_id deve ser ignorado de forma idempotente'
    );
    console.log('✔ [2/5] Reenvio de webhook (retry): idempotência confirmada (idempotent_skip=true)');

    // 3. Checkout Abandonado / Rejeitado (Não pode derrubar assinatura ativa)
    mockPaymentResponse = {
      id: 'pay-abandoned-1002',
      status: 'rejected',
      status_detail: 'cc_rejected_other_reason',
      transaction_amount: 39.9,
      external_reference: externalRef,
    };
    const res3 = await webhookPost(buildSignedWebhookRequest('pay-abandoned-1002'));
    const json3 = await res3.json();
    assert.equal(res3.status, 200);
    assert.equal(
      json3.ignored_non_revoking_status,
      true,
      'Pagamento rejeitado/abandonado NUNCA deve revogar o plano atual'
    );
    console.log('✔ [3/5] Checkout abandonado/rejeitado: ignorado sem revogar plano ativo');

    // 4. Reembolso / Chargeback do Pagamento Ativo (Revoga o acesso)
    mockPaymentResponse = {
      id: 'pay-approved-1001',
      status: 'refunded',
      status_detail: 'refunded',
      transaction_amount: 39.9,
      external_reference: externalRef,
    };
    const res4 = await webhookPost(buildSignedWebhookRequest('pay-approved-1001'));
    const json4 = await res4.json();
    assert.equal(res4.status, 200);
    assert.equal(
      json4.revoked_active_subscription,
      true,
      'Reembolso do payment_id ativo deve revogar a assinatura'
    );
    console.log('✔ [4/5] Reembolso (refunded) do payment_id ativo: assinatura revogada com sucesso');

    // 5. Cancelamento de Assinatura Recorrente (/api/subscription/cancel)
    // Verifica chamada PUT /preapproval/{id} com status: "cancelled" e manutenção do plano até plan_expires_at
    const futureExpiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    const sessionToken = signSessionToken({
      uid: TEST_USER_UID,
      email: TEST_USER_EMAIL,
      emailConfirmed: true,
      role: 'user',
      plan: 'pro',
      planExpiresAt: futureExpiresAt,
    });

    const cancelReq = new NextRequest('http://localhost:3000/api/subscription/cancel', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        userId: TEST_USER_UID,
        preapprovalId: 'preapp-999',
      }),
    });

    const res5 = await cancelPost(cancelReq);
    const json5 = await res5.json();
    assert.equal(res5.status, 200, 'Cancelamento deve responder 200');
    assert.equal(
      mockPreapprovalPutCalled,
      true,
      'Deve chamar PUT /preapproval/{id} no Mercado Pago'
    );
    assert.equal(
      mockPreapprovalPutBody?.status,
      'cancelled',
      'Deve enviar status: "cancelled" para o Mercado Pago'
    );
    assert.equal(
      json5.subscription.plan,
      'pro',
      'Deve manter o plano pago até plan_expires_at e não rebaixar para free na hora'
    );
    assert.equal(json5.subscription.status, 'cancelled');
    console.log(
      '✔ [5/5] Cancelamento recorrente: chamou PUT /preapproval/{id} (status: cancelled) e manteve plano até plan_expires_at'
    );

    console.log('=== Todos os 5 cenários passaram com 100% de sucesso! ===');
  } finally {
    global.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error('FALHA NOS TESTES DE WEBHOOK:', err);
  process.exit(1);
});
