import { AccountForm } from "@/components/store/account-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export default async function RegisterPage({ params }: PageProps<"/[locale]/account/register">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  return <div className="page-shell container"><section className="account-panel"><span className="eyebrow">SENSI SPORT / ACCOUNT</span><h1>{copy.account.register}</h1><AccountForm locale={locale} mode="register" /></section></div>;
}
