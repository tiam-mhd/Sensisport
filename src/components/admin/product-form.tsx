"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";

type CategoryOption = { id: string; name: string };

export function ProductForm({ locale, categories }: { locale: Locale; categories: CategoryOption[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function submit(formData: FormData) {
    setBusy(true); setError(""); setMessage("");
    const body = Object.fromEntries(formData.entries());
    const requestedStatus = String(body.status ?? "draft");
    body.featured = formData.get("featured") === "on" ? "true" : "false";
    body.sourceApproved = formData.get("sourceApproved") === "on" ? "true" : "false";
    body.trackInventory = formData.get("trackInventory") === "on" ? "true" : "false";
    if (requestedStatus === "published") body.status = "draft";
    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; id?: string };
      if (!response.ok || !result.id) { setError(result.error ?? (isFa ? "ذخیره انجام نشد." : "Could not save the product.")); setBusy(false); return; }
      const images = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
      if (images.length) {
        for (const file of images) {
          const upload = new FormData(); upload.set("productId", result.id); upload.set("kind", "source"); upload.set("file", file); upload.set("approved", body.sourceApproved === "true" ? "true" : "false");
          const mediaResponse = await fetch("/api/admin/media", { method: "POST", body: upload });
          if (!mediaResponse.ok) throw new Error(isFa ? "محصول ذخیره شد اما بارگذاری عکس کامل نشد." : "Product saved, but an image failed to upload.");
        }
      }
      if (requestedStatus !== "draft") {
        const publishResponse = await fetch(`/api/admin/products/${encodeURIComponent(result.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: requestedStatus }) });
        if (!publishResponse.ok) {
          const publishResult = await publishResponse.json() as { error?: string };
          throw new Error(publishResult.error ?? (isFa ? "وضعیت محصول تغییر نکرد." : "Could not change product status."));
        }
      }
      window.location.assign(`/${locale}/admin/products`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (isFa ? "ذخیره انجام نشد." : "Could not save the product."));
      setBusy(false);
    }
  }
  return <form className="admin-form" action={submit}>
    <div className="form-grid">
      <label>{isFa ? "نام فارسی" : "Persian name"}<input name="nameFa" required maxLength={220} /></label>
      <label>{isFa ? "نام انگلیسی" : "English name"}<input name="nameEn" required maxLength={220} dir="ltr" /></label>
      <label>{isFa ? "شناسهٔ نشانی" : "URL slug"}<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} dir="ltr" /></label>
      <label>{isFa ? "دسته‌بندی" : "Category"}<select name="categoryId"><option value="">—</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label>{isFa ? "وضعیت قیمت" : "Price status"}<select name="priceStatus"><option value="unverified">{isFa ? "نامشخص" : "Unverified"}</option><option value="quote">{isFa ? "استعلام قیمت" : "Quote"}</option><option value="confirmed">{isFa ? "قیمت تأییدشده" : "Confirmed"}</option></select></label>
      <label>{isFa ? "مبلغ در کوچک‌ترین واحد" : "Amount in minor units"}<input name="priceMinor" type="number" inputMode="numeric" min="0" step="1" /></label>
      <label>{isFa ? "کد واحد پول (ISO 4217)" : "Currency code (ISO 4217)"}<input name="currency" pattern="[A-Z]{3}" maxLength={3} dir="ltr" placeholder="ISO 4217" /></label>
      <label>{isFa ? "موجودی پایه" : "Base stock"}<input name="stock" type="number" min="0" max="2147483647" step="1" defaultValue="0" /></label>
      <label>{isFa ? "وضعیت انتشار" : "Publication status"}<select name="status"><option value="draft">{isFa ? "پیش‌نویس" : "Draft"}</option><option value="published">{isFa ? "منتشرشده" : "Published"}</option><option value="archived">{isFa ? "بایگانی" : "Archived"}</option></select></label>
      <label className="form-wide">{isFa ? "توضیحات فارسی" : "Persian description"}<textarea name="descriptionFa" maxLength={6000} rows={4} /></label>
      <label className="form-wide">{isFa ? "توضیحات انگلیسی" : "English description"}<textarea name="descriptionEn" maxLength={6000} rows={4} dir="ltr" /></label>
      <label className="form-wide">{isFa ? "لینک پست یا Reel عمومی Instagram" : "Public Instagram post or Reel URL"}<input name="sourceUrl" type="url" maxLength={1000} dir="ltr" placeholder="https://www.instagram.com/p/.../" required /></label>
      <label className="form-wide">{isFa ? "منبع قابل مشاهدهٔ قیمت (caption یا توضیح دقیق)" : "Visible price evidence (caption or exact note)"}<input name="priceSource" maxLength={2000} /></label>
      <label className="form-wide">{isFa ? "تصاویر مرجع محصول (JPEG، PNG، WebP؛ حداکثر 8 مگابایت هرکدام)" : "Product source images (JPEG, PNG, WebP; max 8 MB each)"}<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
      <label className="form-wide">{isFa ? "تنوع‌ها به‌صورت JSON (هر مورد شامل options، stock و در صورت نیاز priceMinor/currency)" : "Variants as JSON (each item may include options, stock, and optional priceMinor/currency)"}<textarea name="variantsJson" maxLength={5000} rows={4} dir="ltr" placeholder='[{"options":{"size":"M"},"stock":4}]' /></label>
      <label className="checkbox-label"><input type="checkbox" name="featured" />{isFa ? "محصول منتخب" : "Featured product"}</label>
      <label className="checkbox-label"><input type="checkbox" name="trackInventory" />{isFa ? "پیگیری موجودی" : "Track inventory"}</label>
      <label className="checkbox-label"><input type="checkbox" name="sourceApproved" />{isFa ? "منبع عمومی، عکس و اطلاعات با حساب رسمی تطبیق داده شد" : "I reviewed this public source, image, and product information against the official account"}</label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? (isFa ? "در حال ذخیره…" : "Saving…") : (isFa ? "ذخیرهٔ محصول" : "Save product")}</button>
  </form>;
}
