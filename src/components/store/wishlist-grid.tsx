"use client";

import type { Locale } from "@/i18n/config";
import type { getPublishedProducts } from "@/lib/catalog/queries";
import { ProductCard } from "./product-card";
import { useStore } from "./store-provider";

type Products = Awaited<ReturnType<typeof getPublishedProducts>>;
export function WishlistGrid({ products, locale, labels }: { products: Products; locale: Locale; labels: { empty: string; quote: string; unavailable: string; add: string; saved: string; chooseOptions: string } }) {
  const { wishlist } = useStore();
  const selected = products.filter((product) => wishlist.includes(product.id));
  return selected.length ? <div className="product-grid">{selected.map((product) => <ProductCard key={product.id} product={product} locale={locale} labels={labels} />)}</div> : <div className="empty-panel"><h2>{labels.empty}</h2></div>;
}
