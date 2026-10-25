import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, instagramSources, productMedia, productSources, productTranslations, productVariants, products } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

const variantSchema = z.array(z.object({ options: z.record(z.string().min(1).max(80), z.string().min(1).max(120)), stock: z.number().int().min(0).max(2_147_483_647), priceMinor: z.number().int().safe().nonnegative().nullable().optional(), currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional() })).max(50);
const patchSchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(), featured: z.boolean().optional(),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  nameFa: z.string().trim().min(1).max(220).optional(), nameEn: z.string().trim().min(1).max(220).optional(),
  descriptionFa: z.string().max(6000).nullable().optional(), descriptionEn: z.string().max(6000).nullable().optional(),
  priceStatus: z.enum(["unverified", "confirmed", "quote"]).optional(), priceMinor: z.number().int().safe().nonnegative().nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(), stock: z.number().int().min(0).max(2_147_483_647).optional(),
  trackInventory: z.boolean().optional(), sourceApproved: z.boolean().optional(), variants: variantSchema.optional(),
});

export async function GET(_request: Request, { params }: RouteContext<"/api/admin/products/[id]">) {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const [product] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return jsonError("Product not found.", 404);
  const [translations, media, sources, variants] = await Promise.all([
    getDb().select().from(productTranslations).where(eq(productTranslations.productId, id)),
    getDb().select().from(productMedia).where(eq(productMedia.productId, id)),
    getDb().select({ id: instagramSources.id, sourceUrl: instagramSources.sourceUrl, reviewStatus: instagramSources.reviewStatus, priceStatus: instagramSources.priceStatus }).from(productSources).innerJoin(instagramSources, eq(instagramSources.id, productSources.sourceId)).where(eq(productSources.productId, id)),
    getDb().select().from(productVariants).where(eq(productVariants.productId, id)),
  ]);
  return Response.json({ product, translations, media, sources, variants }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/products/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const input = await readJson(request, 4_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = patchSchema.safeParse(input.value);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return jsonError("Invalid product update.", 400);
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return jsonError("Product not found.", 404);
  const data = parsed.data;
  const nextPriceStatus = data.priceStatus ?? product.priceStatus;
  const nextPrice = data.priceMinor === undefined ? product.priceMinor : data.priceMinor;
  const nextCurrency = data.currency === undefined ? product.currency : data.currency;
  const nextStatus = data.status ?? product.status;
  if (nextPriceStatus === "confirmed" && (nextPrice === null || !nextCurrency)) return jsonError("Confirmed price needs an amount and currency.", 400);
  if (nextPriceStatus === "quote" && nextPrice !== null) return jsonError("Quote-only products cannot store a price.", 400);
  if (data.variants?.some((variant) => (variant.priceMinor == null) !== (variant.currency == null))) return jsonError("Variant price overrides need both amount and currency.", 400);
  const variantsToCheck = data.variants ?? await db.select({ priceMinor: productVariants.priceMinor }).from(productVariants).where(eq(productVariants.productId, id));
  if (nextPriceStatus !== "confirmed" && variantsToCheck.some((variant) => variant.priceMinor != null)) return jsonError("Only confirmed-price products can have variant price overrides.", 400);
  if (nextStatus === "published" && data.sourceApproved === false) return jsonError("Move the product to draft before withdrawing its source approval.", 409);
  if (data.sourceApproved !== undefined) {
    const sourceLinks = await db.select({ id: instagramSources.id }).from(productSources).innerJoin(instagramSources, eq(instagramSources.id, productSources.sourceId)).where(eq(productSources.productId, id));
    if (data.sourceApproved && sourceLinks.length === 0) return jsonError("Add a public Instagram source before approving the product.", 409);
    for (const source of sourceLinks) await db.update(instagramSources).set({ reviewStatus: data.sourceApproved ? "approved" : "pending", confidence: data.sourceApproved ? "high" : "unverified", reviewedAt: data.sourceApproved ? new Date() : null }).where(eq(instagramSources.id, source.id));
    await db.update(products).set({ sourceReviewStatus: data.sourceApproved ? "approved" : "pending", confidence: data.sourceApproved ? "high" : "unverified" }).where(eq(products.id, id));
    await db.update(productMedia).set({ reviewStatus: data.sourceApproved ? "approved" : "pending" }).where(and(eq(productMedia.productId, id), eq(productMedia.kind, "source")));
  }
  if (nextStatus === "published") {
    const [source] = await db.select({ id: instagramSources.id }).from(productSources).innerJoin(instagramSources, eq(instagramSources.id, productSources.sourceId)).where(and(eq(productSources.productId, id), eq(instagramSources.reviewStatus, "approved"))).limit(1);
    const [sourceImage] = await db.select({ id: productMedia.id }).from(productMedia).where(and(eq(productMedia.productId, id), eq(productMedia.kind, "source"), eq(productMedia.reviewStatus, "approved"))).limit(1);
    const translations = await db.select({ locale: productTranslations.locale }).from(productTranslations).where(eq(productTranslations.productId, id));
    if (!source || !sourceImage || !translations.some((row) => row.locale === "fa") || !translations.some((row) => row.locale === "en")) return jsonError("Publishing needs an approved public source, its reviewed reference image, and both translations.", 409);
    if (nextPriceStatus === "unverified" || (nextPriceStatus === "confirmed" && (nextPrice === null || !nextCurrency))) return jsonError("Publishing needs a verified price or quote status.", 409);
  }
  const [updated] = await db.transaction(async (tx) => {
    if (data.nameFa !== undefined || data.descriptionFa !== undefined) await tx.insert(productTranslations).values({ productId: id, locale: "fa", name: data.nameFa ?? product.slug, description: data.descriptionFa ?? null }).onConflictDoUpdate({ target: [productTranslations.productId, productTranslations.locale], set: { ...(data.nameFa !== undefined ? { name: data.nameFa } : {}), ...(data.descriptionFa !== undefined ? { description: data.descriptionFa } : {}) } });
    if (data.nameEn !== undefined || data.descriptionEn !== undefined) await tx.insert(productTranslations).values({ productId: id, locale: "en", name: data.nameEn ?? product.slug, description: data.descriptionEn ?? null }).onConflictDoUpdate({ target: [productTranslations.productId, productTranslations.locale], set: { ...(data.nameEn !== undefined ? { name: data.nameEn } : {}), ...(data.descriptionEn !== undefined ? { description: data.descriptionEn } : {}) } });
    if (data.variants) {
      await tx.delete(productVariants).where(eq(productVariants.productId, id));
      if (data.variants.length) await tx.insert(productVariants).values(data.variants.map((variant) => ({ productId: id, options: variant.options, stock: variant.stock, priceMinor: variant.priceMinor ?? null, currency: variant.currency ?? null })));
    }
    const changes = {
      updatedAt: new Date(),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.priceStatus !== undefined ? { priceStatus: data.priceStatus } : {}),
      ...(data.priceMinor !== undefined ? { priceMinor: data.priceMinor } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.trackInventory !== undefined ? { trackInventory: data.trackInventory } : {}),
      ...(data.status !== undefined ? { status: data.status, ...(data.status === "published" ? { publishedAt: new Date() } : {}) } : {}),
    };
    const [row] = await tx.update(products).set(changes).where(eq(products.id, id)).returning();
    await tx.insert(auditLogs).values({ actorId: admin.id, action: data.status ? `product.${data.status}` : "product.updated", entityType: "product", entityId: id, details: { ...data, variants: data.variants?.length }, ipHash: null });
    return [row];
  });
  return Response.json({ product: updated }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/products/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const [updated] = await getDb().update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (!updated) return jsonError("Product not found.", 404);
  await getDb().insert(auditLogs).values({ actorId: admin.id, action: "product.archived", entityType: "product", entityId: id, details: {}, ipHash: null });
  return Response.json({ ok: true });
}
