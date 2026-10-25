import Link from "next/link";
import { Instagram } from "lucide-react";
import { eq } from "drizzle-orm";
import { isLocale } from "@/i18n/config";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const [setting] = process.env.DATABASE_URL ? await getDb().select().from(siteSettings).where(eq(siteSettings.key, "contact")).limit(1) : [];
  const contact = setting?.value && typeof setting.value === "object" ? (setting.value as Record<string, unknown>)[locale] : null;
  return <article className="page-shell container editorial-page"><span className="eyebrow">SENSI SPORT / 08</span><h1>{copy.nav.contact}</h1><p className="editorial-lead">{typeof contact === "string" && contact.trim() ? contact : copy.service.pending}</p><Link className="social-cta" href="https://www.instagram.com/sensi_sport/" target="_blank" rel="noreferrer"><Instagram size={18} />Instagram Sensi Sport</Link></article>;
}
