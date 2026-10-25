"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { useStore } from "./store-provider";

type ShippingOption = { id: string; name: string; costMinor: number | null; currency: string | null };

export function CheckoutForm({ locale, labels, shippingMethods, paymentAvailable }: { locale: Locale; labels: Record<string, string>; shippingMethods: ShippingOption[]; paymentAvailable: boolean }) {
  const { cart, hydrated, clearCart } = useStore();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  const isQuoteRequest = cart.some((item) => item.priceMinor === null || !item.currency) || !paymentAvailable;

  async function submit(formData: FormData) {
    setError("");
    if (!cart.length) { setError(labels.emptyCart); return; }
    setBusy(true);
    const items = cart.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity }));
    const endpoint = isQuoteRequest ? "/api/quote" : "/api/checkout";
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, locale, items }) });
      const body = await response.json() as { error?: string; publicId?: string };
      if (!response.ok || !body.publicId) { setError(body.error ?? labels.error); setBusy(false); return; }
      clearCart();
      window.location.assign(`/${locale}/order/${encodeURIComponent(body.publicId)}`);
    } catch {
      setError(labels.error);
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="empty-panel">{labels.loading}</div>;
  if (!cart.length) return <div className="empty-panel">{labels.emptyCart}</div>;
  return <form className="checkout-form" action={submit}>
    <fieldset><legend>{labels.contact}</legend><div className="form-grid">
      <label>{labels.name}<input name="recipientName" required minLength={2} maxLength={200} autoComplete="name" /></label>
      <label>{labels.email}<input name="email" type="email" required maxLength={320} autoComplete="email" dir="ltr" /></label>
      <label>{labels.phone}<input name="phone" type="tel" required maxLength={40} autoComplete="tel" dir="ltr" /></label>
      <label>{labels.province}<input name="province" required maxLength={120} autoComplete="address-level1" /></label>
      <label>{labels.city}<input name="city" required maxLength={120} autoComplete="address-level2" /></label>
      <label>{labels.postalCode}<input name="postalCode" maxLength={30} autoComplete="postal-code" dir="ltr" /></label>
      <label className="form-wide">{labels.address}<textarea name="addressLine" required minLength={8} maxLength={1500} autoComplete="street-address" rows={3} /></label>
      {shippingMethods.length > 0 && <label className="form-wide">{labels.shippingMethod}<select name="shippingMethodId" required={!isQuoteRequest} defaultValue=""><option value="" disabled>{labels.shippingMethod}</option>{shippingMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>}
      <label>{labels.couponCode}<input name="couponCode" maxLength={60} autoCapitalize="characters" dir="ltr" /></label>
      <label className="form-wide">{labels.note}<textarea name="note" maxLength={1000} rows={3} /></label>
    </div></fieldset>
    <aside className="notice-box">{isQuoteRequest ? labels.quoteNotice : labels.processingNotice}{!shippingMethods.length ? ` ${labels.shippingUnavailable}` : ""}</aside>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy || (!isQuoteRequest && shippingMethods.length === 0)}>{busy ? labels.loading : isQuoteRequest ? labels.quoteSubmit : labels.submit}</button>
    <p className="muted-text">{isFa ? "قیمت و موجودی دوباره در سمت سرور بررسی می‌شوند." : "Price and stock are rechecked by the server before the order is recorded."}</p>
  </form>;
}
