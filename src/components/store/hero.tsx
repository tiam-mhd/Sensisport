"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { Locale } from "@/i18n/config";

export function Hero({ locale, eyebrow, title, subtitle, cta }: { locale: Locale; eyebrow: string; title: string; subtitle: string; cta: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 36]);
  return <section className="hero" ref={ref}>
    <motion.div className="hero-image-wrap" style={reduceMotion ? undefined : { y }}>
      <Image src="/images/hero/ninja-hero.png" alt={locale === "fa" ? "نینجای زره‌پوش در فضای تاریک" : "Armored ninja in a dark studio"} fill priority sizes="100vw" className="hero-image" quality={88} />
    </motion.div>
    <div className="hero-overlay" aria-hidden="true" />
    <motion.div className="container hero-content" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
      <p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p>
      <h1>{title}</h1>
      <p className="hero-copy">{subtitle}</p>
      <Link className="button button-primary hero-cta" href={`/${locale}/shop`}>{cta}<span aria-hidden="true">↗</span></Link>
    </motion.div>
    <div className="hero-caption" aria-hidden="true"><span>01 / 01</span><span>SENSI SPORT</span></div>
  </section>;
}
