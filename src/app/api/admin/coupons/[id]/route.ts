import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, coupons } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { z } from "zod";

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/coupons/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const payload = await readJson(request, 2_000);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = z.object({ active: z.boolean() }).safeParse(payload.value);
  if (!parsed.success) return jsonError("Invalid coupon update.", 400);
  const [coupon] = await getDb().update(coupons).set({ active: parsed.data.active }).where(eq(coupons.id, id)).returning({ id: coupons.id });
  if (!coupon) return jsonError("Coupon not found.", 404);
  await getDb().insert(auditLogs).values({ actorId: admin.id, action: parsed.data.active ? "coupon.enabled" : "coupon.disabled", entityType: "coupon", entityId: id, details: {}, ipHash: null });
  return Response.json({ ok: true });
}
