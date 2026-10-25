import { CartView } from "@/components/store/cart-view";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  return <div className="page-shell container"><div className="page-intro"><span className="eyebrow">SENSI SPORT / 03</span><h1>{copy.cart.title}</h1></div><CartView locale={locale} labels={{ loading: copy.common.loading, emptyTitle: copy.cart.emptyTitle, emptyText: copy.cart.emptyText, continue: copy.cart.continue, quantity: copy.cart.quantity, remove: copy.cart.remove, summary: copy.cart.summary, subtotal: copy.cart.subtotal, shipping: copy.cart.shipping, total: copy.cart.total, checkout: copy.cart.checkout, shippingPending: locale === "fa" ? "هزینهٔ ارسال پس از تنظیم مدیریت محاسبه می‌شود." : "Shipping is calculated after management configures a method.", decrease: locale === "fa" ? "کاهش تعداد" : "Decrease quantity", increase: locale === "fa" ? "افزایش تعداد" : "Increase quantity", quote: copy.common.quote }} /></div>;
}
