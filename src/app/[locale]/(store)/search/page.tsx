import { ProductCard } from "@/components/store/product-card";
import { SearchForm } from "@/components/store/search-form";
import { isLocale } from "@/i18n/config";
import { getPublishedProducts } from "@/lib/catalog/queries";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(rawLocale)) return null;
  const copy = getMessages(rawLocale);
  const term = typeof query.q === "string" ? query.q.trim().slice(0, 120) : "";
  const products = term ? await getPublishedProducts(rawLocale, { search: term }) : [];
  return <div className="page-shell container"><div className="page-intro"><span className="eyebrow">SENSI SPORT / 02</span><h1>{copy.nav.search}</h1></div><SearchForm locale={rawLocale} placeholder={copy.shop.searchPlaceholder} query={term} />{term && <p className="muted-text">{products.length} {copy.shop.results}</p>}{products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} locale={rawLocale} labels={{ quote: copy.common.quote, unavailable: copy.common.priceUnavailable, add: copy.product.add, saved: copy.nav.wishlist, chooseOptions: copy.product.options }} />)}</div> : <div className="empty-panel"><h2>{term ? (rawLocale === "fa" ? "نتیجه‌ای پیدا نشد" : "No results found") : copy.common.noProducts}</h2><p>{term ? (rawLocale === "fa" ? "نام محصول دیگری را امتحان کنید." : "Try another product name.") : copy.common.sourcePending}</p></div>}</div>;
}
