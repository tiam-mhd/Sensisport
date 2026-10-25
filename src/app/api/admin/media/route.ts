import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, instagramSources, productMedia, productSources, productTranslations, products } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, sameOrigin } from "@/lib/http";
import { deleteProductImage, saveProductImage } from "@/lib/storage/s3";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 9 * 1024 * 1024) return jsonError("Image is too large.", 413);
  const form = await request.formData();
  const productId = String(form.get("productId") ?? "");
  const kind = String(form.get("kind") ?? "source");
  const file = form.get("file");
  const approved = form.get("approved") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(productId) || (kind !== "source" && kind !== "site") || !(file instanceof File)) return jsonError("Invalid media upload.", 400);
  const db = getDb();
  const [product] = await db.select({ id: products.id, sourceReviewStatus: products.sourceReviewStatus }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return jsonError("Product not found.", 404);
  let stored: Awaited<ReturnType<typeof saveProductImage>> | null = null;
  try {
    stored = await saveProductImage(file);
    const [source] = await db.select({ sourceId: productSources.sourceId }).from(productSources).where(eq(productSources.productId, productId)).limit(1);
    const [fa] = await db.select({ name: productTranslations.name }).from(productTranslations).where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, "fa"))).limit(1);
    const [en] = await db.select({ name: productTranslations.name }).from(productTranslations).where(and(eq(productTranslations.productId, productId), eq(productTranslations.locale, "en"))).limit(1);
    const reviewed = (kind === "source" && product.sourceReviewStatus === "approved") || (kind === "site" && approved);
    const [media] = await db.insert(productMedia).values({
      productId, sourceId: kind === "source" ? source?.sourceId ?? null : null,
      kind, storageKey: stored.key, publicUrl: stored.url,
      altFa: fa?.name ?? "تصویر محصول", altEn: en?.name ?? "Product image",
      generationMethod: kind === "source" ? "instagram-source" : "admin-upload",
      reviewStatus: reviewed ? "approved" : "pending",
    }).returning({ id: productMedia.id });
    if (kind === "source" && source?.sourceId) await db.update(instagramSources).set({ sourceImagePath: stored.key }).where(eq(instagramSources.id, source.sourceId));
    await db.insert(auditLogs).values({ actorId: admin.id, action: "product.media_uploaded", entityType: "product_media", entityId: media.id, details: { productId, kind, reviewStatus: reviewed ? "approved" : "pending" }, ipHash: null });
    return Response.json({ id: media.id, url: stored.url, reviewStatus: reviewed ? "approved" : "pending" }, { status: 201 });
  } catch (error) {
    if (stored) await deleteProductImage(stored.key).catch(() => undefined);
    return jsonError(error instanceof Error ? error.message : "Could not upload image.", 400);
  }
}
