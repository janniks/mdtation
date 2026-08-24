"use client";
import { motion } from "motion/react";
import { Zen } from "./zen";

const WORDS = ["read,", "breathe,", "comment,", "loop"];

/** The four-word mantra in the footer: each word fades up in turn once it scrolls into view, then the logo tile. */
export function Mantra() {
  return (
    <motion.p
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ staggerChildren: 0.35 }}
      className="flex flex-wrap items-center justify-center gap-x-[0.5em] gap-y-2 font-mono text-lg text-muted-foreground sm:text-xl"
    >
      {WORDS.map((w) => (
        <motion.span
          key={w}
          variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {w}
        </motion.span>
      ))}
      <motion.span
        variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="ml-[0.25em] inline-flex rotate-3 size-7 items-center justify-center rounded-md border bg-card text-base leading-none shadow-xs"
        aria-hidden
      >
        <Zen />
      </motion.span>
    </motion.p>
  );
}
