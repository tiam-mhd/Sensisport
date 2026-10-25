import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { getDb } from "@/db";
import { instagramSources, productMedia, productSources, productTranslations, productVariants, products } from "@/db/schema";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const db = getDb();
  const [product, translations, media, sources, variants] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)).limit(1),
    db.select().from(productTranslations).where(eq(productTranslations.productId, id)),
    db.select().from(productMedia).where(eq(productMedia.productId, id)),
    db.select({ sourceUrl: instagramSources.sourceUrl }).from(productSources).innerJoin(instagramSources, eq(instagramSources.id, productSources.sourceId)).where(eq(productSources.productId, id)),
    db.select({ options: productVariants.options, stock: productVariants.stock, priceMinor: productVariants.priceMinor, currency: productVariants.currency }).from(productVariants).where(eq(productVariants.productId, id)),
  ]);
  if (!product[0]) notFound();
  const fa = translations.find((translation) => translation.locale === "fa");
  const en = translations.find((translation) => translation.locale === "en");
  return <><span className="eyebrow">SENSI SPORT / CATALOG</span><h1>{locale === "fa" ? "ویرایش محصول" : "Edit product"}</h1><ProductEditForm locale={locale} product={{ ...product[0], nameFa: fa?.name ?? "", nameEn: en?.name ?? "", descriptionFa: fa?.description ?? "", descriptionEn: en?.description ?? "", sourceUrl: sources[0]?.sourceUrl ?? "", media, variants }} /></>;
}
