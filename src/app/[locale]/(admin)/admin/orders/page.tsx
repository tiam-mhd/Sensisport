import { desc } from "drizzle-orm";
import { OrderManager } from "@/components/admin/order-manager";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ params }: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const rows = await getDb().select({ id: orders.id, publicId: orders.publicId, email: orders.email, recipientName: orders.recipientName, status: orders.status, totalMinor: orders.totalMinor, currency: orders.currency, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(250);
  return <><span className="eyebrow">SENSI SPORT / ORDERS</span><h1>{locale === "fa" ? "سفارش‌ها" : "Orders"}</h1><p className="admin-note">{locale === "fa" ? "تغییر وضعیت فقط در مسیرهای مجاز انجام می‌شود؛ پرداخت واقعی توسط درگاه متصل نشده است." : "Only allowed status transitions are available. No real payment gateway is connected."}</p><OrderManager initial={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))} locale={locale} /></>;
}
