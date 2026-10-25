import { asc, and, eq } from "drizzle-orm";
import { ProductForm } from "@/components/admin/product-form";
import { getDb } from "@/db";
import { categories, categoryTranslations } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ params }: PageProps<"/[locale]/admin/products/new">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const categoryRows = await getDb().select({ id: categories.id, name: categoryTranslations.name }).from(categories).innerJoin(categoryTranslations, and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, locale))).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder));
  return <><span className="eyebrow">SENSI SPORT / CATALOG</span><h1>{copy.admin.newProduct}</h1><p className="admin-note">{locale === "fa" ? "محصول بدون منبع عمومی، تصویر مرجع و بررسی دو زبان منتشر نمی‌شود. برای محصول بدون قیمت تأییدشده، وضعیت استعلام را انتخاب کنید." : "A product cannot be published without a public source, reviewed reference image, and both translations. Choose quote status when price is not verified."}</p><ProductForm locale={locale} categories={categoryRows} /></>;
}
