import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, productMedia, products } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { deleteProductImage } from "@/lib/storage/s3";

async function canKeepPublishedSource(productId: string, mediaId: string) {
  const db = getDb();
  const [product] = await db.select({ status: products.status }).from(products).where(eq(products.id, productId)).limit(1);
  if (product?.status !== "published") return true;
  const [other] = await db.select({ id: productMedia.id }).from(productMedia).where(and(
    eq(productMedia.productId, productId), eq(productMedia.kind, "source"),
    eq(productMedia.reviewStatus, "approved"), ne(productMedia.id, mediaId),
  )).limit(1);
  return Boolean(other);
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/media/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const input = await readJson(request, 2_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = z.object({ reviewStatus: z.enum(["approved", "rejected", "pending"]) }).safeParse(input.value);
  if (!parsed.success) return jsonError("Invalid media review status.", 400);
  const db = getDb();
  const [existing] = await db.select({ id: productMedia.id, kind: productMedia.kind, productId: productMedia.productId }).from(productMedia).where(eq(productMedia.id, id)).limit(1);
  if (!existing) return jsonError("Image not found.", 404);
  if (existing.kind === "source" && parsed.data.reviewStatus !== "approved" && !(await canKeepPublishedSource(existing.productId, existing.id))) return jsonError("Unpublish the product before rejecting its last approved reference image.", 409);
  const [media] = await db.update(productMedia).set({ reviewStatus: parsed.data.reviewStatus }).where(eq(productMedia.id, id)).returning({ id: productMedia.id, kind: productMedia.kind });
  if (!media) return jsonError("Image not found.", 404);
  await getDb().insert(auditLogs).values({ actorId: admin.id, action: "product.media_reviewed", entityType: "product_media", entityId: id, details: parsed.data, ipHash: null });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/media/[id]">) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const { id } = await params;
  const db = getDb();
  const [media] = await db.select().from(productMedia).where(eq(productMedia.id, id)).limit(1);
  if (!media) return jsonError("Image not found.", 404);
  if (media.kind === "source" && !(await canKeepPublishedSource(media.productId, media.id))) return jsonError("Unpublish the product before deleting its last approved reference image.", 409);
  await deleteProductImage(media.storageKey);
  await db.delete(productMedia).where(eq(productMedia.id, id));
  await db.insert(auditLogs).values({ actorId: admin.id, action: "product.media_deleted", entityType: "product_media", entityId: id, details: { kind: media.kind }, ipHash: null });
  return Response.json({ ok: true });
}
