import { eq } from "drizzle-orm";
import Image from "next/image";
import { RevealSection } from "@/components/store/reveal-section";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { instagramAudit } from "@/lib/instagram/source-data";

export const dynamic = "force-dynamic";
const serviceKeys = new Set(["shipping", "warranty", "faq"]);

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !serviceKeys.has(slug)) notFound();
  const [setting] = process.env.DATABASE_URL ? await getDb().select().from(siteSettings).where(eq(siteSettings.key, `service.${slug}`)).limit(1) : [];
  const content = setting?.value && typeof setting.value === "object" ? (setting.value as Record<string, unknown>)[locale] : null;
  const title = slug === "shipping" ? (locale === "fa" ? "ارسال" : "Shipping") : slug === "warranty" ? (locale === "fa" ? "ضمانت" : "Warranty") : (locale === "fa" ? "پرسش‌های متداول" : "Frequently asked questions");
  const highlightIds = slug === "shipping" ? ["h07", "h08", "h09"] : slug === "warranty" ? ["h02"] : ["h01", "h06"];
  const highlights = instagramAudit.highlights.filter((item) => highlightIds.includes(item.id));
  const pending = locale === "fa"
    ? "عنوان این موضوع در هایلایت عمومی دیده می‌شود، اما فریم‌های استوری در بستهٔ قابل دسترس نبودند؛ شرایط ارسال، ضمانت یا پاسخ‌ها را حدس نمی‌زنیم. برای جزئیات به منبع اصلی مراجعه کنید."
    : "A public highlight title exists for this topic, but its story frames were not available in the captured source. Shipping terms, warranty promises, and answers are not inferred; visit the source for details.";
  return <article className="page-shell container editorial-page service-page"><RevealSection className="service-intro"><span className="eyebrow">SENSI SPORT / 07</span><h1>{title}</h1><p className="editorial-lead">{typeof content === "string" && content.trim() ? content : pending}</p></RevealSection>
    <RevealSection className="service-source-grid">{highlights.map((item) => <a className="service-source-card" key={item.id} href={item.url} target="_blank" rel="noreferrer"><Image src={item.site_cover_path} alt={item.title_fa} width={84} height={84} /><span><strong>{locale === "fa" ? item.title_fa : highlightTitleEn(item.id)}</strong><small>{locale === "fa" ? "مشاهدهٔ هایلایت اصلی در اینستاگرام" : "Open the original Instagram highlight"}</small></span></a>)}</RevealSection>
  </article>;
}

function highlightTitleEn(id: string) {
  const labels: Record<string, string> = { h01: "Why Sensi Sport", h02: "Guarantee", h06: "How to order", h07: "Shipping method", h08: "Shipping time", h09: "Shipping cost" };
  return labels[id] ?? "Instagram highlight";
}
