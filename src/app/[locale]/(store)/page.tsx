import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { Hero } from "@/components/store/hero";
import { ProductCard } from "@/components/store/product-card";
import { isLocale } from "@/i18n/config";
import { getFeaturedProducts } from "@/lib/catalog/queries";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) return null;
  const locale = rawLocale;
  const copy = getMessages(locale);
  const products = await getFeaturedProducts(locale, 4);
  const Arrow = locale === "fa" ? ArrowUpLeft : ArrowUpRight;
  return <>
    <Hero locale={locale} eyebrow={copy.home.eyebrow} title={copy.home.title} subtitle={copy.home.subtitle} cta={copy.home.cta} />
    <section className="section section-featured container">
      <div className="section-heading"><div><span className="eyebrow">01 / {locale === "fa" ? "محصولات منتخب" : "FEATURED"}</span><h2>{copy.home.featured}</h2></div><Link className="text-link" href={`/${locale}/shop`}>{copy.common.browse}<Arrow size={17} /></Link></div>
      {products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} labels={{ quote: copy.common.quote, unavailable: copy.common.priceUnavailable, add: copy.product.add, saved: copy.nav.wishlist, chooseOptions: copy.product.options }} />)}</div> : <div className="quiet-panel"><span className="panel-index">01</span><div><h3>{copy.home.featuredText}</h3><p>{copy.common.sourcePending}</p></div><Link className="text-link" href={`/${locale}/shop`}>{copy.common.browse}<Arrow size={17} /></Link></div>}
    </section>
    <section className="section section-categories">
      <div className="container category-section-inner"><div><span className="eyebrow">02 / {locale === "fa" ? "کشف مجموعه" : "EXPLORE THE RANGE"}</span><h2>{copy.home.categories}</h2><p className="section-lead">{copy.home.categoriesText}</p></div><div className="category-empty"><div className="category-number">02</div><p>{copy.common.noProducts}</p><Link className="button button-outline" href={`/${locale}/shop`}>{copy.common.browse}</Link></div></div>
    </section>
    <section className="section story-section container"><div className="story-rule" /><div className="story-copy"><span className="eyebrow">03 / SENSI SPORT</span><h2>{copy.home.story}</h2><p>{copy.home.storyText}</p></div><Link className="story-mark" href={`/${locale}/brand`} aria-label={copy.nav.brand}><Arrow size={22} /></Link></section>
  </>;
}
