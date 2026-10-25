import { ProductCard } from "@/components/store/product-card";
import { isLocale } from "@/i18n/config";
import { getPublishedProducts } from "@/lib/catalog/queries";
import { getMessages } from "@/lib/messages";
import { WishlistGrid } from "@/components/store/wishlist-grid";

export const dynamic = "force-dynamic";

export default async function WishlistPage({ params }: PageProps<"/[locale]/wishlist">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const products = await getPublishedProducts(locale, { limit: 100 });
  return <div className="page-shell container"><div className="page-intro"><span className="eyebrow">SENSI SPORT / 05</span><h1>{copy.nav.wishlist}</h1></div><WishlistGrid products={products} locale={locale} labels={{ empty: copy.common.empty, quote: copy.common.quote, unavailable: copy.common.priceUnavailable, add: copy.product.add, saved: copy.nav.wishlist, chooseOptions: copy.product.options }} /></div>;
}
