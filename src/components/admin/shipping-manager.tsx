"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type ShippingMethod = { id: string; code: string; nameFa: string | null; nameEn: string | null; costMinor: number | null; currency: string | null; enabled: boolean };

export function ShippingManager({ initial, locale }: { initial: ShippingMethod[]; locale: "fa" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = event.currentTarget;
    const fd = new FormData(form);
    try {
      const response = await fetch("/api/admin/shipping", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: fd.get("code"), nameFa: fd.get("nameFa"), nameEn: fd.get("nameEn"), costMinor: Number(fd.get("costMinor")), currency: String(fd.get("currency") ?? "").toUpperCase(), detailsFa: fd.get("detailsFa"), detailsEn: fd.get("detailsEn") }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save shipping method."); return; }
      form.reset(); router.refresh();
    } catch { setError(isFa ? "ثبت روش ارسال انجام نشد." : "Could not save shipping method."); }
    finally { setBusy(false); }
  }
  async function toggle(method: ShippingMethod) {
    const response = await fetch(`/api/admin/shipping/${method.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !method.enabled }) });
    if (!response.ok) setError(isFa ? "وضعیت روش ارسال تغییر نکرد." : "Could not update shipping method."); else router.refresh();
  }
  return <div className="manager-grid"><form className="admin-form" onSubmit={create}><h2>{isFa ? "روش ارسال جدید" : "New shipping method"}</h2><p className="admin-note">{isFa ? "فقط اطلاعات تأییدشدهٔ فروشگاه را ثبت کنید. هزینه به کوچک‌ترین واحد پول نوشته می‌شود." : "Enter only verified store information. Cost uses the currency's minor unit."}</p><div className="form-grid"><label>Code<input name="code" required pattern="[a-z0-9_-]+" dir="ltr" /></label><label>{isFa ? "نام فارسی" : "Persian name"}<input name="nameFa" required /></label><label>{isFa ? "نام انگلیسی" : "English name"}<input name="nameEn" required dir="ltr" /></label><label>{isFa ? "هزینه" : "Cost"}<input name="costMinor" type="number" min="0" step="1" required /></label><label>{isFa ? "کد واحد پول" : "Currency code"}<input name="currency" pattern="[A-Z]{3}" maxLength={3} required dir="ltr" /></label><label className="form-wide">{isFa ? "توضیحات فارسی" : "Persian details"}<textarea name="detailsFa" maxLength={2000} /></label><label className="form-wide">{isFa ? "توضیحات انگلیسی" : "English details"}<textarea name="detailsEn" maxLength={2000} dir="ltr" /></label></div>{error && <p className="form-error">{error}</p>}<button className="button button-primary" disabled={busy}>{isFa ? "ذخیره" : "Save"}</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Code</th><th>{isFa ? "نام" : "Name"}</th><th>{isFa ? "هزینه" : "Cost"}</th><th>{isFa ? "وضعیت" : "Status"}</th><th /></tr></thead><tbody>{initial.map((method) => <tr key={method.id}><td>{method.code}</td><td>{locale === "fa" ? method.nameFa : method.nameEn}</td><td>{method.costMinor} {method.currency}</td><td>{method.enabled ? (isFa ? "فعال" : "Active") : (isFa ? "غیرفعال" : "Disabled")}</td><td><button className="button button-outline" type="button" onClick={() => toggle(method)}>{method.enabled ? (isFa ? "غیرفعال‌کردن" : "Disable") : (isFa ? "فعال‌کردن" : "Enable")}</button></td></tr>)}</tbody></table></div>
  </div>;
}
