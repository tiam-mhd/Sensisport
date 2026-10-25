import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, categories, instagramSources, productSources, productTranslations, productVariants, products } from "@/db/schema";
import { requireAdminUser } from "@/lib/auth/authorize";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { isCurrencyCode, isSafeMinorAmount } from "@/lib/money";

const inputSchema = z.object({
  nameFa: z.string().trim().min(1).max(220),
  nameEn: z.string().trim().min(1).max(220),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  descriptionFa: z.string().max(6000).optional().default(""),
  descriptionEn: z.string().max(6000).optional().default(""),
  sourceUrl: z.string().trim().url().max(1000),
  priceSource: z.string().trim().max(2000).optional().default(""),
  priceStatus: z.enum(["unverified", "confirmed", "quote"]),
  priceMinor: z.union([z.string().regex(/^\d+$/), z.literal("")]).optional(),
  currency: z.string().trim().max(12).optional().default(""),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  stock: z.union([z.string().regex(/^\d+$/), z.literal("")]).optional().default("0"),
  trackInventory: z.union([z.boolean(), z.enum(["true", "false"])]).optional().default(false),
  variantsJson: z.string().max(5000).optional().default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.union([z.boolean(), z.enum(["true", "false"])]).optional().default(false),
  sourceApproved: z.union([z.boolean(), z.enum(["true", "false"])]).optional().default(false),
});

function truthy(value: boolean | string | undefined) { return value === true || value === "true"; }
function shortcodeFrom(url: string) { return url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null; }
const variantSchema = z.array(z.object({
  options: z.record(z.string().min(1).max(80), z.string().min(1).max(120)),
  stock: z.number().int().min(0).max(2_147_483_647).default(0),
  priceMinor: z.number().int().safe().nonnegative().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
})).max(50);

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const db = getDb();
  const rows = await db.select({ id: products.id, slug: products.slug, status: products.status, priceStatus: products.priceStatus, updatedAt: products.updatedAt, nameFa: productTranslations.name })
    .from(products).leftJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "fa"))).orderBy(desc(products.updatedAt)).limit(200);
  return Response.json({ products: rows }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Invalid origin.", 403);
  const admin = await requireAdminUser();
  if (!admin) return jsonError("Authentication required.", 401);
  const input = await readJson(request, 20_000);
  if (!input.ok) return jsonError("Invalid request.", input.status);
  const parsed = inputSchema.safeParse(input.value);
  if (!parsed.success) return jsonError("Review the product fields and try again.", 400);
  const data = parsed.data;
  const sourceUrl = data.sourceUrl;
  if (new URL(sourceUrl).hostname.toLowerCase() !== "www.instagram.com" && new URL(sourceUrl).hostname.toLowerCase() !== "instagram.com") return jsonError("Source URL must point to instagram.com.", 400);
  const sourceShortcode = shortcodeFrom(sourceUrl);
  if (!sourceShortcode) return jsonError("Add a specific public Instagram post, reel, or video URL before saving the product.", 400);
  const amount = data.priceMinor ? Number(data.priceMinor) : null;
  const currency = data.currency.toUpperCase() || null;
  if (amount !== null && !isSafeMinorAmount(amount)) return jsonError("Price is outside the supported range.", 400);
  if (data.priceStatus === "confirmed" && (amount === null || !currency || !isCurrencyCode(currency) || data.priceSource.trim().length < 5 || !sourceUrl)) return jsonError("A confirmed price needs a valid amount, currency, public source, and price evidence.", 400);
  if (data.priceStatus === "quote" && amount !== null) return jsonError("Quote-only products must not store a price.", 400);
  const sourceApproved = truthy(data.sourceApproved);
  const stock = data.stock ? Number(data.stock) : 0;
  const trackInventory = truthy(data.trackInventory);
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2_147_483_647) return jsonError("Stock is outside the supported range.", 400);
  let variants: z.infer<typeof variantSchema> = [];
  if (data.variantsJson.trim()) {
    try {
      const result = variantSchema.safeParse(JSON.parse(data.variantsJson));
      if (!result.success) return jsonError("Review the variant JSON format.", 400);
      variants = result.data;
    } catch { return jsonError("Review the variant JSON format.", 400); }
  }
  if (variants.some((variant) => (variant.priceMinor === undefined) !== (variant.currency === undefined))) return jsonError("A variant price override needs both amount and currency.", 400);
  if (data.priceStatus === "quote" && variants.some((variant) => variant.priceMinor !== undefined)) return jsonError("Quote-only products cannot include variant prices.", 400);
  if (data.status === "published" && (!sourceApproved || !sourceUrl || data.priceStatus === "unverified")) return jsonError("Publishing requires a reviewed Instagram source and a confirmed or quote-only price.", 400);
  if (data.categoryId) {
    const [category] = await getDb().select({ id: categories.id }).from(categories).where(eq(categories.id, data.categoryId)).limit(1);
    if (!category) return jsonError("Selected category was not found.", 400);
  }
  try {
    const product = await getDb().transaction(async (tx) => {
      const [source] = await tx.insert(instagramSources).values({
        sourceUrl,
        shortcode: sourceShortcode,
        productName: data.nameFa,
        category: null,
        variants: variants.length ? Object.fromEntries(variants.map((variant, index) => [`variant_${index + 1}`, Object.values(variant.options)])) : null,
        priceSource: data.priceSource.trim() || null,
        priceStatus: data.priceStatus,
        confidence: sourceApproved ? "high" : "unverified",
        reviewStatus: sourceApproved ? "approved" : "pending",
      }).returning({ id: instagramSources.id });
      const [created] = await tx.insert(products).values({
        slug: data.slug,
        categoryId: data.categoryId || null,
        status: data.status === "published" ? "draft" : data.status,
        featured: truthy(data.featured),
        priceStatus: data.priceStatus,
        priceMinor: amount,
        currency,
        stock,
        trackInventory,
        sourceReviewStatus: sourceApproved ? "approved" : "pending",
        confidence: sourceApproved ? "high" : "unverified",
      }).returning({ id: products.id });
      await tx.insert(productSources).values({ productId: created.id, sourceId: source.id });
      await tx.insert(productTranslations).values([
        { productId: created.id, locale: "fa", name: data.nameFa, description: data.descriptionFa || null },
        { productId: created.id, locale: "en", name: data.nameEn, description: data.descriptionEn || null },
      ]);
      if (variants.length) await tx.insert(productVariants).values(variants.map((variant) => ({ productId: created.id, options: variant.options, stock: variant.stock, priceMinor: variant.priceMinor ?? null, currency: variant.currency ?? null })));
      await tx.insert(auditLogs).values({ actorId: admin.id, action: "product.created", entityType: "product", entityId: created.id, details: { slug: data.slug, status: data.status, sourceReviewed: sourceApproved }, ipHash: null });
      return created;
    });
    return Response.json({ id: product.id, status: data.status === "published" ? "draft" : data.status }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /unique/i.test(error.message)) return jsonError("A product already uses this slug.", 409);
    return jsonError("Could not save product.", 500);
  }
}
