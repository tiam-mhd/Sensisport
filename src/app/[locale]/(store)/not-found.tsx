import Link from "next/link";
export default async function NotFound({ params }: { params?: Promise<{ locale?: string }> }) {
  const locale = (await params)?.locale === "en" ? "en" : "fa";
  return <div className="page-shell container empty-panel"><span className="eyebrow">404</span><h1>{locale === "fa" ? "این صفحه پیدا نشد" : "Page not found"}</h1><Link className="button button-primary" href={`/${locale}`}>{locale === "fa" ? "بازگشت به خانه" : "Back home"}</Link></div>;
}
