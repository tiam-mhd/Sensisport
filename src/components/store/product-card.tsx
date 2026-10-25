"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { useStore } from "./store-provider";

type Product = {
  id: string; slug: string; title: string; titleFa: string; titleEn: string; description: string | null; featured: boolean;
  hasVariants?: boolean;
  priceStatus: "unverified" | "confirmed" | "quote"; priceMinor: number | null; currency: string | null;
  images: { url: string; alt: string | null }[];
};

export function ProductCard({ product, locale, labels }: { product: Product; locale: Locale; labels: { quote: string; unavailable: string; add: string; saved: string; chooseOptions: string } }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const image = product.images[0];
  const price = formatMoney(product.priceMinor, product.currency, locale === "fa" ? "fa-IR" : "en-US");
  const canBuy = product.priceStatus === "confirmed" && price !== null;
  return <article className="product-card">
    <div className="product-card-media">
      <Link href={`/${locale}/product/${product.slug}`} className="product-image-link" aria-label={product.title}>
        {image ? <Image src={image.url} alt={image.alt ?? product.title} fill sizes="(max-width: 650px) 90vw, (max-width: 1000px) 45vw, 25vw" /> : <span className="product-image-empty" aria-hidden="true" />}
      </Link>
      <button className={`wishlist-toggle${wishlist.includes(product.id) ? " is-active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label={`${labels.saved}: ${product.title}`} aria-pressed={wishlist.includes(product.id)}><Heart size={17} fill={wishlist.includes(product.id) ? "currentColor" : "none"} /></button>
      {product.featured && <span className="product-tag">{locale === "fa" ? "محصول منتخب" : "Featured"}</span>}
    </div>
    <div className="product-card-copy">
      <Link href={`/${locale}/product/${product.slug}`} className="product-title">{product.title}</Link>
      <p className="product-price">{price ?? labels.quote}</p>
      {canBuy && !product.hasVariants && <button className="product-add" type="button" onClick={() => addToCart({ productId: product.id, variantId: null, variantOptions: null, slug: product.slug, titleFa: product.titleFa, titleEn: product.titleEn, image: image?.url ?? null, priceMinor: product.priceMinor, currency: product.currency })} aria-label={`${labels.add}: ${product.title}`}><Plus size={18} /><span>{labels.add}</span></button>}
      {canBuy && product.hasVariants && <Link className="product-add" href={`/${locale}/product/${product.slug}`}><Plus size={18} /><span>{labels.chooseOptions}</span></Link>}
      {product.priceStatus === "quote" && <Link className="product-add" href={`/${locale}/product/${product.slug}`}><Plus size={18} /><span>{labels.quote}</span></Link>}
    </div>
  </article>;
}
