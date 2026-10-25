import { desc } from "drizzle-orm";
import { CouponManager } from "@/components/admin/coupon-manager";
import { getDb } from "@/db";
import { coupons } from "@/db/schema";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({ params }: PageProps<"/[locale]/admin/coupons">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const rows = await getDb().select({ id: coupons.id, code: coupons.code, active: coupons.active, discountPercent: coupons.discountPercent, discountMinor: coupons.discountMinor, currency: coupons.currency, usedCount: coupons.usedCount }).from(coupons).orderBy(desc(coupons.createdAt));
  return <><span className="eyebrow">SENSI SPORT / COUPONS</span><h1>{locale === "fa" ? "کدهای تخفیف" : "Coupons"}</h1><CouponManager initial={rows} locale={locale} /></>;
}
