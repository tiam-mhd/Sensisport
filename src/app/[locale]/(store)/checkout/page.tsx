import { CheckoutForm } from "@/components/store/checkout-form";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shippingMethods as shippingMethodsTable } from "@/db/schema";
import { isLocale } from "@/i18n/config";
import { paymentReadiness } from "@/lib/checkout/payment";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  const paymentAvailable = paymentReadiness().available;
  const shippingMethods = process.env.DATABASE_URL ? await getDb().select({ id: shippingMethodsTable.id, code: shippingMethodsTable.code, nameFa: shippingMethodsTable.nameFa, nameEn: shippingMethodsTable.nameEn, costMinor: shippingMethodsTable.costMinor, currency: shippingMethodsTable.currency }).from(shippingMethodsTable).where(eq(shippingMethodsTable.enabled, true)) : [];
  const options = shippingMethods.map((method) => ({ id: method.id, name: (locale === "fa" ? method.nameFa : method.nameEn) ?? method.code, costMinor: method.costMinor, currency: method.currency }));
  const labels = { loading: copy.common.loading, emptyCart: locale === "fa" ? "سبد خرید شما خالی است." : "Your cart is empty.", contact: copy.checkout.contact, name: copy.checkout.name, email: copy.checkout.email, phone: copy.checkout.phone, province: copy.checkout.province, city: copy.checkout.city, postalCode: copy.checkout.postalCode, address: copy.checkout.address, shippingMethod: copy.checkout.shippingMethod, shippingUnavailable: copy.checkout.shippingUnavailable, couponCode: copy.checkout.couponCode, note: copy.checkout.note, submit: copy.checkout.submit, quoteSubmit: copy.checkout.quoteSubmit, quoteNotice: locale === "fa" ? "این فرم فقط درخواست استعلام ثبت می‌کند و سفارش پرداخت‌شده یا قطعی نیست." : "This form records a quote request only; it does not place a paid order.", processingNotice: paymentAvailable ? (locale === "fa" ? "پرداخت آزمایشی فعال است؛ سفارش پرداخت‌شده ثبت نمی‌شود." : "Test payment mode is active; orders will not be marked paid.") : copy.checkout.paymentUnavailable, error: copy.common.error };
  return <div className="page-shell container"><div className="page-intro"><span className="eyebrow">SENSI SPORT / 04</span><h1>{copy.checkout.title}</h1></div><div className="checkout-layout"><CheckoutForm locale={locale} shippingMethods={options} paymentAvailable={paymentAvailable} labels={labels} /></div></div>;
}
