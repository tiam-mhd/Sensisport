import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { isOrderLookupTokenValid } from "@/lib/auth/order-lookup";
import { currentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, { params }: RouteContext<"/api/orders/[orderId]">) {
  const { orderId } = await params;
  if (!/^[a-f0-9]{40}$/i.test(orderId)) return jsonError("Order not found.", 404);
  const [cookieStore, user] = await Promise.all([cookies(), currentUser()]);
  const token = cookieStore.get("sensi_order_lookup")?.value;
  const tokenAllowsOrder = token ? await isOrderLookupTokenValid(token, orderId) : false;
  const db = getDb();
  const [order] = tokenAllowsOrder
    ? await db.select().from(orders).where(eq(orders.publicId, orderId)).limit(1)
    : user
      ? await db.select().from(orders).where(and(eq(orders.publicId, orderId), eq(orders.userId, user.id))).limit(1)
      : [];
  if (!order) return jsonError("Order not found.", 404);
  const [items, payment] = await Promise.all([
    db.select({ title: orderItems.titleSnapshot, quantity: orderItems.quantity, unitPriceMinor: orderItems.unitPriceMinor, currency: orderItems.currency, options: orderItems.optionsSnapshot }).from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select({ status: payments.status, provider: payments.provider }).from(payments).where(eq(payments.orderId, order.id)).limit(1),
  ]);
  return Response.json({ publicId: order.publicId, status: order.status, totalMinor: order.totalMinor, currency: order.currency, createdAt: order.createdAt, items, payment: payment[0] ?? null }, { headers: { "cache-control": "no-store" } });
}
