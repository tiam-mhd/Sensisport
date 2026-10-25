import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, shippingMethods } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/shipping/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const payload = await readJson(request, 2_000);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = z.object({ enabled: z.boolean() }).safeParse(payload.value);
  if (!parsed.success) return jsonError("Invalid shipping update.", 400);
  const [method] = await getDb().update(shippingMethods).set({ enabled: parsed.data.enabled, updatedAt: new Date() }).where(eq(shippingMethods.id, id)).returning({ id: shippingMethods.id });
  if (!method) return jsonError("Shipping method not found.", 404);
  await getDb().insert(auditLogs).values({ actorId: admin.id, action: parsed.data.enabled ? "shipping_method.enabled" : "shipping_method.disabled", entityType: "shipping_method", entityId: id, details: {}, ipHash: null });
  return Response.json({ ok: true });
}
