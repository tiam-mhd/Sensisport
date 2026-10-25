import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories, categoryTranslations } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const inputSchema = z.object({ active: z.boolean().optional(), nameFa: z.string().trim().min(1).max(160).optional(), nameEn: z.string().trim().min(1).max(160).optional() });

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/categories/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const input = await readJson(request, 6_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = inputSchema.safeParse(input.value);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return jsonError("Invalid category update.", 400);
  const db = getDb();
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1);
  if (!category) return jsonError("Category not found.", 404);
  if (parsed.data.active !== undefined) await db.update(categories).set({ active: parsed.data.active, updatedAt: new Date() }).where(eq(categories.id, id));
  for (const [locale, name] of [["fa", parsed.data.nameFa], ["en", parsed.data.nameEn]] as const) {
    if (name) await db.insert(categoryTranslations).values({ categoryId: id, locale, name }).onConflictDoUpdate({ target: [categoryTranslations.categoryId, categoryTranslations.locale], set: { name } });
  }
  await db.insert(auditLogs).values({ actorId: admin.id, action: "category.updated", entityType: "category", entityId: id, details: parsed.data, ipHash: null });
  return Response.json({ ok: true });
}
