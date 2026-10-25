import Link from "next/link";
import { Instagram, Send } from "lucide-react";
import type { Locale } from "@/i18n/config";

export function SiteFooter({ locale, brand, note, rights }: { locale: Locale; brand: string; note: string; rights: string }) {
  return <footer className="site-footer"><div className="container footer-grid">
    <div><Link className="footer-brand" href={`/${locale}`}>{brand}</Link><p>{note}</p></div>
    <div className="footer-links"><Link href={`/${locale}/services/shipping`}>{locale === "fa" ? "ارسال" : "Shipping"}</Link><Link href={`/${locale}/services/warranty`}>{locale === "fa" ? "ضمانت" : "Warranty"}</Link><Link href={`/${locale}/services/faq`}>{locale === "fa" ? "پرسش‌های متداول" : "FAQ"}</Link><Link href={`/${locale}/contact`}>{locale === "fa" ? "تماس" : "Contact"}</Link><Link href={`/${locale}/instagram`}>{locale === "fa" ? "آرشیو اینستاگرام" : "Instagram archive"}</Link></div>
    <div className="footer-social"><a href="https://www.instagram.com/sensi_sport/" target="_blank" rel="noreferrer" aria-label="Instagram Sensi Sport"><Instagram size={18} /> Instagram</a><a href="https://t.me/Sensi_Sport" target="_blank" rel="noreferrer" aria-label="Telegram Sensi Sport"><Send size={17} /> Telegram</a></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {brand}</span><span>{rights}</span></div>
  </div></footer>;
}
