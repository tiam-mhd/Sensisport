import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/brand">): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "دربارهٔ سنسی" : "About Sensi" };
}

export default async function BrandPage({ params }: PageProps<"/[locale]/brand">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  return <article className="page-shell container editorial-page"><span className="eyebrow">SENSI SPORT / 06</span><h1>{copy.home.story}</h1><p className="editorial-lead">{copy.home.storyText}</p><div className="notice-box">{copy.common.sourcePending}</div></article>;
}
