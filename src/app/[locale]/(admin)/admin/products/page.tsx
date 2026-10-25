import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productTranslations, products } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ params }: PageProps<"/[locale]/admin/products">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const rows = await getDb().select({ id: products.id, slug: products.slug, status: products.status, priceStatus: products.priceStatus, updatedAt: products.updatedAt, name: productTranslations.name }).from(products).leftJoin(productTranslations, eq(productTranslations.productId, products.id)).where(eq(productTranslations.locale, locale)).orderBy(desc(products.updatedAt)).limit(250);
  return <><span className="eyebrow">SENSI SPORT / CATALOG</span><div className="admin-actions"><h1>{copy.admin.products}</h1><Link className="button button-primary" href={`/${locale}/admin/products/new`}>{copy.admin.newProduct}</Link></div>
    {rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{locale === "fa" ? "نام" : "Name"}</th><th>Slug</th><th>{copy.admin.status}</th><th>{copy.admin.priceStatus}</th><th>{locale === "fa" ? "ویرایش" : "Edit"}</th></tr></thead><tbody>{rows.map((product) => <tr key={product.id}><td>{product.name ?? product.slug}</td><td>{product.slug}</td><td>{product.status}</td><td>{product.priceStatus}</td><td><Link href={`/${locale}/admin/products/${product.id}`}>{locale === "fa" ? "بازکردن" : "Open"}</Link></td></tr>)}</tbody></table></div> : <div className="empty-panel"><h2>{copy.common.noProducts}</h2><p>{copy.common.sourcePending}</p><Link className="button button-outline" href={`/${locale}/admin/products/new`}>{copy.admin.newProduct}</Link></div>}
  </>;
}
