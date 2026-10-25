"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Category = { id: string; slug: string; active: boolean; names: Record<string, string> };

export function CategoryManager({ initial, locale }: { initial: Category[]; locale: "fa" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error ?? "Could not save category."); return; }
      form.reset(); router.refresh();
    } catch { setError(isFa ? "ثبت دسته انجام نشد." : "Could not save category."); }
    finally { setBusy(false); }
  }
  async function toggle(id: string, active: boolean) {
    const response = await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !active }) });
    if (!response.ok) setError(isFa ? "وضعیت دسته تغییر نکرد." : "Could not update the category."); else router.refresh();
  }
  return <div className="manager-grid"><form className="admin-form" onSubmit={create}><h2>{isFa ? "دستهٔ جدید" : "New category"}<span className="eyebrow"> · {isFa ? "نام‌ها باید از منبع رسمی تأیید شوند" : "Use names verified from official sources"}</span></h2><div className="form-grid"><label>{isFa ? "شناسه" : "Slug"}<input name="slug" dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>{isFa ? "نام فارسی" : "Persian name"}<input name="nameFa" required /></label><label>{isFa ? "نام انگلیسی" : "English name"}<input name="nameEn" required dir="ltr" /></label></div>{error && <p className="form-error">{error}</p>}<button className="button button-primary" disabled={busy}>{isFa ? "ذخیره" : "Save"}</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{isFa ? "دسته" : "Category"}</th><th>Slug</th><th>{isFa ? "وضعیت" : "Status"}</th><th /></tr></thead><tbody>{initial.map((category) => <tr key={category.id}><td>{category.names[locale] ?? category.names.fa ?? category.slug}</td><td>{category.slug}</td><td>{category.active ? (isFa ? "فعال" : "Active") : (isFa ? "غیرفعال" : "Inactive")}</td><td><button className="button button-outline" type="button" onClick={() => toggle(category.id, category.active)}>{category.active ? (isFa ? "غیرفعال‌کردن" : "Disable") : (isFa ? "فعال‌کردن" : "Enable")}</button></td></tr>)}</tbody></table></div>
  </div>;
}
