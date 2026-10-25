import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { currentUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { getMessages } from "@/lib/messages";
import { SignOutButton } from "@/components/store/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage({ params }: PageProps<"/[locale]/account/orders">) {
  const { locale } = await params;
  if (!isLocale(locale)) return notFound();
  const copy = getMessages(locale);
  const user = await currentUser();
  if (!user) return <div className="page-shell container"><div className="empty-panel"><h1>{copy.account.login}</h1><Link className="button button-primary" href={`/${locale}/account/login`}>{copy.account.login}</Link></div></div>;
  const accountOrders = await getDb().select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(100);
  return <div className="page-shell container"><div className="admin-actions"><div className="page-intro"><span className="eyebrow">{user.email}</span><h1>{copy.account.orders}</h1></div><SignOutButton label={copy.account.logout} /></div>
    {accountOrders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{copy.order.number}</th><th>{copy.order.status}</th><th>{copy.order.created}</th><th>{copy.cart.total}</th></tr></thead><tbody>{accountOrders.map((order) => <tr key={order.id}><td><Link href={`/${locale}/order/${order.publicId}`}>{order.publicId}</Link></td><td>{order.status}</td><td>{new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium" }).format(order.createdAt)}</td><td>{formatMoney(order.totalMinor, order.currency, locale === "fa" ? "fa-IR" : "en-US") ?? copy.common.quote}</td></tr>)}</tbody></table></div> : <div className="empty-panel"><h2>{copy.account.noOrders}</h2><Link className="button button-outline" href={`/${locale}/shop`}>{copy.common.browse}</Link></div>}</div>;
}
