"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { useStore } from "./store-provider";

type Variant = { id: string; options: Record<string, string>; priceMinor: number | null; currency: string | null; stock: number };

export function AddProductAction({ locale, product, labels }: { locale: Locale; product: { id: string; slug: string; titleFa: string; titleEn: string; priceMinor: number | null; currency: string | null; image: string | null; trackInventory: boolean; variants: Variant[] }; labels: { add: string; saved: string; choose: string } }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const [added, setAdded] = useState(false);
  const [variantId, setVariantId] = useState("");
  const selected = product.variants.find((variant) => variant.id === variantId);
  const priceMinor = selected?.priceMinor ?? product.priceMinor;
  const currency = selected?.currency ?? product.currency;
  const variantOptions = selected?.options ?? null;
  return <div className="product-actions-wrap">
    {product.variants.length > 0 && <label className="variant-picker">{labels.choose}<select value={variantId} onChange={(event) => { setVariantId(event.target.value); setAdded(false); }}><option value="">{labels.choose}</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(" · ")}</option>)}</select></label>}
    <div className="product-actions"><button className="button button-primary" type="button" disabled={(product.variants.length > 0 && !selected) || (product.trackInventory && selected !== undefined && selected.stock < 1)} onClick={() => { if (product.variants.length > 0 && !selected) return; addToCart({ productId: product.id, variantId: selected?.id ?? null, variantOptions, slug: product.slug, titleFa: product.titleFa, titleEn: product.titleEn, priceMinor, currency, image: product.image }); setAdded(true); }}><ShoppingBag size={18} />{added ? (locale === "fa" ? "به سبد اضافه شد" : "Added to cart") : labels.add}</button><button className={`button button-outline${wishlist.includes(product.id) ? " is-active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={wishlist.includes(product.id)}><Heart size={17} fill={wishlist.includes(product.id) ? "currentColor" : "none"} />{labels.saved}</button></div>
  </div>;
}
