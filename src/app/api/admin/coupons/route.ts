import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, coupons } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const inputSchema = z.object({ code: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()), discountPercent: z.number().int().min(1).max(100).nullable().optional(), discountMinor: z.number().int().safe().nonnegative().nullable().optional(), currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(), minimumSubtotalMinor: z.number().int().safe().nonnegative().nullable().optional(), maxUses: z.number().int().positive().nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional() });

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const rows = await getDb().select().from(coupons).orderBy(desc(coupons.createdAt)).limit(200);
  return Response.json({ coupons: rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const input = await readJson(request, 8_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = inputSchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Review the coupon fields.", 400);
  const data = parsed.data;
  const hasPercent = data.discountPercent != null;
  const hasFixed = data.discountMinor != null;
  if (hasPercent === hasFixed || (hasFixed && !data.currency)) return jsonError("Choose either a percentage discount or a fixed amount with currency.", 400);
  if (data.startsAt && data.endsAt && new Date(data.startsAt) >= new Date(data.endsAt)) return jsonError("Coupon end date must be after its start date.", 400);
  try {
    const [coupon] = await getDb().insert(coupons).values({ ...data, startsAt: data.startsAt ? new Date(data.startsAt) : null, endsAt: data.endsAt ? new Date(data.endsAt) : null, active: false }).returning({ id: coupons.id, code: coupons.code });
    await getDb().insert(auditLogs).values({ actorId: admin.id, action: "coupon.created", entityType: "coupon", entityId: coupon.id, details: { code: coupon.code }, ipHash: null });
    return Response.json(coupon, { status: 201 });
  } catch { return jsonError("A coupon already uses this code.", 409); }
}
