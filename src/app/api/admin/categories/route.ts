import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories, categoryTranslations } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const inputSchema = z.object({ slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), nameFa: z.string().trim().min(1).max(160), nameEn: z.string().trim().min(1).max(160), descriptionFa: z.string().max(2000).optional(), descriptionEn: z.string().max(2000).optional() });

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const rows = await getDb().select({ id: categories.id, slug: categories.slug, active: categories.active, sortOrder: categories.sortOrder, locale: categoryTranslations.locale, name: categoryTranslations.name })
    .from(categories).leftJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id)).orderBy(asc(categories.sortOrder));
  return Response.json({ categories: rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const input = await readJson(request, 8_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = inputSchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Review the category fields.", 400);
  try {
    const result = await getDb().transaction(async (tx) => {
      const [category] = await tx.insert(categories).values({ slug: parsed.data.slug }).returning({ id: categories.id });
      await tx.insert(categoryTranslations).values([
        { categoryId: category.id, locale: "fa", name: parsed.data.nameFa, description: parsed.data.descriptionFa ?? null },
        { categoryId: category.id, locale: "en", name: parsed.data.nameEn, description: parsed.data.descriptionEn ?? null },
      ]);
      await tx.insert(auditLogs).values({ actorId: admin.id, action: "category.created", entityType: "category", entityId: category.id, details: { slug: parsed.data.slug }, ipHash: null });
      return category;
    });
    return Response.json(result, { status: 201 });
  } catch { return jsonError("A category already uses this slug.", 409); }
}
