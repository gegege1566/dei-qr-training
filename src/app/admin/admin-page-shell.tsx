"use client";

import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={container}>
      <motion.div variants={fadeUp}>{children}</motion.div>
    </motion.div>
  );
}

export { container, fadeUp };
