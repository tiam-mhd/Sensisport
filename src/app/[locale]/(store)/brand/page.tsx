import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Instagram, Send } from "lucide-react";
import { RevealSection } from "@/components/store/reveal-section";
import { isLocale } from "@/i18n/config";
import { instagramAudit } from "@/lib/instagram/source-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/brand">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "دربارهٔ تولیدی سنسی" : "About Sensi Sport" };
}

export default async function BrandPage({ params }: PageProps<"/[locale]/brand">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const isFa = locale === "fa";
  const Arrow = isFa ? ArrowUpLeft : ArrowUpRight;
  const description = isFa
    ? "در معرفی عمومی حساب، تولیدی سنسی سازندهٔ لوازم و تجهیزات نینجا و سامورایی معرفی شده است. این معرفی بر پایهٔ bio عمومی حساب در ۲۵ اکتبر ۲۰۲۶ نوشته شده؛ جزئیات دیگر فقط وقتی منتشر می‌شوند که در منبع قابل تأیید باشند."
    : "The public profile describes Sensi as a maker of ninja and samurai equipment. This summary uses the profile bio captured on October 25, 2026; other details are shown only when the source supports them.";
  const snapshot = isFa
    ? `${instagramAudit.scope.public_feed_items_observed} مورد از فید عمومی دیده شد؛ ${instagramAudit.scope.media_counts.post_image} تصویر پست و ${instagramAudit.scope.media_counts.reel_poster} پوستر ریلز در بسته موجود است.`
    : `${instagramAudit.scope.public_feed_items_observed} public feed items were captured, with ${instagramAudit.scope.media_counts.post_image} post images and ${instagramAudit.scope.media_counts.reel_poster} reel posters in the source pack.`;

  return <div className="page-shell container editorial-page brand-page">
    <RevealSection className="brand-profile-panel">
      <div className="brand-profile-logo"><Image src="/images/instagram/profile.jpg" alt={instagramAudit.profile.profile_image_description} width={180} height={180} priority /></div>
      <div className="brand-profile-copy">
        <span className="eyebrow">SENSI SPORT / {isFa ? "معرفی" : "THE BRAND"}</span>
        <h1>{isFa ? "تولیدی سنسی؛ تجهیزات نینجا و سامورایی" : "Sensi Sport — Ninja and Samurai Equipment"}</h1>
        <p className="editorial-lead">{description}</p>
        <p className="brand-snapshot">{snapshot}</p>
        <div className="brand-actions">
          <Link className="button button-primary" href={`/${locale}/instagram`}>{isFa ? "دیدن آرشیو منبع" : "Explore the source archive"}<Arrow size={17} /></Link>
          <a className="button button-outline" href={instagramAudit.contact.instagram_url} target="_blank" rel="noreferrer"><Instagram size={17} />Instagram</a>
          <a className="button button-outline" href={instagramAudit.contact.telegram_url} target="_blank" rel="noreferrer"><Send size={17} />Telegram</a>
        </div>
      </div>
    </RevealSection>

    <RevealSection className="brand-evidence-grid">
      <article className="brand-evidence-card"><span>01</span><strong>{instagramAudit.products.length.toString().padStart(2, "0")}</strong><p>{isFa ? "سرنخ محصول از پست‌های عمومی؛ همگی با قیمت استعلامی و نیازمند تأیید فروشنده" : "Product leads from public posts; quote-only and awaiting seller confirmation"}</p></article>
      <article className="brand-evidence-card"><span>02</span><strong>{instagramAudit.scope.public_feed_items_observed.toString().padStart(2, "0")}</strong><p>{isFa ? "مورد فید عمومی ثبت‌شده؛ این بسته تضمین نمی‌کند کل تاریخچهٔ حساب باشد" : "Public feed items captured; the source pack is not a complete account history"}</p></article>
      <article className="brand-evidence-card"><span>03</span><strong>{instagramAudit.scope.highlight_count.toString().padStart(2, "0")}</strong><p>{isFa ? "عنوان و کاور هایلایت ثبت شده؛ محتوای استوری‌ها در دسترس عمومی نبود" : "Highlight titles and covers captured; story frames were not publicly accessible"}</p></article>
    </RevealSection>

    <RevealSection className="brand-source-note notice-box">
      {isFa
        ? `منبع این معرفی: ${instagramAudit.source_url}، ثبت‌شده در ${new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date(`${instagramAudit.capture_date}T12:00:00Z`))}. شمار فالوئر و اطلاعات زودتغییر برای نمایش عمومی استفاده نشده‌اند.`
        : `Source: ${instagramAudit.source_url}, captured ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${instagramAudit.capture_date}T12:00:00Z`))}. Changeable follower metrics are not displayed.`}
    </RevealSection>
  </div>;
}
