import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StoreProvider } from "@/components/store/store-provider";
import { isLocale, locales } from "@/i18n/config";
import "./styles.css";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  await connection();
  const { locale } = await params;
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const description = locale === "fa"
    ? "فروشگاه آنلاین Sensi Sport؛ اطلاعات محصولات پس از بررسی منابع منتشر می‌شود."
    : "Sensi Sport online store. Product information is published after source review.";
  return {
    metadataBase: new URL(baseUrl),
    title: { default: "Sensi Sport", template: "%s | Sensi Sport" },
    description,
    applicationName: "Sensi Sport",
    alternates: { languages: { fa: "/fa", en: "/en" } },
    openGraph: {
      type: "website",
      siteName: "Sensi Sport",
      images: [{ url: "/images/hero/ninja-hero.png", width: 3840, height: 2160, alt: "Sensi Sport hero image" }],
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"}>
    <body className={`locale-${locale}`}><a className="skip-link" href="#main-content">{locale === "fa" ? "رفتن به محتوای اصلی" : "Skip to content"}</a><StoreProvider>{children}</StoreProvider></body>
  </html>;
}
