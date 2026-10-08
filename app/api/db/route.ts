import { NextRequest, NextResponse } from 'next/server';
import { db, isSqlAvailable } from '@/src/db';
import {
  users,
  clients,
  quotes,
  installations,
  errorDiagnoses,
  materialsStock,
} from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  authenticateRequest,
  checkRateLimitAsync,
  getClientIp,
  sanitizeBase64Signature,
  maskClientNameLgpd,
  maskPhoneLgpd,
  maskAddressLgpd,
  checkAndIncrementMonthlyQuotaAsync,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`api_db:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, reason: 'rate_limit_exceeded', data: null },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, payload } = body || {};

    if (!isSqlAvailable()) {
      return NextResponse.json({ ok: false, reason: 'sql_unavailable', data: null });
    }

    // Consulta pública de OS (QR Code / Certificado de Garantia) — sanitizada segundo a LGPD
    if (action === 'getPublicInstallation') {
      const { orderNumberOrId } = payload || {};
      if (!orderNumberOrId) return NextResponse.json({ ok: true, data: null });
      const cleanId = decodeURIComponent(String(orderNumberOrId)).trim();

      let found: any = null;
      const numericId = parseInt(cleanId, 10);
      if (!isNaN(numericId) && numericId > 0 && String(numericId) === cleanId) {
        const byId = await db
          .select()
          .from(installations)
          .where(eq(installations.id, numericId))
          .limit(1);
        if (byId && byId.length > 0) found = byId[0];
      }

      if (!found) {
        const byQr = await db
          .select()
          .from(installations)
          .where(eq(installations.qrCode, cleanId))
          .limit(1);
        if (byQr && byQr.length > 0) found = byQr[0];
      }

      if (!found) {
        return NextResponse.json({ ok: true, data: null });
      }

      // Verifica se o requisitante é o próprio técnico dono da OS
      const auth = await authenticateRequest(req);
      const isOwner = auth.authenticated && auth.uid && auth.uid === found.userUid;

      // LGPD: Para visitantes não autenticados, mascara dados sensíveis (telefone, endereço completo e nome completo)
      const sanitizedPublicData = isOwner
        ? found
        : {
            id: found.id,
            qrCode: found.qrCode,
            clientName: maskClientNameLgpd(found.clientName),
            clientPhone: maskPhoneLgpd(found.clientPhone),
            address: maskAddressLgpd(found.address),
            equipment: found.equipment,
            brand: found.brand,
            btus: found.btus,
            type: found.type,
            status: found.status,
            date: found.date,
            warrantyMonths: found.warrantyMonths,
            notes: found.notes,
            customerNotes: found.customerNotes,
            // Não expõe a imagem bruta da assinatura para terceiros não autenticados, apenas flag de assinado
            hasSignature: Boolean(found.customerSignature),
            customerSignature: null,
          };

      return NextResponse.json({ ok: true, data: sanitizedPublicData });
    }

    // Demais ações exigem sessão autenticada e verificada no servidor (sem fallback para payload.userUid)
    const auth = await authenticateRequest(req);
    if (!auth.authenticated || !auth.uid || typeof auth.uid !== 'string') {
      return NextResponse.json({ ok: false, reason: 'unauthorized', data: null }, { status: 401 });
    }

    // Impede que um usuário autenticado acesse/altere registros passando o UID de outro técnico no body
    if (
      payload?.userUid &&
      payload.userUid !== 'public' &&
      payload.userUid !== auth.uid &&
      auth.role !== 'admin'
    ) {
      return NextResponse.json({ ok: false, reason: 'forbidden_cross_tenant', data: null }, { status: 403 });
    }

    const effectiveUid = auth.uid;

    switch (action) {
      case 'syncUser': {
        const { email, name, photoURL } = payload || {};
        const userEmail = auth.email || email;
        if (!effectiveUid || !userEmail) return NextResponse.json({ ok: true, data: null });
        const res = await db
          .insert(users)
          .values({
            uid: effectiveUid,
            email: userEmail,
            name: name || null,
            photoURL: photoURL || null,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email: userEmail,
              ...(name ? { name } : {}),
              ...(photoURL ? { photoURL } : {}),
            },
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getUserProfile': {
        const res = await db.select().from(users).where(eq(users.uid, effectiveUid)).limit(1);
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'updateUserProfile': {
        const { email, name, photoURL } = payload || {};
        const userEmail = auth.email || email;
        if (!effectiveUid || !userEmail || !name) return NextResponse.json({ ok: true, data: null });
        const res = await db
          .insert(users)
          .values({
            uid: effectiveUid,
            email: userEmail,
            name: String(name).trim().slice(0, 120),
            photoURL: photoURL || null,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email: userEmail,
              name: String(name).trim().slice(0, 120),
              ...(photoURL ? { photoURL } : {}),
            },
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getClients': {
        const rows = await db
          .select()
          .from(clients)
          .where(eq(clients.userUid, effectiveUid))
          .orderBy(desc(clients.createdAt));
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'saveClient': {
        const clientData = payload || {};
        if (clientData.id) {
          const res = await db
            .update(clients)
            .set({
              name: clientData.name,
              phone: clientData.phone || null,
              email: clientData.email || null,
              address: clientData.address || null,
              document: clientData.document || null,
              notes: clientData.notes || null,
            })
            .where(and(eq(clients.id, Number(clientData.id)), eq(clients.userUid, effectiveUid)))
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(clients)
            .values({
              userUid: effectiveUid,
              name: clientData.name,
              phone: clientData.phone || null,
              email: clientData.email || null,
              address: clientData.address || null,
              document: clientData.document || null,
              notes: clientData.notes || null,
            })
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        }
      }

      case 'deleteClient': {
        const { id } = payload || {};
        await db.delete(clients).where(and(eq(clients.id, Number(id)), eq(clients.userUid, effectiveUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getQuotes': {
        const rows = await db
          .select()
          .from(quotes)
          .where(eq(quotes.userUid, effectiveUid))
          .orderBy(desc(quotes.createdAt));
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'saveQuote': {
        const quoteData = payload || {};
        const itemsStr = quoteData.items ? JSON.stringify(quoteData.items) : null;
        if (quoteData.id) {
          const res = await db
            .update(quotes)
            .set({
              clientName: quoteData.clientName,
              clientPhone: quoteData.clientPhone || null,
              equipment: quoteData.equipment || null,
              description: quoteData.description || null,
              totalAmount: quoteData.totalAmount,
              status: quoteData.status || 'pendente',
              validityDays: quoteData.validityDays || 15,
              items: itemsStr,
              notes: quoteData.notes || null,
            })
            .where(and(eq(quotes.id, Number(quoteData.id)), eq(quotes.userUid, effectiveUid)))
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(quotes)
            .values({
              userUid: effectiveUid,
              clientName: quoteData.clientName,
              clientPhone: quoteData.clientPhone || null,
              equipment: quoteData.equipment || null,
              description: quoteData.description || null,
              totalAmount: quoteData.totalAmount,
              status: quoteData.status || 'pendente',
              validityDays: quoteData.validityDays || 15,
              items: itemsStr,
              notes: quoteData.notes || null,
            })
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        }
      }

      case 'updateQuoteStatus': {
        const { id, status } = payload || {};
        const res = await db
          .update(quotes)
          .set({ status })
          .where(and(eq(quotes.id, Number(id)), eq(quotes.userUid, effectiveUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'deleteQuote': {
        const { id } = payload || {};
        await db.delete(quotes).where(and(eq(quotes.id, Number(id)), eq(quotes.userUid, effectiveUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getInstallations': {
        const rows = await db
          .select()
          .from(installations)
          .where(eq(installations.userUid, effectiveUid))
          .orderBy(desc(installations.createdAt));
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'saveInstallation': {
        const instData = payload || {};
        const safeSig = sanitizeBase64Signature(instData.customerSignature);

        if (instData.id) {
          const res = await db
            .update(installations)
            .set({
              clientName: instData.clientName,
              clientPhone: instData.clientPhone || null,
              equipment: instData.equipment,
              brand: instData.brand || null,
              btus: instData.btus || null,
              type: instData.type || 'instalacao',
              status: instData.status || 'agendado',
              date: instData.date,
              address: instData.address || null,
              value: instData.value || 0,
              notes: instData.notes || null,
              customerNotes: instData.customerNotes || null,
              customerSignature: safeSig,
              warrantyMonths: instData.warrantyMonths || 12,
              qrCode: instData.qrCode || null,
            })
            .where(
              and(eq(installations.id, Number(instData.id)), eq(installations.userUid, effectiveUid))
            )
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          // Verifica limite mensal de 3 OS no plano Free no servidor (aplicando também expiração do plano)
          const quota = await checkAndIncrementMonthlyQuotaAsync(
            effectiveUid,
            auth.plan,
            'orders',
            3,
            auth.planExpiresAt
          );
          if (!quota.allowed) {
            return NextResponse.json(
              {
                ok: false,
                reason: 'quota_exceeded',
                message: 'Limite mensal de 3 Ordens de Serviço do plano Gratuito atingido.',
                data: null,
              },
              { status: 403 }
            );
          }

          const res = await db
            .insert(installations)
            .values({
              userUid: effectiveUid,
              clientName: instData.clientName,
              clientPhone: instData.clientPhone || null,
              equipment: instData.equipment,
              brand: instData.brand || null,
              btus: instData.btus || null,
              type: instData.type || 'instalacao',
              status: instData.status || 'agendado',
              date: instData.date,
              address: instData.address || null,
              value: instData.value || 0,
              notes: instData.notes || null,
              customerNotes: instData.customerNotes || null,
              customerSignature: safeSig,
              warrantyMonths: instData.warrantyMonths || 12,
              qrCode: instData.qrCode || null,
            })
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        }
      }

      case 'updateInstallationStatus': {
        const { id, status } = payload || {};
        const numericId = Number(id);
        if (Number.isNaN(numericId) || numericId <= 0) {
          return NextResponse.json({ ok: false, data: null }, { status: 400 });
        }
        const res = await db
          .update(installations)
          .set({ status })
          .where(and(eq(installations.id, numericId), eq(installations.userUid, effectiveUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'updateInstallationDetails': {
        const {
          id,
          orderNumber,
          clientName,
          address,
          equipment,
          brand,
          btus,
          status,
          notes,
          customerNotes,
          customerSignature,
        } = payload || {};

        const updateFields: Record<string, any> = {};
        if (clientName !== undefined) updateFields.clientName = String(clientName).slice(0, 200);
        if (address !== undefined) updateFields.address = address ? String(address).slice(0, 400) : null;
        if (equipment !== undefined) updateFields.equipment = String(equipment).slice(0, 200);
        if (brand !== undefined) updateFields.brand = brand ? String(brand).slice(0, 100) : null;
        if (btus !== undefined) updateFields.btus = btus ? String(btus).slice(0, 60) : null;
        if (status !== undefined) updateFields.status = String(status).slice(0, 40);
        if (notes !== undefined) updateFields.notes = notes ? String(notes).slice(0, 4000) : null;
        if (customerNotes !== undefined) {
          updateFields.customerNotes = customerNotes ? String(customerNotes).slice(0, 4000) : null;
        }
        if (customerSignature !== undefined) {
          updateFields.customerSignature = sanitizeBase64Signature(customerSignature);
        }

        // CORREÇÃO CRÍTICA: Filtra estritamente pelo dono (userUid === effectiveUid) para impedir IDOR sequencial
        const numericId = Number(id);
        if (!Number.isNaN(numericId) && numericId > 0) {
          const res = await db
            .update(installations)
            .set(updateFields)
            .where(and(eq(installations.id, numericId), eq(installations.userUid, effectiveUid)))
            .returning();
          if (res[0]) {
            return NextResponse.json({ ok: true, data: res[0] });
          }
        }

        if (orderNumber) {
          const res = await db
            .update(installations)
            .set(updateFields)
            .where(
              and(
                eq(installations.qrCode, String(orderNumber)),
                eq(installations.userUid, effectiveUid)
              )
            )
            .returning();
          if (res[0]) {
            return NextResponse.json({ ok: true, data: res[0] });
          }
        }

        return NextResponse.json({ ok: true, data: null });
      }

      case 'saveCustomerSignature': {
        const { id, orderNumber, clientName, equipment, customerSignature } = payload || {};
        const safeSignature = sanitizeBase64Signature(customerSignature);
        if (!safeSignature) {
          return NextResponse.json(
            { ok: false, reason: 'invalid_signature_format', data: null },
            { status: 400 }
          );
        }

        // CORREÇÃO CRÍTICA: Filtra por userUid do proprietário ao atualizar assinatura por ID ou QR Code
        const numericId = Number(id);
        if (!Number.isNaN(numericId) && numericId > 0) {
          const res = await db
            .update(installations)
            .set({ customerSignature: safeSignature })
            .where(and(eq(installations.id, numericId), eq(installations.userUid, effectiveUid)))
            .returning();
          if (res[0]) {
            return NextResponse.json({ ok: true, data: res[0] });
          }
        }

        if (orderNumber) {
          const res = await db
            .update(installations)
            .set({ customerSignature: safeSignature })
            .where(
              and(
                eq(installations.qrCode, String(orderNumber)),
                eq(installations.userUid, effectiveUid)
              )
            )
            .returning();
          if (res[0]) {
            return NextResponse.json({ ok: true, data: res[0] });
          }
        }

        const inserted = await db
          .insert(installations)
          .values({
            userUid: effectiveUid,
            clientName: String(clientName || 'Cliente Amigo').slice(0, 200),
            equipment: String(equipment || 'Equipamento de Ar-Condicionado').slice(0, 200),
            type: 'instalacao',
            status: 'concluido',
            date: new Date().toISOString().split('T')[0],
            qrCode: orderNumber ? String(orderNumber) : `OS-${Date.now()}`,
            customerSignature: safeSignature,
          })
          .returning();
        return NextResponse.json({ ok: true, data: inserted[0] || null });
      }

      case 'deleteInstallation': {
        const { id } = payload || {};
        await db
          .delete(installations)
          .where(and(eq(installations.id, Number(id)), eq(installations.userUid, effectiveUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getDiagnoses': {
        const rows = await db
          .select()
          .from(errorDiagnoses)
          .where(eq(errorDiagnoses.userUid, effectiveUid))
          .orderBy(desc(errorDiagnoses.createdAt));
        const formatted = rows.map((r) => ({
          id: r.id,
          brand: r.brand,
          code: r.code,
          equipmentType: r.equipmentType,
          result: typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
          createdAt: r.createdAt,
        }));
        return NextResponse.json({ ok: true, data: formatted });
      }

      case 'saveDiagnosis': {
        const diagData = payload || {};
        const res = await db
          .insert(errorDiagnoses)
          .values({
            userUid: effectiveUid,
            brand: diagData.brand,
            code: diagData.code,
            equipmentType: diagData.equipmentType || null,
            result: JSON.stringify(diagData.result),
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getStock': {
        const rows = await db
          .select()
          .from(materialsStock)
          .where(eq(materialsStock.userUid, effectiveUid))
          .orderBy(desc(materialsStock.createdAt));
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'saveStockItem': {
        const itemData = payload || {};
        if (itemData.id) {
          const res = await db
            .update(materialsStock)
            .set({
              name: itemData.name,
              category: itemData.category || 'fluido',
              quantity: itemData.quantity,
              unit: itemData.unit || 'un',
              minQuantity: itemData.minQuantity ?? 2,
              unitCost: itemData.unitCost ?? 0,
            })
            .where(
              and(eq(materialsStock.id, Number(itemData.id)), eq(materialsStock.userUid, effectiveUid))
            )
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(materialsStock)
            .values({
              userUid: effectiveUid,
              name: itemData.name,
              category: itemData.category || 'fluido',
              quantity: itemData.quantity,
              unit: itemData.unit || 'un',
              minQuantity: itemData.minQuantity ?? 2,
              unitCost: itemData.unitCost ?? 0,
            })
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        }
      }

      case 'updateStockQuantity': {
        const { id, quantity } = payload || {};
        const res = await db
          .update(materialsStock)
          .set({ quantity })
          .where(and(eq(materialsStock.id, Number(id)), eq(materialsStock.userUid, effectiveUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'deleteStockItem': {
        const { id } = payload || {};
        await db
          .delete(materialsStock)
          .where(and(eq(materialsStock.id, Number(id)), eq(materialsStock.userUid, effectiveUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      default:
        return NextResponse.json({ ok: false, data: null }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: 'db_error', data: null });
  }
}
