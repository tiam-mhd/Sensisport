import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Instagram, Phone, Send } from "lucide-react";
import { eq } from "drizzle-orm";
import { RevealSection } from "@/components/store/reveal-section";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { instagramAudit } from "@/lib/instagram/source-data";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "تماس با سنسی" : "Contact Sensi Sport" };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const isFa = locale === "fa";
  const copy = getMessages(locale);
  const [setting] = process.env.DATABASE_URL ? await getDb().select().from(siteSettings).where(eq(siteSettings.key, "contact")).limit(1) : [];
  const configured = setting?.value && typeof setting.value === "object" ? (setting.value as Record<string, unknown>)[locale] : null;
  const intro = typeof configured === "string" && configured.trim()
    ? configured
    : isFa ? "برای پرسش دربارهٔ قیمت روز و امکان سفارش با یکی از راه‌های ارتباطی زیر تماس بگیرید. ثبت درخواست، سفارش قطعی یا تأیید موجودی نیست."
      : "Use one of the channels below to ask about current pricing and availability. A request is not a confirmed order or stock reservation.";

  return <div className="page-shell container editorial-page contact-page">
    <RevealSection className="contact-heading">
      <span className="eyebrow">SENSI SPORT / 08</span>
      <h1>{copy.nav.contact}</h1>
      <p className="editorial-lead">{intro}</p>
      <div className="contact-profile"><Image src="/images/instagram/profile.jpg" alt={instagramAudit.profile.profile_image_description} width={70} height={70} /><div><strong>{instagramAudit.profile.display_name}</strong><span>@{instagramAudit.profile.handle}</span></div></div>
    </RevealSection>

    <RevealSection className="contact-method-grid">
      <a className="contact-method" href={`tel:${instagramAudit.contact.phone_href}`}>
        <span className="contact-method-icon"><Phone size={20} /></span>
        <span className="contact-method-label">{isFa ? "تماس تلفنی" : "Phone"}</span>
        <strong dir="ltr">{instagramAudit.contact.phone_display}</strong>
        <small>{isFa ? `درج‌شده روی تصویر پست ${formatDate(instagramAudit.contact.phone_source_date, locale)}` : `Shown on a public post image dated ${formatDate(instagramAudit.contact.phone_source_date, locale)}`}</small>
      </a>
      <a className="contact-method" href={instagramAudit.contact.telegram_url} target="_blank" rel="noreferrer">
        <span className="contact-method-icon"><Send size={20} /></span>
        <span className="contact-method-label">{isFa ? "کانال تلگرام" : "Telegram channel"}</span>
        <strong>Sensi Sport</strong>
        <small dir="ltr">t.me/Sensi_Sport</small>
      </a>
      <a className="contact-method" href={instagramAudit.contact.instagram_url} target="_blank" rel="noreferrer">
        <span className="contact-method-icon"><Instagram size={20} /></span>
        <span className="contact-method-label">Instagram</span>
        <strong>@sensi_sport</strong>
        <small>{isFa ? "صفحهٔ عمومی فروشگاه" : "Public store profile"}</small>
      </a>
    </RevealSection>

    <RevealSection className="notice-box contact-source-note">
      {isFa
        ? `${instagramAudit.contact.phone_source_note_fa} ایتا در کپشن‌های عمومی نام برده شده، اما شناسه یا پیوندی برای آن در بستهٔ منبع نبود. آدرس حضوری یا ایمیل عمومی هم ثبت نشده است.`
        : `The phone number is transcribed from a public post image dated ${formatDate(instagramAudit.contact.phone_source_date, locale)}. Eitaa is mentioned in public captions, but no account link or handle was included in the source pack. No public street address or email was found.`}
    </RevealSection>
    <Link className="social-cta contact-archive-link" href={`/${locale}/instagram`}>{isFa ? "مشاهدهٔ پست‌ها و هایلایت‌های منبع" : "View sourced posts and highlights"}</Link>
  </div>;
}

function formatDate(value: string, locale: "fa" | "en") {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}
