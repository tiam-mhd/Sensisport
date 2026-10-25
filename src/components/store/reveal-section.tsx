"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function RevealSection({ className, children }: { className: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return <motion.section
    className={className}
    initial={reduceMotion ? false : { opacity: 0, y: 36, scale: 0.992 }}
    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.78, ease: [0.22, 0.8, 0.2, 1] }}
  >{children}</motion.section>;
}
