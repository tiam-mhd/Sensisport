import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { currentUser } from "@/lib/auth/session";
import { getMessages } from "@/lib/messages";
import { SignOutButton } from "@/components/store/sign-out-button";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect(`/${locale}/admin/login`);
  const copy = getMessages(locale);
  const links = [[copy.admin.dashboard, `/${locale}/admin`], [copy.admin.products, `/${locale}/admin/products`], [locale === "fa" ? "دسته‌بندی‌ها" : "Categories", `/${locale}/admin/categories`], [copy.admin.orders, `/${locale}/admin/orders`], [locale === "fa" ? "کد تخفیف" : "Coupons", `/${locale}/admin/coupons`], [copy.admin.settings, `/${locale}/admin/settings`]];
  return <div className="admin-shell"><header className="admin-topbar"><Link href={`/${locale}/admin`}><strong>SENSI / ADMIN</strong></Link><div className="admin-top-actions"><Link href={`/${locale}`}>{locale === "fa" ? "نمایش فروشگاه" : "View store"}</Link><SignOutButton label={copy.account.logout} /></div></header><div className="admin-layout"><nav className="admin-nav" aria-label={locale === "fa" ? "مدیریت" : "Administration"}>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><main className="admin-main">{children}</main></div></div>;
}
