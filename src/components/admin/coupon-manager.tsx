"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Coupon = { id: string; code: string; active: boolean; discountPercent: number | null; discountMinor: number | null; currency: string | null; usedCount: number };

export function CouponManager({ initial, locale }: { initial: Coupon[]; locale: "fa" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const percent = String(formData.get("discountPercent") ?? "");
    const fixed = String(formData.get("discountMinor") ?? "");
    const payload = { code: formData.get("code"), discountPercent: percent ? Number(percent) : null, discountMinor: fixed ? Number(fixed) : null, currency: fixed ? String(formData.get("currency") ?? "").toUpperCase() : null, minimumSubtotalMinor: formData.get("minimumSubtotalMinor") ? Number(formData.get("minimumSubtotalMinor")) : null, maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : null };
    try {
      const response = await fetch("/api/admin/coupons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save coupon."); return; }
      form.reset(); router.refresh();
    } catch { setError(isFa ? "ثبت کد تخفیف انجام نشد." : "Could not save coupon."); }
    finally { setBusy(false); }
  }
  async function toggle(coupon: Coupon) {
    const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !coupon.active }) });
    if (!response.ok) setError(isFa ? "وضعیت کد تغییر نکرد." : "Could not update coupon."); else router.refresh();
  }
  return <div className="manager-grid"><form className="admin-form" onSubmit={create}><h2>{isFa ? "کد تخفیف جدید" : "New coupon"}</h2><div className="form-grid"><label>{isFa ? "کد" : "Code"}<input name="code" required maxLength={60} dir="ltr" /></label><label>{isFa ? "درصد (یکی از دو حالت)" : "Percent (choose one discount type)"}<input name="discountPercent" type="number" min="1" max="100" step="1" /></label><label>{isFa ? "مبلغ ثابت در کوچک‌ترین واحد" : "Fixed amount in minor units"}<input name="discountMinor" type="number" min="0" step="1" /></label><label>{isFa ? "کد واحد پول" : "Currency code"}<input name="currency" pattern="[A-Z]{3}" maxLength={3} dir="ltr" /></label><label>{isFa ? "حداقل خرید در کوچک‌ترین واحد" : "Minimum subtotal in minor units"}<input name="minimumSubtotalMinor" type="number" min="0" step="1" /></label><label>{isFa ? "حداکثر تعداد استفاده" : "Maximum uses"}<input name="maxUses" type="number" min="1" step="1" /></label></div>{error && <p className="form-error">{error}</p>}<button className="button button-primary" disabled={busy}>{isFa ? "ساخت کد" : "Create coupon"}</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{isFa ? "کد" : "Code"}</th><th>{isFa ? "تخفیف" : "Discount"}</th><th>{isFa ? "استفاده" : "Uses"}</th><th>{isFa ? "وضعیت" : "Status"}</th><th /></tr></thead><tbody>{initial.map((coupon) => <tr key={coupon.id}><td>{coupon.code}</td><td>{coupon.discountPercent ? `${coupon.discountPercent}%` : `${coupon.discountMinor ?? 0} ${coupon.currency ?? ""}`}</td><td>{coupon.usedCount}</td><td>{coupon.active ? (isFa ? "فعال" : "Active") : (isFa ? "غیرفعال" : "Disabled")}</td><td><button className="button button-outline" type="button" onClick={() => toggle(coupon)}>{coupon.active ? (isFa ? "غیرفعال‌کردن" : "Disable") : (isFa ? "فعال‌کردن" : "Enable")}</button></td></tr>)}</tbody></table></div>
  </div>;
}
