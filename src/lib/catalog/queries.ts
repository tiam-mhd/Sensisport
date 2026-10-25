import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, categoryTranslations, productMedia, productSources, productTranslations, products, productVariants, instagramSources } from "@/db/schema";
import type { Locale } from "@/i18n/config";

export async function getPublishedProducts(locale: Locale, options: { search?: string; category?: string; sort?: string; limit?: number } = {}) {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();
  const filters = [eq(products.status, "published" as const)];
  if (options.search?.trim()) {
    const query = `%${options.search.trim().replace(/[%_]/g, "\\$&")}%`;
    filters.push(or(ilike(productTranslations.name, query), ilike(productTranslations.description, query))!);
  }
  if (options.category) filters.push(eq(categories.slug, options.category));
  const ordering = options.sort === "name" ? asc(productTranslations.name) : desc(products.createdAt);
  const rows = await db.select({
    id: products.id, slug: products.slug, sku: products.sku, featured: products.featured,
    priceStatus: products.priceStatus, priceMinor: products.priceMinor, currency: products.currency,
    trackInventory: products.trackInventory, title: productTranslations.name,
    description: productTranslations.description, specifications: productTranslations.specifications,
    categorySlug: categories.slug, categoryName: categoryTranslations.name,
    mediaUrl: productMedia.publicUrl, mediaAlt: locale === "fa" ? productMedia.altFa : productMedia.altEn,
  }).from(products)
    .innerJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, locale)))
    .leftJoin(productMedia, and(eq(productMedia.productId, products.id), eq(productMedia.reviewStatus, "approved")))
    .where(and(...filters))
    .orderBy(ordering)
    .limit(Math.min(options.limit ?? 48, 100));

  const grouped = new Map<string, {
    id: string; slug: string; sku: string | null; featured: boolean; priceStatus: "unverified" | "confirmed" | "quote";
    priceMinor: number | null; currency: string | null; trackInventory: boolean; title: string; titleFa: string; titleEn: string; description: string | null;
    specifications: Record<string, string>; categorySlug: string | null; categoryName: string | null;
    images: { url: string; alt: string | null }[];
  }>();
  for (const row of rows) {
    const existing = grouped.get(row.id);
    if (existing) {
      if (row.mediaUrl && !existing.images.some((image) => image.url === row.mediaUrl)) existing.images.push({ url: row.mediaUrl, alt: row.mediaAlt });
      continue;
    }
    grouped.set(row.id, {
      id: row.id, slug: row.slug, sku: row.sku, featured: row.featured,
      priceStatus: row.priceStatus, priceMinor: row.priceMinor, currency: row.currency,
      trackInventory: row.trackInventory, title: row.title, titleFa: locale === "fa" ? row.title : "", titleEn: locale === "en" ? row.title : "", description: row.description,
      specifications: row.specifications ?? {}, categorySlug: row.categorySlug, categoryName: row.categoryName,
      images: row.mediaUrl ? [{ url: row.mediaUrl, alt: row.mediaAlt }] : [],
    });
  }
  const ids = [...grouped.keys()];
  const variantRows = ids.length ? await db.select({ productId: productVariants.productId }).from(productVariants).where(and(inArray(productVariants.productId, ids), eq(productVariants.active, true))) : [];
  const translationRows = ids.length ? await db.select({ productId: productTranslations.productId, locale: productTranslations.locale, name: productTranslations.name }).from(productTranslations).where(inArray(productTranslations.productId, ids)) : [];
  for (const translation of translationRows) {
    const product = grouped.get(translation.productId);
    if (!product) continue;
    if (translation.locale === "fa") product.titleFa = translation.name;
    if (translation.locale === "en") product.titleEn = translation.name;
  }
  const variantIds = new Set(variantRows.map((row) => row.productId));
  return [...grouped.values()].map((product) => ({ ...product, titleFa: product.titleFa || product.title, titleEn: product.titleEn || product.title, hasVariants: variantIds.has(product.id) }));
}

export async function getFeaturedProducts(locale: Locale, limit = 4) {
  const all = await getPublishedProducts(locale, { limit: 100 });
  return all.filter((product) => product.featured).slice(0, limit);
}

export async function getProductBySlug(locale: Locale, slug: string) {
  const products = await getPublishedProducts(locale, { limit: 100 });
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getProductDetail(locale: Locale, slug: string) {
  if (!process.env.DATABASE_URL) return null;
  const db = getDb();
  const [row] = await db.select({
    id: products.id, slug: products.slug, sku: products.sku, featured: products.featured,
    priceStatus: products.priceStatus, priceMinor: products.priceMinor, currency: products.currency,
    trackInventory: products.trackInventory, stock: products.stock,
    title: productTranslations.name, description: productTranslations.description, specifications: productTranslations.specifications,
    categoryName: categoryTranslations.name,
  }).from(products)
    .innerJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)))
    .leftJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, products.categoryId), eq(categoryTranslations.locale, locale)))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);
  if (!row) return null;
  const media = await db.select({ id: productMedia.id, url: productMedia.publicUrl, alt: locale === "fa" ? productMedia.altFa : productMedia.altEn, kind: productMedia.kind })
    .from(productMedia).where(and(eq(productMedia.productId, row.id), eq(productMedia.reviewStatus, "approved"))).orderBy(productMedia.sortOrder);
  const sources = await db.select({ sourceUrl: instagramSources.sourceUrl, shortcode: instagramSources.shortcode, postDate: instagramSources.postDate, captionExcerpt: instagramSources.captionExcerpt, priceSource: instagramSources.priceSource, confidence: instagramSources.confidence })
    .from(productSources).innerJoin(instagramSources, eq(instagramSources.id, productSources.sourceId)).where(eq(productSources.productId, row.id));
  const variants = await db.select({ id: productVariants.id, options: productVariants.options, priceMinor: productVariants.priceMinor, currency: productVariants.currency, stock: productVariants.stock })
    .from(productVariants).where(and(eq(productVariants.productId, row.id), eq(productVariants.active, true)));
  const translations = await db.select({ locale: productTranslations.locale, name: productTranslations.name }).from(productTranslations).where(eq(productTranslations.productId, row.id));
  return { ...row, titleFa: translations.find((translation) => translation.locale === "fa")?.name ?? row.title, titleEn: translations.find((translation) => translation.locale === "en")?.name ?? row.title, images: media, sources, variants };
}

export async function getAdminProductRows(locale: Locale) {
  if (!process.env.DATABASE_URL) return [];
  return getDb().select({ id: products.id, slug: products.slug, status: products.status, priceStatus: products.priceStatus, updatedAt: products.updatedAt, name: productTranslations.name })
    .from(products).leftJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)))
    .orderBy(desc(products.updatedAt)).limit(200);
}

export async function getActiveCategories(locale: Locale) {
  if (!process.env.DATABASE_URL) return [];
  return getDb().select({ slug: categories.slug, name: categoryTranslations.name })
    .from(categories).innerJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, locale)))
    .where(eq(categories.active, true)).orderBy(asc(categories.sortOrder));
}

export async function getCatalogCount() {
  if (!process.env.DATABASE_URL) return 0;
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, "published"));
  return row?.count ?? 0;
}
