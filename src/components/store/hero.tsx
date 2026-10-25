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
  const y = useTransform(scrollYProgress, [0, 1], [0, 52]);
  const x = useTransform(scrollYProgress, [0, 1], [0, locale === "fa" ? -14 : 14]);
  const enterX = locale === "fa" ? 40 : -40;
  return <section className="hero" ref={ref}>
    <motion.div className="hero-image-wrap" style={reduceMotion ? undefined : { y, x }} initial={reduceMotion ? false : { opacity: 0.35, scale: 1.11 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.35, ease: [0.2, 0.75, 0.15, 1] }}>
      <Image src="/images/hero/ninja-hero.webp" alt={locale === "fa" ? "نینجای زره‌پوش در فضای تاریک" : "Armored ninja in a dark studio"} fill priority sizes="100vw" className="hero-image" quality={88} />
    </motion.div>
    <div className="hero-overlay" aria-hidden="true" />
    <div className="hero-cinematic-light" aria-hidden="true" />
    <motion.div className="hero-scan" aria-hidden="true" initial={reduceMotion ? false : { opacity: 0 }} animate={reduceMotion ? undefined : { opacity: [0, 0.65, 0], y: [0, 260, 600] }} transition={{ duration: 2.2, delay: 0.3, ease: "easeInOut" }} />
    <div className="container hero-content">
      <motion.p className="eyebrow" initial={reduceMotion ? false : { opacity: 0, x: enterX }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.28, ease: "easeOut" }}><span className="eyebrow-line" />{eyebrow}</motion.p>
      <motion.h1 initial={reduceMotion ? false : { opacity: 0, x: enterX, y: 16, filter: "blur(8px)" }} animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, delay: 0.42, ease: [0.2, 0.75, 0.15, 1] }}>{title}</motion.h1>
      <motion.p className="hero-copy" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.68, ease: "easeOut" }}>{subtitle}</motion.p>
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.82, ease: "easeOut" }}>
        <Link className="button button-primary hero-cta" href={`/${locale}/shop`}>{cta}<span aria-hidden="true">↗</span></Link>
      </motion.div>
    </div>
    <motion.div className="hero-scroll-cue" aria-hidden="true" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: 0.6 }}><span />{locale === "fa" ? "ادامهٔ مسیر" : "SCROLL TO EXPLORE"}</motion.div>
    <div className="hero-caption" aria-hidden="true"><span>01 / 01</span><span>SENSI SPORT</span></div>
  </section>;
}
