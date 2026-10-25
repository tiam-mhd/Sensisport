"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { useStore } from "./store-provider";

export function CartView({ locale, labels }: { locale: Locale; labels: Record<string, string> }) {
  const { cart, hydrated, setQuantity, removeFromCart } = useStore();
  const isFa = locale === "fa";
  const subtotal = cart.every((item) => item.priceMinor !== null && item.currency) ? cart.reduce((sum, item) => sum + (item.priceMinor ?? 0) * item.quantity, 0) : null;
  const currency = cart.length && cart.every((item) => item.currency === cart[0]?.currency) ? cart[0]?.currency ?? null : null;
  const total = formatMoney(subtotal, currency, isFa ? "fa-IR" : "en-US");
  if (!hydrated) return <div className="empty-panel" aria-live="polite">{labels.loading}</div>;
  if (!cart.length) return <section className="empty-panel"><span className="empty-mark" aria-hidden="true" /><h2>{labels.emptyTitle}</h2><p>{labels.emptyText}</p><Link className="button button-primary" href={`/${locale}/shop`}>{labels.continue}</Link></section>;
  return <div className="cart-layout">
    <div className="cart-lines">{cart.map((item) => <article className="cart-line" key={`${item.productId}:${item.variantId ?? "base"}`}>
      <Link className="cart-thumb" href={`/${locale}/product/${item.slug}`}>{item.image ? <Image src={item.image} alt="" fill sizes="120px" /> : <span aria-hidden="true" />}</Link>
      <div className="cart-line-copy"><Link href={`/${locale}/product/${item.slug}`} className="product-title">{isFa ? item.titleFa || item.titleEn : item.titleEn || item.titleFa}</Link><p>{formatMoney(item.priceMinor, item.currency, isFa ? "fa-IR" : "en-US") ?? labels.quote}</p>{item.variantOptions && <p>{Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>}
        <div className="quantity-control" aria-label={labels.quantity}><button type="button" onClick={() => setQuantity(item.productId, item.variantId, item.quantity - 1)} aria-label={labels.decrease}><Minus size={14} /></button><output>{item.quantity}</output><button type="button" onClick={() => setQuantity(item.productId, item.variantId, item.quantity + 1)} aria-label={labels.increase}><Plus size={14} /></button></div>
      </div>
      <button className="icon-button remove-line" type="button" onClick={() => removeFromCart(item.productId, item.variantId)} aria-label={`${labels.remove}: ${isFa ? item.titleFa : item.titleEn}`}><Trash2 size={17} /></button>
    </article>)}</div>
    <aside className="summary-panel"><h2>{labels.summary}</h2><div className="summary-row"><span>{labels.subtotal}</span><span>{total ?? labels.quote}</span></div><div className="summary-row"><span>{labels.shipping}</span><span>—</span></div><div className="summary-total"><span>{labels.total}</span><strong>{total ?? labels.quote}</strong></div><p className="muted-text">{labels.shippingPending}</p><Link className="button button-primary button-block" href={`/${locale}/checkout`}>{labels.checkout}</Link></aside>
  </div>;
}
