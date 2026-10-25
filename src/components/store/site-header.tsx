"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { LocaleSwitcher } from "./locale-switcher";
import { useStore } from "./store-provider";

export function SiteHeader({ locale, labels }: { locale: Locale; labels: { home: string; shop: string; brand: string; contact: string; account: string; cart: string; search: string; brandName: string; temporaryMark: string } }) {
  const pathname = usePathname();
  const { cart } = useStore();
  const [open, setOpen] = useState(false);
  const prefix = `/${locale}`;
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const items = [
    [labels.home, prefix], [labels.shop, `${prefix}/shop`], [labels.brand, `${prefix}/brand`], [labels.contact, `${prefix}/contact`],
  ];
  return <header className="site-header">
    <div className="header-inner container">
      <Link className="wordmark" href={prefix} aria-label={labels.brandName}>
        <Image src="/images/instagram/profile.jpg" alt="" width={42} height={42} priority />
        <span><strong>{labels.brandName}</strong><small>{labels.temporaryMark}</small></span>
      </Link>
      <nav className={`main-nav${open ? " is-open" : ""}`} aria-label={locale === "fa" ? "ناوبری اصلی" : "Main navigation"}>
        {items.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
        <div className="mobile-nav-tools"><LocaleSwitcher locale={locale} /><Link href={`${prefix}/account/login`} onClick={() => setOpen(false)}>{labels.account}</Link></div>
      </nav>
      <div className="header-actions">
        <Link className="icon-link desktop-account" href={`${prefix}/account/login`} aria-label={labels.account}><UserRound size={19} /></Link>
        <Link className="icon-link" href={`${prefix}/search`} aria-label={labels.search}><Search size={19} /></Link>
        <Link className="icon-link cart-link" href={`${prefix}/cart`} aria-label={`${labels.cart}${count ? ` (${count})` : ""}`}>
          <ShoppingBag size={19} /><span className="cart-count" aria-live="polite">{count}</span>
        </Link>
        <LocaleSwitcher locale={locale} />
        <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label={locale === "fa" ? (open ? "بستن فهرست" : "بازکردن فهرست") : (open ? "Close menu" : "Open menu")} aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
  </header>;
}
