import type { Metadata } from "next";
import { ProductCard } from "@/components/store/product-card";
import { SearchForm } from "@/components/store/search-form";
import { isLocale } from "@/i18n/config";
import { getActiveCategories, getPublishedProducts } from "@/lib/catalog/queries";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "فروشگاه" : "Shop", description: locale === "fa" ? "محصولات معرفی‌شده در پست‌های عمومی سنسی؛ استعلام قیمت و موجودی روز" : "Products featured in Sensi public posts; ask about current price and availability" };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(rawLocale)) return null;
  const locale = rawLocale;
  const copy = getMessages(locale);
  const search = typeof query.q === "string" ? query.q.slice(0, 120) : "";
  const category = typeof query.category === "string" ? query.category : "";
  const sort = typeof query.sort === "string" ? query.sort : "recent";
  const [products, categories] = await Promise.all([getPublishedProducts(locale, { search, category, sort }), getActiveCategories(locale)]);
  return <div className="page-shell container">
    <div className="page-intro"><span className="eyebrow">SENSI SPORT / 01</span><h1>{copy.shop.title}</h1><p>{copy.common.sourcePending}</p></div>
    <SearchForm locale={locale} placeholder={copy.shop.searchPlaceholder} query={search} />
    <form className="filter-row" action={`/${locale}/shop`}>
      <label>{copy.shop.filter}<select name="category" defaultValue={category}><option value="">{copy.shop.all}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <label>{copy.shop.sort}<select name="sort" defaultValue={sort}><option value="recent">{copy.shop.sortRecent}</option><option value="name">{copy.shop.sortName}</option></select></label>
      {search && <input type="hidden" name="q" value={search} />}
      <button className="button button-outline" type="submit">{locale === "fa" ? "اعمال" : "Apply"}</button>
    </form>
    {products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} labels={{ quote: copy.common.quote, unavailable: copy.common.priceUnavailable, add: copy.product.add, saved: copy.nav.wishlist, chooseOptions: copy.product.options }} />)}</div> : <div className="empty-panel"><span className="empty-mark" aria-hidden="true" /><h2>{search ? (locale === "fa" ? "نتیجه‌ای پیدا نشد" : "No results found") : copy.common.noProducts}</h2><p>{search ? (locale === "fa" ? "عبارت جست‌وجو را تغییر دهید یا دوباره تلاش کنید." : "Try changing your search and try again.") : copy.common.sourcePending}</p></div>}
  </div>;
}
