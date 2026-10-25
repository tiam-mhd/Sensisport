import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, coupons, inventoryMovements, orderItems, orderStatusHistory, orders, payments, productTranslations, productVariants, products, shippingMethods } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { createOrderLookupToken } from "@/lib/auth/order-lookup";
import { paymentReadiness } from "@/lib/checkout/payment";
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
  shippingMethodId: z.string().uuid(),
  couponCode: z.string().trim().max(60).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), quantity: z.number().int().min(1).max(99) })).min(1).max(40),
});

type Line = { productId: string; variantId: string | null; slug: string; title: string; options: Record<string, string> | null; quantity: number; unitPriceMinor: number; currency: string; trackInventory: boolean };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const payload = await readJson(request);
  if (!payload.ok) return jsonError("Invalid request.", payload.status);
  const parsed = requestSchema.safeParse(payload.value);
  if (!parsed.success) return jsonError("Review the recipient details and items.", 400);
  const readiness = paymentReadiness();
  if (!readiness.available || !readiness.provider) return jsonError("A real payment provider is not configured. Use quote requests until it is connected.", 503);

  const data = parsed.data;
  const db = getDb();
  const user = await currentUser();
  try {
    const publicId = randomBytes(20).toString("hex");
    const order = await db.transaction(async (tx) => {
      const lines: Line[] = [];
      for (const item of data.items) {
        const [product] = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.status, "published"))).limit(1).for("update");
        if (!product) throw new Error("ITEM_UNAVAILABLE");
        const [translation] = await tx.select({ name: productTranslations.name }).from(productTranslations).where(and(eq(productTranslations.productId, product.id), eq(productTranslations.locale, data.locale))).limit(1);
        if (!translation) throw new Error("TRANSLATION_UNAVAILABLE");
        const [activeVariant] = await tx.select({ id: productVariants.id }).from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.active, true))).limit(1);
        let variantId: string | null = item.variantId ?? null;
        let options: Record<string, string> | null = null;
        let priceMinor = product.priceMinor;
        let currency = product.currency;
        if (activeVariant) {
          if (!variantId) throw new Error("VARIANT_REQUIRED");
          const [variant] = await tx.select().from(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, product.id), eq(productVariants.active, true))).limit(1).for("update");
          if (!variant) throw new Error("VARIANT_UNAVAILABLE");
          options = variant.options;
          priceMinor = variant.priceMinor ?? priceMinor;
          currency = variant.currency ?? currency;
          if (product.trackInventory && variant.stock < item.quantity) throw new Error("OUT_OF_STOCK");
          if (product.trackInventory) {
            const [updated] = await tx.update(productVariants).set({ stock: sql`${productVariants.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(productVariants.id, variant.id), gt(productVariants.stock, item.quantity - 1))).returning({ stock: productVariants.stock });
            if (!updated) throw new Error("OUT_OF_STOCK");
          }
        } else {
          if (variantId) throw new Error("VARIANT_UNAVAILABLE");
          variantId = null;
          if (product.trackInventory) {
            if (product.stock < item.quantity) throw new Error("OUT_OF_STOCK");
            const [updated] = await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(products.id, product.id), gt(products.stock, item.quantity - 1))).returning({ stock: products.stock });
            if (!updated) throw new Error("OUT_OF_STOCK");
          }
        }
        if (product.priceStatus !== "confirmed" || priceMinor === null || !currency) throw new Error("QUOTE_REQUIRED");
        if (!isSafeMinorAmount(priceMinor)) throw new Error("INVALID_PRICE");
        lines.push({ productId: product.id, variantId, slug: product.slug, title: translation.name, options, quantity: item.quantity, unitPriceMinor: priceMinor, currency, trackInventory: product.trackInventory });
      }
      const currency = lines[0]?.currency;
      if (!currency || lines.some((line) => line.currency !== currency)) throw new Error("MIXED_CURRENCY");
      const subtotal = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
      if (!isSafeMinorAmount(subtotal)) throw new Error("INVALID_PRICE");

      const [shipping] = await tx.select().from(shippingMethods).where(and(eq(shippingMethods.id, data.shippingMethodId), eq(shippingMethods.enabled, true))).limit(1).for("update");
      if (!shipping || shipping.costMinor === null || !shipping.currency) throw new Error("SHIPPING_UNAVAILABLE");
      if (shipping.currency !== currency || !isSafeMinorAmount(shipping.costMinor)) throw new Error("SHIPPING_CURRENCY");
      const shippingMinor = shipping.costMinor;

      let discountMinor = 0;
      const couponCode = data.couponCode?.toUpperCase() || null;
      if (couponCode) {
        const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1).for("update");
        const now = new Date();
        if (!coupon || !coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now) || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) || (coupon.minimumSubtotalMinor !== null && subtotal < coupon.minimumSubtotalMinor)) throw new Error("COUPON_INVALID");
        if (coupon.currency && coupon.currency !== currency) throw new Error("COUPON_CURRENCY");
        discountMinor = coupon.discountPercent !== null ? Math.floor(subtotal * coupon.discountPercent / 100) : Math.min(subtotal, coupon.discountMinor ?? 0);
        if (!isSafeMinorAmount(discountMinor)) throw new Error("COUPON_INVALID");
        await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, coupon.id));
      }
      const total = subtotal + shippingMinor - discountMinor;
      if (!isSafeMinorAmount(total)) throw new Error("INVALID_PRICE");
      const addressSnapshot = { recipientName: data.recipientName, phone: data.phone, province: data.province, city: data.city, postalCode: data.postalCode ?? "", addressLine: data.addressLine };
      const [created] = await tx.insert(orders).values({
        publicId, userId: user?.id ?? null, status: "pending_payment", email: data.email,
        recipientName: data.recipientName, phone: data.phone, addressSnapshot,
        subtotalMinor: subtotal, shippingMinor, discountMinor, totalMinor: total, currency,
        shippingMethodSnapshot: { code: shipping.code, nameFa: shipping.nameFa, nameEn: shipping.nameEn },
        couponCode, note: data.note ?? null,
      }).returning({ id: orders.id, publicId: orders.publicId });
      await tx.insert(orderItems).values(lines.map((line) => ({
        orderId: created.id, productId: line.productId, variantId: line.variantId, slugSnapshot: line.slug,
        titleSnapshot: line.title, optionsSnapshot: line.options, unitPriceMinor: line.unitPriceMinor,
        quantity: line.quantity, lineTotalMinor: line.unitPriceMinor * line.quantity, currency: line.currency,
      })));
      for (const line of lines) if (line.trackInventory) await tx.insert(inventoryMovements).values({ productId: line.productId, variantId: line.variantId, delta: -line.quantity, reason: "order_reserved", orderId: created.id, actorId: user?.id ?? null });
      await tx.insert(payments).values({ orderId: created.id, provider: "mock_dev", status: "pending", amountMinor: total, currency });
      await tx.insert(orderStatusHistory).values({ orderId: created.id, fromStatus: null, toStatus: "pending_payment", note: "Test payment is pending; no funds were captured." });
      await tx.insert(auditLogs).values({ actorId: user?.id ?? null, action: "order.created", entityType: "order", entityId: created.id, details: { status: "pending_payment", paymentProvider: "mock_dev" }, ipHash: null });
      return created;
    });
    const response = NextResponse.json({ publicId: order.publicId, paymentStatus: "pending" }, { status: 201, headers: { "cache-control": "no-store" } });
    response.cookies.set("sensi_order_lookup", await createOrderLookupToken(order.publicId), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: `/${data.locale}/order/${order.publicId}`, maxAge: 15 * 60,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, [number, string]> = {
      ITEM_UNAVAILABLE: [409, "A product is no longer available."], TRANSLATION_UNAVAILABLE: [409, "A product translation is not available in this language."],
      VARIANT_REQUIRED: [400, "Choose product options before checkout."], VARIANT_UNAVAILABLE: [409, "One product option is no longer available."],
      OUT_OF_STOCK: [409, "One or more items are out of stock."], QUOTE_REQUIRED: [409, "One or more items need a price quote."],
      INVALID_PRICE: [409, "A product price is invalid."], MIXED_CURRENCY: [409, "All products in one order must use the same currency."],
      SHIPPING_UNAVAILABLE: [409, "Shipping is not configured yet."], SHIPPING_CURRENCY: [409, "Shipping currency does not match product currency."],
      COUPON_INVALID: [400, "This coupon is not valid for the current order."], COUPON_CURRENCY: [400, "Coupon currency does not match the order."],
    };
    const [status, message] = errors[code] ?? [500, "Could not create the order."];
    return jsonError(message, status);
  }
}
