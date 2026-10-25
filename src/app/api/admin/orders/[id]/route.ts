import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, inventoryMovements, orderStatusHistory, orders, productVariants, products } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const statusSchema = z.object({ status: z.enum(["cancelled", "processing", "shipped", "completed"]), note: z.string().trim().max(500).optional() });

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/orders/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const payload = await readJson(request, 3_000);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = statusSchema.safeParse(payload.value);
  if (!parsed.success) return jsonError("Invalid order status.", 400);
  try {
    await getDb().transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1).for("update");
      if (!order) throw new Error("ORDER_NOT_FOUND");
      const allowed: Record<string, string[]> = {
        quote_requested: ["cancelled"], pending_payment: ["cancelled"], paid: ["processing"],
        processing: ["shipped"], shipped: ["completed"], completed: [], cancelled: [], payment_failed: ["cancelled"],
      };
      if (!allowed[order.status]?.includes(parsed.data.status)) throw new Error("INVALID_TRANSITION");
      if (parsed.data.status === "cancelled") {
        const reservations = await tx.select().from(inventoryMovements).where(and(eq(inventoryMovements.orderId, order.id), eq(inventoryMovements.reason, "order_reserved")));
        for (const reservation of reservations) {
          if (reservation.variantId) await tx.update(productVariants).set({ stock: sql`${productVariants.stock} - ${reservation.delta}`, updatedAt: new Date() }).where(eq(productVariants.id, reservation.variantId));
          else await tx.update(products).set({ stock: sql`${products.stock} - ${reservation.delta}`, updatedAt: new Date() }).where(eq(products.id, reservation.productId));
          await tx.insert(inventoryMovements).values({ productId: reservation.productId, variantId: reservation.variantId, delta: -reservation.delta, reason: "order_cancelled_release", orderId: order.id, actorId: admin.id });
        }
      }
      await tx.update(orders).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({ orderId: order.id, actorId: admin.id, fromStatus: order.status, toStatus: parsed.data.status, note: parsed.data.note ?? null });
      await tx.insert(auditLogs).values({ actorId: admin.id, action: "order.status_changed", entityType: "order", entityId: order.id, details: { from: order.status, to: parsed.data.status }, ipHash: null });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return jsonError("Order not found.", 404);
    return jsonError("This order cannot move to that status.", 409);
  }
}
