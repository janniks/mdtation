"use client";
import { motion } from "motion/react";

/** The four-word mantra in the footer, fading up once when it scrolls into view. */
export function Mantra() {
  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-center font-mono text-lg text-muted-foreground sm:text-xl"
    >
      read, breathe, comment, loop
    </motion.p>
  );
}
