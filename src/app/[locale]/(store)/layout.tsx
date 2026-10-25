import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return <>
    <SiteHeader locale={locale} labels={{ home: messages.nav.home, shop: messages.nav.shop, brand: messages.nav.brand, contact: messages.nav.contact, account: messages.nav.account, cart: messages.nav.cart, search: messages.nav.search, brandName: messages.brand, temporaryMark: messages.temporaryMark }} />
    <main id="main-content">{children}</main>
    <SiteFooter locale={locale} brand={messages.brand} note={messages.footer.note} rights={messages.footer.rights} />
  </>;
}
