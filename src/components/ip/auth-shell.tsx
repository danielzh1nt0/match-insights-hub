import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Wordmark } from "./primitives";

/**
 * The surface every signed-out screen sits on.
 *
 * Two columns on a desktop: the brand side carries the pitch, the wordmark and
 * the promise; the form sits on the right at a comfortable reading width. One
 * column on a phone, with the pitch reduced to a strip so the form stays above
 * the fold.
 *
 * The pitch markings are the same idiom as the diagrams inside the product —
 * cream lines on the dark green board — so the first screen looks like the
 * thing it is signing you into.
 */
export function AuthShell({
  title,
  sub,
  children,
  foot,
  note,
}: {
  /** Display headline on the brand side. Falls back to the wordmark alone. */
  title?: string;
  sub: string;
  children: ReactNode;
  foot?: ReactNode;
  /** Small print under the form, for legal or reassurance. */
  note?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <aside className="relative flex shrink-0 flex-col justify-between overflow-hidden border-b border-wire bg-pitch-insight px-6 pb-6 pt-[max(20px,env(safe-area-inset-top))] md:w-[46%] md:max-w-[560px] md:border-b-0 md:border-r md:px-10 md:pb-10 md:pt-10">
        <PitchMarkings />
        <div className="relative">
          <Link to="/" aria-label="Ipanema home" className="inline-block">
            <Wordmark />
          </Link>
        </div>
        <div className="relative mt-6 md:mt-0">
          {title && (
            <h1 className="display-i text-[clamp(30px,8vw,46px)] uppercase leading-[0.95] text-cream md:text-[46px]">
              {title}
            </h1>
          )}
          <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-cream/70 md:text-[15px]">
            {sub}
          </p>
        </div>
        <p className="relative mt-6 hidden text-[11.5px] leading-relaxed text-cream/60 md:block">
          Every number in Ipanema comes from your own match file. Where the file does not say,
          neither do we.
        </p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:px-10 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          <div className="flex flex-col gap-4">{children}</div>
          {note && (
            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-text-faint">{note}</p>
          )}
          {foot && <div className="mt-6 text-center text-[12.5px] text-text-dim">{foot}</div>}
        </motion.div>
      </main>
    </div>
  );
}

/** A pitch filling the panel, cropped at the edges. Decorative — it carries no data. */
function PitchMarkings() {
  return (
    <svg
      viewBox="0 0 200 128"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      stroke="var(--cream)"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="6" y="6" width="188" height="116" strokeOpacity=".2" strokeWidth=".7" />
      <line x1="100" y1="6" x2="100" y2="122" strokeOpacity=".2" strokeWidth=".7" />
      <circle cx="100" cy="64" r="22" strokeOpacity=".2" strokeWidth=".7" />
      <circle cx="100" cy="64" r="1.6" fill="var(--cream)" fillOpacity=".28" stroke="none" />
      <rect x="6" y="34" width="32" height="60" strokeOpacity=".14" strokeWidth=".7" />
      <rect x="6" y="50" width="13" height="28" strokeOpacity=".14" strokeWidth=".7" />
      <rect x="162" y="34" width="32" height="60" strokeOpacity=".14" strokeWidth=".7" />
      <rect x="181" y="50" width="13" height="28" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M38 52 A 14 14 0 0 1 38 76" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M162 52 A 14 14 0 0 0 162 76" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M6 13 A 7 7 0 0 0 13 6" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M194 13 A 7 7 0 0 1 187 6" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M6 115 A 7 7 0 0 1 13 122" strokeOpacity=".14" strokeWidth=".7" />
      <path d="M194 115 A 7 7 0 0 0 187 122" strokeOpacity=".14" strokeWidth=".7" />
    </svg>
  );
}
