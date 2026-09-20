import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Wordmark } from "./primitives";

export function AuthShell({
  sub,
  children,
  foot,
}: {
  sub: string;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div className="tactical-grid flex min-h-screen items-center justify-center bg-bg px-4 py-10 md:px-7">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full max-w-[420px] rounded-[8px] border border-wire bg-surface p-6"
      >
        <div className="text-center">
          <Link to="/" aria-label="Ipanema home">
            <Wordmark />
          </Link>
          <p className="mt-1.5 text-[13px] text-text-dim">{sub}</p>
        </div>
        <div className="mt-6 flex flex-col gap-4">{children}</div>
        {foot && <div className="mt-5 text-center text-[12.5px] text-text-dim">{foot}</div>}
      </motion.div>
    </div>
  );
}
