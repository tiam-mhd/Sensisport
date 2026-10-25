import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddProductAction } from "@/components/store/add-product-action";
import { isLocale } from "@/i18n/config";
import { getProductDetail } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/money";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) return {};
  const product = await getProductDetail(rawLocale, slug);
  return product ? { title: product.title, description: product.description ?? undefined, alternates: { canonical: `/${rawLocale}/product/${slug}`, languages: { fa: `/fa/product/${slug}`, en: `/en/product/${slug}` } }, openGraph: { title: product.title, description: product.description ?? undefined, images: product.images.map((item) => item.url) } } : {};
}

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const product = await getProductDetail(rawLocale, slug);
  if (!product) notFound();
  const copy = getMessages(rawLocale);
  const price = formatMoney(product.priceMinor, product.currency, rawLocale === "fa" ? "fa-IR" : "en-US");
  const media = product.images;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description ? { description: product.description } : {}),
    ...(media.length ? { image: media.map((item) => new URL(item.url, process.env.APP_URL ?? "http://localhost:3000").toString()) } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.priceStatus === "confirmed" && product.priceMinor !== null && product.currency ? { offers: { "@type": "Offer", priceCurrency: product.currency, price: product.priceMinor / (10 ** new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).resolvedOptions().maximumFractionDigits), ...(product.trackInventory ? { availability: (product.variants.length ? product.variants.some((variant) => variant.stock > 0) : product.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } : {}) } } : {}),
  };
  return <div className="page-shell container product-detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <nav className="breadcrumbs" aria-label={rawLocale === "fa" ? "مسیر صفحه" : "Breadcrumb"}><Link href={`/${rawLocale}`}>{copy.nav.home}</Link><span>/</span><Link href={`/${rawLocale}/shop`}>{copy.nav.shop}</Link><span>/</span><span>{product.title}</span></nav>
    <div className="product-detail-grid">
      <div className="product-gallery" aria-label={copy.product.gallery}>{media.length ? media.map((image) => <figure className="gallery-frame" key={image.id}><Image src={image.url} alt={image.alt ?? product.title} fill sizes="(max-width: 800px) 100vw, 55vw" />{image.kind === "source" && <figcaption>{copy.product.sourceImage}</figcaption>}{image.kind === "site" && <figcaption>{copy.product.siteImage}</figcaption>}</figure>) : <div className="gallery-frame gallery-empty"><p>{copy.common.unverified}</p></div>}</div>
      <div className="product-detail-copy"><span className="eyebrow">{product.categoryName ?? "SENSI SPORT"}</span><h1>{product.title}</h1><p className="product-detail-price">{price ?? copy.common.priceUnavailable}</p>{product.priceStatus !== "confirmed" && <p className="status-pill">{product.priceStatus === "quote" ? copy.common.quote : copy.common.unverified}</p>}
        {product.description && <p className="product-description">{product.description}</p>}
        <div className="product-specs"><h2>{copy.product.details}</h2>{Object.entries(product.specifications ?? {}).length ? <dl>{Object.entries(product.specifications).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="muted-text">{copy.common.unverified}</p>}</div>
        {product.trackInventory && <p className="muted-text">{copy.product.stock}: {product.variants.length ? product.variants.map((variant) => variant.stock).reduce((sum, stock) => sum + stock, 0) : product.stock}</p>}
        {(product.priceStatus === "quote" || (product.priceStatus === "confirmed" && price)) && <AddProductAction locale={rawLocale} product={{ id: product.id, slug: product.slug, titleFa: product.titleFa, titleEn: product.titleEn, priceMinor: product.priceMinor, currency: product.currency, image: media[0]?.url ?? null, trackInventory: product.trackInventory, variants: product.variants }} labels={{ add: copy.product.add, saved: copy.nav.wishlist, choose: copy.product.options }} />}
        <p className="muted-text product-source-note">{copy.common.sourcePending}</p>
      </div>
    </div>
  </div>;
}
