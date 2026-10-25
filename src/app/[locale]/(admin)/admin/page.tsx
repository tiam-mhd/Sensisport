import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { orders, products, users } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const db = getDb();
  const [[productCount], [orderCount], [quoteCount], [userCount]] = await Promise.all([
    db.select({ value: count() }).from(products), db.select({ value: count() }).from(orders), db.select({ value: count() }).from(orders).where(eq(orders.status, "quote_requested")), db.select({ value: count() }).from(users),
  ]);
  const recent = await db.select({ publicId: orders.publicId, status: orders.status, createdAt: orders.createdAt, totalMinor: orders.totalMinor, currency: orders.currency }).from(orders).orderBy(desc(orders.createdAt)).limit(8);
  return <><span className="eyebrow">SENSI SPORT / ADMIN</span><h1>{copy.admin.dashboard}</h1><div className="admin-cards"><div className="admin-stat"><span>{copy.admin.products}</span><strong>{productCount.value}</strong></div><div className="admin-stat"><span>{copy.admin.orders}</span><strong>{orderCount.value}</strong></div><div className="admin-stat"><span>{locale === "fa" ? "درخواست استعلام" : "Quote requests"}</span><strong>{quoteCount.value}</strong></div></div><div className="admin-actions"><h2>{locale === "fa" ? "سفارش‌های اخیر" : "Recent orders"}</h2><Link className="button button-outline" href={`/${locale}/admin/orders`}>{copy.admin.orders}</Link></div>{recent.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{copy.order.number}</th><th>{copy.order.status}</th><th>{copy.order.created}</th><th>{copy.cart.total}</th></tr></thead><tbody>{recent.map((order) => <tr key={order.publicId}><td>{order.publicId.slice(0, 12)}…</td><td>{order.status}</td><td>{new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { dateStyle: "short" }).format(order.createdAt)}</td><td>{order.totalMinor === null ? copy.common.quote : `${order.totalMinor} ${order.currency}`}</td></tr>)}</tbody></table></div> : <div className="empty-panel"><p>{copy.common.empty}</p></div>}<p className="admin-note">{locale === "fa" ? `حساب‌های ثبت‌شده: ${userCount.value}. سفارش دارای مبلغ فقط با درگاه واقعی تکمیل می‌شود.` : `${userCount.value} accounts. Priced orders require a real payment provider before completion.`}</p></>;
}
