import type { Locale } from "@/i18n/config";

export function SearchForm({ locale, placeholder, query = "" }: { locale: Locale; placeholder: string; query?: string }) {
  return <form className="search-form" action={`/${locale}/search`} role="search">
    <label className="sr-only" htmlFor="site-search">{placeholder}</label>
    <input id="site-search" name="q" type="search" placeholder={placeholder} defaultValue={query} maxLength={120} />
    <button className="button button-primary" type="submit">{locale === "fa" ? "جست‌وجو" : "Search"}</button>
  </form>;
}
