import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { isOrderLookupTokenValid } from "@/lib/auth/order-lookup";
import { isLocale } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

const statusLabel = (status: string, locale: "fa" | "en") => {
  const fa: Record<string, string> = { quote_requested: "درخواست استعلام", pending_payment: "در انتظار پرداخت", paid: "پرداخت‌شده", processing: "در حال آماده‌سازی", shipped: "ارسال‌شده", completed: "تکمیل‌شده", cancelled: "لغوشده", payment_failed: "پرداخت ناموفق" };
  const en: Record<string, string> = { quote_requested: "Quote requested", pending_payment: "Awaiting payment", paid: "Paid", processing: "Processing", shipped: "Shipped", completed: "Completed", cancelled: "Cancelled", payment_failed: "Payment failed" };
  return (locale === "fa" ? fa : en)[status] ?? status;
};

export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/order/[orderId]">) {
  const [{ locale: rawLocale, orderId }, query, cookieStore, user] = await Promise.all([params, searchParams, cookies(), currentUser()]);
  if (!isLocale(rawLocale)) return null;
  const locale = rawLocale;
  const copy = getMessages(locale);
  const token = cookieStore.get("sensi_order_lookup")?.value;
  const tokenAllowsOrder = token ? await isOrderLookupTokenValid(token, orderId) : false;
  const db = getDb();
  const [order] = tokenAllowsOrder
    ? await db.select().from(orders).where(eq(orders.publicId, orderId)).limit(1)
    : user
      ? await db.select().from(orders).where(and(eq(orders.publicId, orderId), eq(orders.userId, user.id))).limit(1)
      : [];
  const [items, payment] = order ? await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1),
  ]) : [[], []];
  const numberFormat = locale === "fa" ? "fa-IR" : "en-US";
  return <div className="page-shell container"><div className="page-intro"><span className="eyebrow">SENSI SPORT / ORDER</span><h1>{copy.order.title}</h1></div>
    {!order ? <section className="account-panel"><p>{copy.order.notFound}</p>{query.lookup === "failed" && <p className="form-error" role="alert">{locale === "fa" ? "ایمیل با این شناسهٔ سفارش تطبیق نداشت." : "That email did not match this order."}</p>}<p className="muted-text">{locale === "fa" ? `شناسهٔ سفارش: ${orderId}` : `Order ID: ${orderId}`}</p><form method="post" action="/api/orders/lookup" className="login-form"><input type="hidden" name="locale" value={locale} /><input type="hidden" name="publicId" value={orderId} /><label>{copy.account.email}<input name="email" type="email" required dir="ltr" autoComplete="email" /></label><button className="button button-primary" type="submit">{copy.order.lookup}</button></form></section> : <section className="summary-panel order-summary"><div className="summary-row"><span>{copy.order.number}</span><strong>{order.publicId}</strong></div><div className="summary-row"><span>{copy.order.status}</span><strong>{statusLabel(order.status, locale)}</strong></div><div className="summary-row"><span>{copy.order.created}</span><span>{new Intl.DateTimeFormat(numberFormat, { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</span></div>{payment[0] && <p className="notice-box">{locale === "fa" ? "وضعیت پرداخت: در انتظار اتصال درگاه واقعی." : "Payment is pending. A real payment provider is not connected."}</p>}<h2>{copy.order.items}</h2><ul className="order-item-list">{items.map((item) => <li key={item.id}><span>{item.titleSnapshot} × {item.quantity}</span><span>{formatMoney(item.lineTotalMinor, item.currency, numberFormat) ?? copy.common.quote}</span></li>)}</ul><div className="summary-total"><span>{copy.cart.total}</span><strong>{formatMoney(order.totalMinor, order.currency, numberFormat) ?? copy.common.quote}</strong></div></section>}
  </div>;
}
