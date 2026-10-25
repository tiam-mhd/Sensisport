import { AccountForm } from "@/components/store/account-form";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/lib/messages";

export default async function AdminLoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const copy = getMessages(locale);
  return <div className="page-shell container"><section className="account-panel"><span className="eyebrow">SENSI SPORT / ADMIN</span><h1>{copy.admin.title}</h1><AccountForm locale={locale} mode="login" adminOnly /></section></div>;
}
