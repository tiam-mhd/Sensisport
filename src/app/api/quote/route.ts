import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, orderItems, orderStatusHistory, orders, productTranslations, productVariants, products } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { createOrderLookupToken } from "@/lib/auth/order-lookup";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { isSafeMinorAmount } from "@/lib/money";
import { emailSchema, localeSchema } from "@/lib/validation";

const requestSchema = z.object({
  locale: localeSchema,
  email: emailSchema,
  recipientName: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(40),
  province: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().max(30).optional(),
  addressLine: z.string().trim().min(8).max(1500),
  note: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), quantity: z.number().int().min(1).max(99) })).min(1).max(40),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const payload = await readJson(request);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = requestSchema.safeParse(payload.value);
  if (!parsed.success) return jsonError("Review the recipient details and items.", 400);
  const { locale, items, email, recipientName, phone } = parsed.data;
  const db = getDb();
  const user = await currentUser();
  try {
    const publicId = randomBytes(20).toString("hex");
    const created = await db.transaction(async (tx) => {
      const snapshots: Array<{ productId: string; variantId: string | null; slug: string; title: string; quantity: number; unitPriceMinor: number | null; currency: string | null; options: Record<string, string> | null }> = [];
      for (const item of items) {
        const [product] = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.status, "published"))).limit(1).for("update");
        if (!product) throw new Error("ITEM_UNAVAILABLE");
        const [translation] = await tx.select({ name: productTranslations.name }).from(productTranslations).where(and(eq(productTranslations.productId, product.id), eq(productTranslations.locale, locale))).limit(1);
        if (!translation) throw new Error("TRANSLATION_UNAVAILABLE");
        const [activeVariant] = await tx.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.active, true))).limit(1);
        let variantId: string | null = null;
        let options: Record<string, string> | null = null;
        let priceMinor = product.priceStatus === "confirmed" ? product.priceMinor : null;
        let currency = product.priceStatus === "confirmed" ? product.currency : null;
        if (activeVariant) {
          if (!item.variantId) throw new Error("VARIANT_REQUIRED");
          const [variant] = await tx.select().from(productVariants).where(and(eq(productVariants.id, item.variantId), eq(productVariants.productId, product.id), eq(productVariants.active, true))).limit(1);
          if (!variant) throw new Error("VARIANT_UNAVAILABLE");
          variantId = variant.id;
          options = variant.options;
          if (product.priceStatus === "confirmed") {
            priceMinor = variant.priceMinor ?? priceMinor;
            currency = variant.currency ?? currency;
          }
        } else if (item.variantId) {
          throw new Error("VARIANT_UNAVAILABLE");
        }
        const lineTotal = priceMinor === null ? null : priceMinor * item.quantity;
        if (lineTotal !== null && !isSafeMinorAmount(lineTotal)) throw new Error("INVALID_PRICE");
        snapshots.push({ productId: product.id, variantId, slug: product.slug, title: translation.name, quantity: item.quantity, unitPriceMinor: priceMinor, currency, options });
      }
      const addressSnapshot = { recipientName, phone, province: parsed.data.province, city: parsed.data.city, postalCode: parsed.data.postalCode ?? "", addressLine: parsed.data.addressLine };
      const [order] = await tx.insert(orders).values({
        publicId, userId: user?.id ?? null, status: "quote_requested", email, recipientName, phone,
        addressSnapshot, note: parsed.data.note ?? null,
        subtotalMinor: null, shippingMinor: null, discountMinor: null, totalMinor: null, currency: null,
      }).returning({ id: orders.id, publicId: orders.publicId });
      await tx.insert(orderItems).values(snapshots.map((item) => ({
        orderId: order.id, productId: item.productId, variantId: item.variantId,
        slugSnapshot: item.slug, titleSnapshot: item.title, optionsSnapshot: item.options,
        unitPriceMinor: item.unitPriceMinor, quantity: item.quantity,
        lineTotalMinor: item.unitPriceMinor === null ? null : item.unitPriceMinor * item.quantity,
        currency: item.currency,
      })));
      await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: null, toStatus: "quote_requested", note: "Customer requested a quote." });
      await tx.insert(auditLogs).values({ actorId: user?.id ?? null, action: "quote.requested", entityType: "order", entityId: order.id, details: { itemCount: snapshots.length }, ipHash: null });
      return order;
    });
    const response = NextResponse.json({ publicId: created.publicId }, { status: 201, headers: { "cache-control": "no-store" } });
    response.cookies.set("sensi_order_lookup", await createOrderLookupToken(created.publicId), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: `/${locale}/order/${created.publicId}`, maxAge: 15 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "ITEM_UNAVAILABLE") return jsonError("One or more products are no longer available.", 409);
    if (error instanceof Error && error.message === "TRANSLATION_UNAVAILABLE") return jsonError("A product translation is not available in this language.", 409);
    if (error instanceof Error && error.message === "VARIANT_REQUIRED") return jsonError("Choose product options before requesting a quote.", 400);
    if (error instanceof Error && error.message === "VARIANT_UNAVAILABLE") return jsonError("One product option is no longer available.", 409);
    if (error instanceof Error && error.message === "INVALID_PRICE") return jsonError("A product line amount is outside the supported range.", 409);
    return jsonError("Could not record the quote request.", 500);
  }
}
