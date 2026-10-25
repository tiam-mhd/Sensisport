import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isLocale } from "./src/i18n/config";

function preferredLocale(request: NextRequest) {
  const saved = request.cookies.get("NEXT_LOCALE")?.value;
  if (saved && isLocale(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  const ranked = accepted.split(",").map((entry, order) => {
    const [tag = "", quality = ""] = entry.trim().toLowerCase().split(";q=");
    const locale = tag.split("-")[0] ?? "";
    const parsedQuality = quality ? Number(quality) : 1;
    return { locale, quality: Number.isFinite(parsedQuality) ? parsedQuality : 0, order };
  }).filter((entry) => isLocale(entry.locale) && entry.quality > 0).sort((a, b) => b.quality - a.quality || a.order - b.order);
  return ranked[0]?.locale && isLocale(ranked[0].locale) ? ranked[0].locale : defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml).*)"],
};
