"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const targetLocale = locale === "fa" ? "en" : "fa";
  const parts = pathname.split("/");
  parts[1] = targetLocale;
  return <Link className="locale-switch" href={`${parts.join("/")}${search ? `?${search}` : ""}`} lang={targetLocale} aria-label={locale === "fa" ? "Switch to English" : "تغییر زبان به فارسی"}>{targetLocale === "fa" ? "فا" : "EN"}</Link>;
}
