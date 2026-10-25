"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type TextSettings = { shippingFa: string; shippingEn: string; warrantyFa: string; warrantyEn: string; faqFa: string; faqEn: string; contactFa: string; contactEn: string };

export function SettingsForm({ initial, locale }: { initial: TextSettings; locale: "fa" | "en" }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved(false); setBusy(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json() as { error?: string };
    if (!response.ok) setError(result.error ?? "Could not save settings."); else setSaved(true);
    setBusy(false);
  }
  return <form className="settings-form" onSubmit={submit}><p className="admin-note">{isFa ? "فقط اطلاعاتی را منتشر کنید که مدیریت فروشگاه تأیید کرده است. خالی گذاشتن فیلد، همان متن را در صفحهٔ عمومی حذف می‌کند." : "Publish only information verified by store management. Empty fields remove that content from the public page."}</p>
    {([
      ["shippingFa", isFa ? "اطلاعات ارسال فارسی" : "Shipping information (Persian)"], ["shippingEn", isFa ? "اطلاعات ارسال انگلیسی" : "Shipping information (English)"],
      ["warrantyFa", isFa ? "اطلاعات ضمانت فارسی" : "Warranty information (Persian)"], ["warrantyEn", isFa ? "اطلاعات ضمانت انگلیسی" : "Warranty information (English)"],
      ["faqFa", isFa ? "پرسش‌های متداول فارسی" : "FAQ (Persian)"], ["faqEn", isFa ? "پرسش‌های متداول انگلیسی" : "FAQ (English)"],
      ["contactFa", isFa ? "راه ارتباطی فارسی" : "Contact details (Persian)"], ["contactEn", isFa ? "راه ارتباطی انگلیسی" : "Contact details (English)"],
    ] as const).map(([key, label]) => <label className="settings-field" key={key}>{label}<textarea name={key} defaultValue={initial[key]} maxLength={key.startsWith("contact") ? 2000 : 5000} rows={3} dir={key.endsWith("En") ? "ltr" : undefined} /></label>)}
    {error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="form-success" role="status">{isFa ? "تغییرات ذخیره شد." : "Changes saved."}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? (isFa ? "در حال ذخیره…" : "Saving…") : (isFa ? "ذخیرهٔ محتوا" : "Save content")}</button>
  </form>;
}
