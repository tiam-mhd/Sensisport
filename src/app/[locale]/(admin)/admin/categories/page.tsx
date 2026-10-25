import { asc, eq } from "drizzle-orm";
import { CategoryManager } from "@/components/admin/category-manager";
import { getDb } from "@/db";
import { categories, categoryTranslations } from "@/db/schema";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const rows = await getDb().select({ id: categories.id, slug: categories.slug, active: categories.active, locale: categoryTranslations.locale, name: categoryTranslations.name }).from(categories).leftJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id)).orderBy(asc(categories.sortOrder));
  const grouped = new Map<string, { id: string; slug: string; active: boolean; names: Record<string, string> }>();
  for (const row of rows) {
    const category = grouped.get(row.id) ?? { id: row.id, slug: row.slug, active: row.active, names: {} };
    if (row.locale && row.name) category.names[row.locale] = row.name;
    grouped.set(row.id, category);
  }
  return <><span className="eyebrow">SENSI SPORT / CATEGORIES</span><h1>{locale === "fa" ? "دسته‌بندی‌ها" : "Categories"}</h1><CategoryManager initial={[...grouped.values()]} locale={locale} /></>;
}
