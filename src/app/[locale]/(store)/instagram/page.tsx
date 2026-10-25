import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, Instagram } from "lucide-react";
import { RevealSection } from "@/components/store/reveal-section";
import { isLocale } from "@/i18n/config";
import { formatSourceDate, instagramAudit, instagramProductById, safeSourceCaption } from "@/lib/instagram/source-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/instagram">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "آرشیو منبع اینستاگرام" : "Instagram source archive" };
}

export default async function InstagramArchivePage({ params }: PageProps<"/[locale]/instagram">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const isFa = locale === "fa";
  const Arrow = isFa ? ArrowUpLeft : ArrowUpRight;

  return <div className="page-shell container instagram-archive-page">
    <RevealSection className="instagram-archive-intro">
      <div className="instagram-archive-title"><Image src="/images/instagram/profile.jpg" alt={instagramAudit.profile.profile_image_description} width={78} height={78} priority /><div><span className="eyebrow">SENSI SPORT / INSTAGRAM</span><h1>{isFa ? "روایت سنسی از منبع اصلی" : "Sensi Sport — source archive"}</h1><p>@{instagramAudit.profile.handle} · {formatSourceDate(instagramAudit.capture_date, locale)}</p></div></div>
      <p className="editorial-lead">{isFa ? "تصویرها و کپشن‌های قابل دریافت از نمای عمومی اینستاگرام را کنار محصولات و اطلاعات برند ثبت کرده‌ایم. این آرشیو لزوماً تمام تاریخچهٔ حساب نیست؛ قیمت‌ها و موجودی پست‌های قدیمی، اطلاعات جاری فروشگاه محسوب نمی‌شوند." : "This archive preserves images and captions captured from the public Instagram view, with links back to the source. It may not cover the account’s full history; prices and stock statements in old posts are not current store terms."}</p>
      <div className="instagram-archive-actions"><a className="button button-primary" href={instagramAudit.contact.instagram_url} target="_blank" rel="noreferrer"><Instagram size={17} />{isFa ? "بازکردن صفحهٔ اصلی" : "Open Instagram profile"}</a><Link className="button button-outline" href={`/${locale}/shop`}>{isFa ? "رفتن به کاتالوگ" : "Browse the catalog"}<Arrow size={17} /></Link></div>
    </RevealSection>

    <RevealSection className="instagram-highlights-section">
      <div className="section-heading"><div><span className="eyebrow">01 / {isFa ? "هایلایت‌های ثبت‌شده" : "SAVED HIGHLIGHTS"}</span><h2>{isFa ? "موضوع‌های معرفی‌شده در هایلایت" : "Topics named in the highlights"}</h2></div></div>
      <div className="instagram-highlight-grid">{instagramAudit.highlights.map((item) => <a className="instagram-highlight-card" key={item.id} href={item.url} target="_blank" rel="noreferrer"><Image src={item.site_cover_path} alt={item.title_fa} width={96} height={96} /><span><strong>{isFa ? item.title_fa : highlightTitleEn(item.id)}</strong><small>{isFa ? "فریم‌های استوری از نشست عمومی دریافت نشد" : "Story frames were unavailable in the public capture"}</small></span><Arrow size={17} aria-hidden="true" /></a>)}</div>
    </RevealSection>

    <RevealSection className="instagram-posts-section">
      <div className="section-heading"><div><span className="eyebrow">02 / {isFa ? "فید عمومی" : "PUBLIC FEED"}</span><h2>{isFa ? "پست‌ها و پوسترهای ریلز" : "Posts and reel posters"}</h2></div><span className="instagram-total">{String(instagramAudit.posts.length).padStart(2, "0")}</span></div>
      <div className="instagram-post-grid">{instagramAudit.posts.map((post) => {
        const product = post.product_ids.map((id) => instagramProductById.get(id)).find(Boolean);
        const caption = post.caption_fa ? safeSourceCaption(post.caption_fa) : null;
        return <article className="instagram-post-card" key={post.id}>
          <a className="instagram-post-media" href={post.source_url} target="_blank" rel="noreferrer" aria-label={isFa ? `بازکردن منبع Instagram ${post.id}` : `Open Instagram source ${post.id}`}>
            <Image src={post.site_image_path} alt={post.alt_text ?? post.id} fill sizes="(max-width: 650px) 90vw, (max-width: 1000px) 45vw, 30vw" />
            <span className="instagram-media-kind">{post.kind === "reel" ? (isFa ? "پوستر ریلز" : "REEL POSTER") : (isFa ? "پست" : "POST")}</span>
          </a>
          <div className="instagram-post-copy">
            <div className="instagram-post-meta"><time dateTime={post.published_date ?? undefined}>{formatSourceDate(post.published_date, locale)}</time><span>#{post.id}</span></div>
            {product && <Link className="instagram-product-link" href={`/${locale}/product/${product.slug}`}>{isFa ? product.name_fa : product.name_en}<Arrow size={15} /></Link>}
            {caption ? <details className="instagram-caption"><summary>{isFa ? "خواندن کپشن اصلی" : "Read the original Persian caption"}</summary><p lang="fa" dir="rtl">{caption}</p></details> : <p className="instagram-caption-missing">{isFa ? "کپشن در دادهٔ عمومی ثبت نشده بود؛ توضیحی ساخته نشده است." : "No public caption was captured; no replacement text was invented."}</p>}
            {post.kind === "reel" && <p className="instagram-reel-note">{isFa ? "ویدئو در بسته موجود نیست؛ این تصویر فقط پوستر ذخیره‌شده است." : "The video was not included; this is its saved poster only."}</p>}
            <a className="instagram-original-link" href={post.source_url} target="_blank" rel="noreferrer">{isFa ? "مشاهدهٔ منبع در اینستاگرام" : "View original on Instagram"}<Arrow size={15} /></a>
          </div>
        </article>;
      })}</div>
    </RevealSection>
  </div>;
}

function highlightTitleEn(id: string) {
  const labels: Record<string, string> = {
    h01: "Why Sensi Sport", h02: "Guarantee", h03: "VIP products", h04: "Meet the club", h05: "Ninja backgrounds",
    h06: "How to order", h07: "Shipping method", h08: "Shipping time", h09: "Shipping cost", h10: "Video",
  };
  return labels[id] ?? "Instagram highlight";
}
