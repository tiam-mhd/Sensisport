import { asc } from "drizzle-orm";
import { SettingsForm } from "@/components/admin/settings-form";
import { ShippingManager } from "@/components/admin/shipping-manager";
import { getDb } from "@/db";
import { shippingMethods, siteSettings } from "@/db/schema";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

function settingText(settings: Record<string, unknown>, key: string, locale: "fa" | "en") {
  const setting = settings[key];
  if (!setting || typeof setting !== "object") return "";
  const value = (setting as Record<string, unknown>)[locale];
  return typeof value === "string" ? value : "";
}

export default async function AdminSettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const [rows, methods] = await Promise.all([getDb().select().from(siteSettings), getDb().select().from(shippingMethods).orderBy(asc(shippingMethods.createdAt))]);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const initial = {
    shippingFa: settingText(values, "service.shipping", "fa"), shippingEn: settingText(values, "service.shipping", "en"),
    warrantyFa: settingText(values, "service.warranty", "fa"), warrantyEn: settingText(values, "service.warranty", "en"),
    faqFa: settingText(values, "service.faq", "fa"), faqEn: settingText(values, "service.faq", "en"),
    contactFa: settingText(values, "contact", "fa"), contactEn: settingText(values, "contact", "en"),
  };
  return <><span className="eyebrow">SENSI SPORT / SETTINGS</span><h1>{locale === "fa" ? "تنظیمات و اطلاعات خدمات" : "Settings and service information"}</h1><div className="settings-section"><h2>{locale === "fa" ? "محتوای عمومی" : "Public content"}</h2><SettingsForm initial={initial} locale={locale} /></div><div className="settings-section"><h2>{locale === "fa" ? "روش‌های ارسال" : "Shipping methods"}</h2><ShippingManager initial={methods} locale={locale} /></div><div className="notice-box">{locale === "fa" ? "دامنه، APP_URL و تنظیم SSL را در پنل Runflare تنظیم کنید. هزینه‌ها، محتوا و پرداخت باید پیش از انتشار از سوی شما تأیید شوند." : "Set the domain, APP_URL, and SSL in Runflare. Review charges, service content, and payments before publishing."}</div></>;
}
