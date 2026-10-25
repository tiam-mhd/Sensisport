import "server-only";
import type { Locale } from "@/i18n/config";
import fa from "@/messages/fa.json";
import en from "@/messages/en.json";

export function getMessages(locale: Locale) {
  return locale === "fa" ? fa : en;
}
