import { NextRequest, NextResponse } from 'next/server';
import { db, isSqlAvailable, markSqlUnavailable } from '@/src/db';
import {
  users,
  clients,
  quotes,
  installations,
  errorDiagnoses,
  materialsStock,
} from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body || {};

    if (!isSqlAvailable()) {
      return NextResponse.json({ ok: false, reason: 'sql_unavailable', data: null });
    }

    switch (action) {
      case 'syncUser': {
        const { uid, email, name, photoURL } = payload || {};
        if (!uid || !email) return NextResponse.json({ ok: true, data: null });
        const res = await db
          .insert(users)
          .values({
            uid,
            email,
            name: name || null,
            photoURL: photoURL || null,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email,
              ...(name ? { name } : {}),
              ...(photoURL ? { photoURL } : {}),
            },
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getUserProfile': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: null });
        const res = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'updateUserProfile': {
        const { uid, email, name, photoURL } = payload || {};
        if (!uid || !email || !name) return NextResponse.json({ ok: true, data: null });
        const res = await db
          .insert(users)
          .values({
            uid,
            email,
            name,
            photoURL: photoURL || null,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              email,
              name,
              ...(photoURL ? { photoURL } : {}),
            },
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getClients': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: [] });
        const rows = await db
          .select()
          .from(clients)
          .where(eq(clients.userUid, userUid))
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
            .where(and(eq(clients.id, clientData.id), eq(clients.userUid, clientData.userUid)))
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(clients)
            .values({
              userUid: clientData.userUid,
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
        const { id, userUid } = payload || {};
        await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userUid, userUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getQuotes': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: [] });
        const rows = await db
          .select()
          .from(quotes)
          .where(eq(quotes.userUid, userUid))
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
            .where(and(eq(quotes.id, quoteData.id), eq(quotes.userUid, quoteData.userUid)))
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(quotes)
            .values({
              userUid: quoteData.userUid,
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
        const { id, status, userUid } = payload || {};
        const res = await db
          .update(quotes)
          .set({ status })
          .where(and(eq(quotes.id, id), eq(quotes.userUid, userUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'deleteQuote': {
        const { id, userUid } = payload || {};
        await db.delete(quotes).where(and(eq(quotes.id, id), eq(quotes.userUid, userUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getInstallations': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: [] });
        const rows = await db
          .select()
          .from(installations)
          .where(eq(installations.userUid, userUid))
          .orderBy(desc(installations.createdAt));
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'saveInstallation': {
        const instData = payload || {};
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
              warrantyMonths: instData.warrantyMonths || 12,
              qrCode: instData.qrCode || null,
            })
            .where(
              and(eq(installations.id, instData.id), eq(installations.userUid, instData.userUid))
            )
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(installations)
            .values({
              userUid: instData.userUid,
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
              warrantyMonths: instData.warrantyMonths || 12,
              qrCode: instData.qrCode || null,
            })
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        }
      }

      case 'updateInstallationStatus': {
        const { id, status, userUid } = payload || {};
        const res = await db
          .update(installations)
          .set({ status })
          .where(and(eq(installations.id, id), eq(installations.userUid, userUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'deleteInstallation': {
        const { id, userUid } = payload || {};
        await db
          .delete(installations)
          .where(and(eq(installations.id, id), eq(installations.userUid, userUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getDiagnoses': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: [] });
        const rows = await db
          .select()
          .from(errorDiagnoses)
          .where(eq(errorDiagnoses.userUid, userUid))
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
            userUid: diagData.userUid,
            brand: diagData.brand,
            code: diagData.code,
            equipmentType: diagData.equipmentType || null,
            result: JSON.stringify(diagData.result),
          })
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'getStock': {
        const { userUid } = payload || {};
        if (!userUid) return NextResponse.json({ ok: true, data: [] });
        const rows = await db
          .select()
          .from(materialsStock)
          .where(eq(materialsStock.userUid, userUid))
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
              and(eq(materialsStock.id, itemData.id), eq(materialsStock.userUid, itemData.userUid))
            )
            .returning();
          return NextResponse.json({ ok: true, data: res[0] || null });
        } else {
          const res = await db
            .insert(materialsStock)
            .values({
              userUid: itemData.userUid,
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
        const { id, quantity, userUid } = payload || {};
        const res = await db
          .update(materialsStock)
          .set({ quantity })
          .where(and(eq(materialsStock.id, id), eq(materialsStock.userUid, userUid)))
          .returning();
        return NextResponse.json({ ok: true, data: res[0] || null });
      }

      case 'deleteStockItem': {
        const { id, userUid } = payload || {};
        await db
          .delete(materialsStock)
          .where(and(eq(materialsStock.id, id), eq(materialsStock.userUid, userUid)));
        return NextResponse.json({ ok: true, data: true });
      }

      case 'getPublicInstallation': {
        const { orderNumberOrId } = payload || {};
        if (!orderNumberOrId) return NextResponse.json({ ok: true, data: null });
        const cleanId = decodeURIComponent(String(orderNumberOrId)).trim();
        const numericId = parseInt(cleanId, 10);
        if (!isNaN(numericId) && numericId > 0 && String(numericId) === cleanId) {
          const byId = await db
            .select()
            .from(installations)
            .where(eq(installations.id, numericId))
            .limit(1);
          if (byId && byId.length > 0) return NextResponse.json({ ok: true, data: byId[0] });
        }
        const byQr = await db
          .select()
          .from(installations)
          .where(eq(installations.qrCode, cleanId))
          .limit(1);
        return NextResponse.json({ ok: true, data: byQr?.[0] || null });
      }

      default:
        return NextResponse.json({ ok: false, data: null }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: 'db_error', data: null });
  }
}
