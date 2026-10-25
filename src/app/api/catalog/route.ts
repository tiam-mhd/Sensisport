import { NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { getPublishedProducts } from "@/lib/catalog/queries";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "fa";
  if (!isLocale(locale)) return Response.json({ error: "Unsupported locale." }, { status: 400 });
  const products = await getPublishedProducts(locale, { search: request.nextUrl.searchParams.get("q") ?? undefined, category: request.nextUrl.searchParams.get("category") ?? undefined, sort: request.nextUrl.searchParams.get("sort") ?? undefined, limit: 100 });
  return Response.json({ products }, { headers: { "cache-control": "no-store" } });
}
