import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError } from "@/lib/http";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const rows = await getDb().select({ id: orders.id, publicId: orders.publicId, email: orders.email, recipientName: orders.recipientName, status: orders.status, totalMinor: orders.totalMinor, currency: orders.currency, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(250);
  return Response.json({ orders: rows }, { headers: { "cache-control": "no-store" } });
}
