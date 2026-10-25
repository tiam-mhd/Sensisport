"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Media = { id: string; publicUrl: string; kind: "source" | "site"; reviewStatus: "pending" | "approved" | "rejected"; altFa: string | null; altEn: string | null };
type Variant = { options: Record<string, string>; stock: number; priceMinor: number | null; currency: string | null };
type ProductData = { id: string; slug: string; status: "draft" | "published" | "archived"; featured: boolean; priceStatus: "unverified" | "confirmed" | "quote"; priceMinor: number | null; currency: string | null; stock: number; trackInventory: boolean; sourceReviewStatus: "pending" | "approved" | "rejected"; nameFa: string; nameEn: string; descriptionFa: string; descriptionEn: string; sourceUrl: string; media: Media[]; variants: Variant[] };

export function ProductEditForm({ product, locale }: { product: ProductData; locale: "fa" | "en" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFa = locale === "fa";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved(false); setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const desiredStatus = String(data.get("status"));
    const text = (key: string) => String(data.get(key) ?? "");
    let variants: Variant[];
    try { variants = text("variantsJson").trim() ? JSON.parse(text("variantsJson")) as Variant[] : []; }
    catch { setError(isFa ? "قالب JSON تنوع‌ها معتبر نیست." : "Variant JSON is invalid."); setBusy(false); return; }
    const payload = {
      slug: text("slug"), nameFa: text("nameFa"), nameEn: text("nameEn"), descriptionFa: text("descriptionFa"), descriptionEn: text("descriptionEn"),
      priceStatus: text("priceStatus"), priceMinor: text("priceMinor") ? Number(text("priceMinor")) : null, currency: text("currency").toUpperCase() || null,
      stock: Number(text("stock") || 0), trackInventory: data.get("trackInventory") === "on", featured: data.get("featured") === "on",
      sourceApproved: data.get("sourceApproved") === "on", variants,
      status: desiredStatus === "published" ? "draft" : desiredStatus,
    };
    const patch = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const patchResult = await patch.json() as { error?: string };
    if (!patch.ok) { setError(patchResult.error ?? "Could not save product."); setBusy(false); return; }
    const uploadFiles = async (field: string, kind: "source" | "site", approved: boolean) => {
      const files = data.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
      for (const file of files) {
        const uploadData = new FormData(); uploadData.set("productId", product.id); uploadData.set("kind", kind); uploadData.set("file", file); uploadData.set("approved", String(approved));
        const response = await fetch("/api/admin/media", { method: "POST", body: uploadData });
        if (!response.ok) { const body = await response.json() as { error?: string }; throw new Error(body.error ?? "Image upload failed."); }
      }
    };
    try {
      await uploadFiles("sourceImages", "source", payload.sourceApproved);
      await uploadFiles("siteImages", "site", data.get("siteApproved") === "on");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Image upload failed."); setBusy(false); router.refresh(); return; }
    if (desiredStatus !== "draft") {
      const statusResponse = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: desiredStatus }) });
      if (!statusResponse.ok) { const body = await statusResponse.json() as { error?: string }; setError(body.error ?? "Could not change product status."); setBusy(false); router.refresh(); return; }
    }
    setSaved(true); setBusy(false); router.refresh();
  }

  async function removeMedia(id: string) {
    const response = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json() as { error?: string }; setError(body.error ?? (isFa ? "حذف تصویر انجام نشد." : "Could not delete the image.")); } else router.refresh();
  }
  async function reviewMedia(id: string, reviewStatus: "approved" | "rejected") {
    const response = await fetch(`/api/admin/media/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewStatus }) });
    if (!response.ok) { const body = await response.json() as { error?: string }; setError(body.error ?? (isFa ? "بررسی تصویر انجام نشد." : "Could not update image review.")); } else router.refresh();
  }

  return <>
    <form className="admin-form" onSubmit={submit}>
      <div className="form-grid">
        <label>{isFa ? "نام فارسی" : "Persian name"}<input name="nameFa" defaultValue={product.nameFa} required maxLength={220} /></label>
        <label>{isFa ? "نام انگلیسی" : "English name"}<input name="nameEn" defaultValue={product.nameEn} required maxLength={220} dir="ltr" /></label>
        <label>{isFa ? "شناسهٔ نشانی" : "URL slug"}<input name="slug" defaultValue={product.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={180} dir="ltr" /></label>
        <label>{isFa ? "وضعیت قیمت" : "Price status"}<select name="priceStatus" defaultValue={product.priceStatus}><option value="unverified">{isFa ? "نامشخص" : "Unverified"}</option><option value="quote">{isFa ? "استعلام" : "Quote"}</option><option value="confirmed">{isFa ? "تأییدشده" : "Confirmed"}</option></select></label>
        <label>{isFa ? "مبلغ در کوچک‌ترین واحد" : "Amount in minor units"}<input name="priceMinor" type="number" defaultValue={product.priceMinor ?? ""} min="0" step="1" /></label>
        <label>{isFa ? "کد واحد پول" : "Currency code"}<input name="currency" defaultValue={product.currency ?? ""} pattern="[A-Z]{3}" maxLength={3} dir="ltr" /></label>
        <label>{isFa ? "موجودی پایه" : "Base stock"}<input name="stock" type="number" defaultValue={product.stock} min="0" step="1" /></label>
        <label>{isFa ? "وضعیت انتشار" : "Publication status"}<select name="status" defaultValue={product.status}><option value="draft">{isFa ? "پیش‌نویس" : "Draft"}</option><option value="published">{isFa ? "منتشرشده" : "Published"}</option><option value="archived">{isFa ? "بایگانی" : "Archived"}</option></select></label>
        <label className="form-wide">{isFa ? "توضیحات فارسی" : "Persian description"}<textarea name="descriptionFa" defaultValue={product.descriptionFa} rows={4} maxLength={6000} /></label>
        <label className="form-wide">{isFa ? "توضیحات انگلیسی" : "English description"}<textarea name="descriptionEn" defaultValue={product.descriptionEn} rows={4} maxLength={6000} dir="ltr" /></label>
        <label className="form-wide">{isFa ? "منبع عمومی Instagram" : "Public Instagram source"}<input value={product.sourceUrl} readOnly dir="ltr" /></label>
        <label className="form-wide">{isFa ? "تنوع‌ها به‌صورت JSON" : "Variants as JSON"}<textarea name="variantsJson" defaultValue={JSON.stringify(product.variants, null, 2)} rows={6} maxLength={5000} dir="ltr" /></label>
        <label className="form-wide">{isFa ? "بارگذاری تصویر مرجع" : "Upload source images"}<input name="sourceImages" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
        <label className="form-wide">{isFa ? "بارگذاری تصویر مخصوص فروشگاه" : "Upload site images"}<input name="siteImages" type="file" accept="image/jpeg,image/png,image/webp" multiple /></label>
        <label className="checkbox-label"><input type="checkbox" name="featured" defaultChecked={product.featured} />{isFa ? "محصول منتخب" : "Featured"}</label>
        <label className="checkbox-label"><input type="checkbox" name="trackInventory" defaultChecked={product.trackInventory} />{isFa ? "پیگیری موجودی" : "Track inventory"}</label>
        <label className="checkbox-label"><input type="checkbox" name="sourceApproved" defaultChecked={product.sourceReviewStatus === "approved"} />{isFa ? "منبع و تصویر مرجع را با حساب رسمی تطبیق دادم" : "I reviewed the source and reference image against the official account"}</label>
        <label className="checkbox-label"><input type="checkbox" name="siteApproved" />{isFa ? "تصاویر فروشگاه بررسی شده‌اند" : "I reviewed the site images"}</label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="form-success" role="status">{isFa ? "تغییرات ذخیره شد." : "Changes saved."}</p>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? (isFa ? "در حال ذخیره…" : "Saving…") : (isFa ? "ذخیرهٔ محصول" : "Save product")}</button>
    </form>
    <section className="settings-section"><h2>{isFa ? "رسانهٔ محصول" : "Product media"}</h2><div className="media-manager">{product.media.map((image) => <article className="media-item" key={image.id}><div className="media-thumb"><Image src={image.publicUrl} alt={image.altFa ?? ""} fill sizes="180px" /></div><div><strong>{image.kind === "source" ? (isFa ? "تصویر مرجع" : "Source image") : (isFa ? "تصویر فروشگاه" : "Site image")}</strong><p>{image.reviewStatus}</p><button className="button button-outline" type="button" onClick={() => reviewMedia(image.id, "approved")}>{isFa ? "تأیید" : "Approve"}</button><button className="button button-outline" type="button" onClick={() => reviewMedia(image.id, "rejected")}>{isFa ? "رد" : "Reject"}</button><button className="button button-outline" type="button" onClick={() => removeMedia(image.id)}>{isFa ? "حذف" : "Delete"}</button></div></article>)}</div></section>
  </>;
}
