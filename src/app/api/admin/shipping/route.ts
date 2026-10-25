import { desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, shippingMethods } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const inputSchema = z.object({ code: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/), nameFa: z.string().trim().min(1).max(180), nameEn: z.string().trim().min(1).max(180), costMinor: z.number().int().safe().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), detailsFa: z.string().max(2000).optional(), detailsEn: z.string().max(2000).optional() });

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const rows = await getDb().select().from(shippingMethods).orderBy(desc(shippingMethods.createdAt)).limit(100);
  return Response.json({ methods: rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const input = await readJson(request, 8_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = inputSchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Review the shipping method fields.", 400);
  try {
    const [method] = await getDb().insert(shippingMethods).values({ ...parsed.data, enabled: false }).returning({ id: shippingMethods.id });
    await getDb().insert(auditLogs).values({ actorId: admin.id, action: "shipping_method.created", entityType: "shipping_method", entityId: method.id, details: { code: parsed.data.code }, ipHash: null });
    return Response.json(method, { status: 201 });
  } catch { return jsonError("A shipping method already uses this code.", 409); }
}
