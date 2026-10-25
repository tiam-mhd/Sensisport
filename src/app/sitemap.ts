import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const staticPaths = ["", "/shop", "/search", "/brand", "/contact", "/services/shipping", "/services/warranty", "/services/faq"];
  const entries: MetadataRoute.Sitemap = [];
  const published = process.env.DATABASE_URL
    ? await getDb().select({ slug: products.slug }).from(products).where(eq(products.status, "published"))
    : [];
  for (const locale of locales) {
    for (const path of staticPaths) entries.push({ url: `${base}/${locale}${path}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.55 });
    for (const product of published) entries.push({ url: `${base}/${locale}/product/${product.slug}`, changeFrequency: "weekly", priority: 0.7 });
  }
  return entries;
}
