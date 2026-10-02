import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GhostButton, PrimaryButton, Wordmark } from "@/components/ip/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Ipanema" },
      { name: "description", content: "What Ipanema does with your match, in five screens." },
    ],
  }),
  component: Welcome,
});

/** Seen once, never again. Cosmetic, so a cleared browser just shows it twice. */
const SEEN = "ipanema-welcome-seen";

type Slide = { kicker: string; title: string; body: string; art: () => ReactElement };

const SLIDES: Slide[] = [
  {
    kicker: "After every match",
    title: "The match, read back to you",
    body: "Upload the video. You get a five-slide recap of what happened — the score, what worked, who stood out and the one thing to fix.",
    art: StoryArt,
  },
  {
    kicker: "The one thing",
    title: "One priority, not forty numbers",
    body: "Ipanema measures your match against the targets you set, and leads with whichever one you missed by the most. Everything else waits its turn.",
    art: PriorityArt,
  },
  {
    kicker: "The evidence",
    title: "Every claim has clips behind it",
    body: "Each of the four moments of the game shows its number, where on the pitch it happened, and the moments you can watch to check it yourself.",
    art: EvidenceArt,
  },
  {
    kicker: "Tuesday",
    title: "The finding becomes a session",
    body: "The thing to fix turns into a training plan you can take to the pitch, built from the moments it came from.",
    art: SessionArt,
  },
  {
    kicker: "What we will not do",
    title: "Where the file does not say, neither do we",
    body: "Nothing here is estimated or filled in. If your match file cannot support a number, Ipanema shows you that instead of guessing.",
    art: HonestyArt,
  },
];

function Welcome() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  const done = useCallback(() => {
    try {
      window.localStorage.setItem(SEEN, "1");
    } catch {
      /* private mode — they may see this once more */
    }
    void navigate({ to: "/library", replace: true });
  }, [navigate]);

  const next = useCallback(() => (last ? done() : setIndex((i) => i + 1)), [last, done]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "Escape") done();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, done]);

  const Art = slide.art;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <Wordmark size="sm" />
        <GhostButton className="h-11 px-3 text-[12.5px]" onClick={done}>
          Skip
        </GhostButton>
      </header>

      <div className="flex gap-1.5 px-5 md:px-8" role="group" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}: ${s.title}`}
            aria-current={i === index}
            className="group flex-1 py-3"
          >
            <span className={cn("block h-[3px] rounded-full transition-colors", i <= index ? "bg-cream" : "bg-wire")} />
          </button>
        ))}
      </div>

      <main className="flex flex-1 items-center justify-center px-5 py-4 md:px-8">
        <div className="w-full max-w-[880px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.title}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              {...(reduced ? {} : { exit: { opacity: 0, y: -8 } })}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="grid items-center gap-7 md:grid-cols-2 md:gap-12"
            >
              <div className="order-2 md:order-1">
                <p className="display text-[10.5px] uppercase tracking-[0.1em] text-text-faint">{slide.kicker}</p>
                <h1 className="display-i mt-2 text-[clamp(28px,7vw,42px)] uppercase leading-[0.98] text-cream">
                  {slide.title}
                </h1>
                <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-text-dim">{slide.body}</p>
              </div>
              <div className="order-1 md:order-2">
                <Art />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="sticky bottom-0 flex items-center gap-3 border-t border-wire-2 bg-bg px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-8">
        <GhostButton
          className={cn("h-12 px-4", index === 0 && "pointer-events-none opacity-0")}
          onClick={prev}
          aria-hidden={index === 0}
        >
          Back
        </GhostButton>
        <span className="flex-1" />
        <PrimaryButton className="h-12 min-w-[150px]" onClick={next}>
          {last ? "Open your library" : "Next"}
        </PrimaryButton>
      </footer>
    </div>
  );
}

/* ---------- the art. Illustrative, and none of it claims to be a real match ---------- */

function Board({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      className="relative overflow-hidden border border-wire bg-pitch-insight"
      style={{ aspectRatio: "3 / 2" }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 100 66" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <rect x="4" y="4" width="92" height="58" rx="1" fill="none" stroke="var(--cream)" strokeOpacity=".22" />
        <line x1="50" x2="50" y1="4" y2="62" stroke="var(--cream)" strokeOpacity=".22" />
        <circle cx="50" cy="33" r="7" fill="none" stroke="var(--cream)" strokeOpacity=".22" />
        {children}
      </svg>
    </div>
  );
}

function StoryArt() {
  return (
    <Board label="A five-slide recap">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={12 + i * 15.5}
          y={20}
          width="12"
          height="26"
          rx="2"
          fill="var(--cream)"
          fillOpacity={i === 0 ? 0.9 : 0.16}
          stroke="var(--cream)"
          strokeOpacity=".25"
          strokeWidth=".5"
        />
      ))}
    </Board>
  );
}

function PriorityArt() {
  return (
    <Board label="One priority above the rest">
      <rect x="12" y="14" width="76" height="13" rx="2" fill="var(--reaction-bad)" fillOpacity=".22" stroke="var(--reaction-bad)" strokeOpacity=".7" strokeWidth=".6" />
      <text x="17" y="22.5" fill="var(--cream)" fontSize="5" fontFamily="var(--font-display)" fontStyle="italic" fontWeight="800">FIX FIRST</text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x="12" y={32 + i * 10} width="76" height="7" rx="1.5" fill="var(--cream)" fillOpacity=".07" stroke="var(--cream)" strokeOpacity=".14" strokeWidth=".4" />
      ))}
    </Board>
  );
}

function EvidenceArt() {
  const dots: [number, number][] = [[26, 20], [34, 40], [21, 50], [43, 30], [30, 26], [52, 46]];
  return (
    <Board label="Losses on the pitch, with clips behind them">
      {dots.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.4" fill="none" stroke={i < 2 ? "var(--reaction-good)" : "var(--reaction-bad)"} strokeOpacity=".5" strokeWidth=".6" />
          <circle cx={x} cy={y} r="1.5" fill={i < 2 ? "var(--reaction-good)" : "var(--reaction-bad)"} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={64 + i * 10} y="44" width="8" height="6" rx="1" fill="var(--cream)" fillOpacity=".12" stroke="var(--cream)" strokeOpacity=".22" strokeWidth=".4" />
      ))}
    </Board>
  );
}

function SessionArt() {
  return (
    <Board label="A training drill built from the finding">
      <circle cx="30" cy="22" r="2.4" fill="var(--team-a)" />
      <circle cx="30" cy="44" r="2.4" fill="var(--team-a)" />
      <circle cx="58" cy="33" r="2.4" fill="var(--team-b)" />
      <path d="M33 23 L55 31" stroke="var(--cream)" strokeWidth=".8" strokeDasharray="2.5 2" strokeLinecap="round" />
      <path d="M33 43 L55 35" stroke="var(--cream)" strokeWidth=".8" strokeDasharray="2.5 2" strokeLinecap="round" />
      <rect x="70" y="24" width="16" height="18" rx="2" fill="var(--cream)" fillOpacity=".1" stroke="var(--cream)" strokeOpacity=".3" strokeWidth=".5" />
      <text x="78" y="35" textAnchor="middle" fill="var(--cream)" fillOpacity=".65" fontSize="5.5" fontFamily="var(--font-display)" fontStyle="italic" fontWeight="800">TUE</text>
    </Board>
  );
}

function HonestyArt() {
  return (
    <Board label="A withheld number, shown as withheld">
      <rect x="20" y="24" width="60" height="18" rx="2" fill="var(--ink)" fillOpacity=".6" stroke="var(--cream)" strokeOpacity=".22" strokeWidth=".5" strokeDasharray="3 2" />
      <text x="50" y="33.5" textAnchor="middle" dominantBaseline="central" fill="var(--cream)" fillOpacity=".6" fontSize="5" fontFamily="var(--font-body)">
        Not enough tracked data
      </text>
    </Board>
  );
}
