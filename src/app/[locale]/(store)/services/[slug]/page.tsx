import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";
const serviceKeys = new Set(["shipping", "warranty", "faq"]);

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !serviceKeys.has(slug)) notFound();
  const copy = getMessages(locale);
  const [setting] = process.env.DATABASE_URL ? await getDb().select().from(siteSettings).where(eq(siteSettings.key, `service.${slug}`)).limit(1) : [];
  const content = setting?.value && typeof setting.value === "object" ? (setting.value as Record<string, unknown>)[locale] : null;
  const title = slug === "shipping" ? (locale === "fa" ? "ارسال" : "Shipping") : slug === "warranty" ? (locale === "fa" ? "ضمانت" : "Warranty") : (locale === "fa" ? "پرسش‌های متداول" : "Frequently asked questions");
  return <article className="page-shell container editorial-page"><span className="eyebrow">SENSI SPORT / 07</span><h1>{title}</h1><p className="editorial-lead">{typeof content === "string" && content.trim() ? content : copy.service.pending}</p></article>;
}
