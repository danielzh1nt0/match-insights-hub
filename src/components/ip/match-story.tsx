import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Check, Play, Share2, Shield, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import type { Finding, MatchData, MatchEvent } from "@/lib/match-data";
import { formatClock, matchTitle, type LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Tint = "neutral" | "good" | "warn" | "bad";
type Backdrop = "gradient" | "pitch" | "video";

type Action = { label: string; kind: "primary" | "secondary"; run: () => void; icon?: "play" | "share" | "check" };

type Slide = {
  id: string;
  backdrop: Backdrop;
  tint: Tint;
  tag: string;
  tagIcon?: "check" | "warn" | "play";
  headline: string;
  sub: string;
  metric?: { value: string; unit: string; target?: string };
  ticks?: { label: string }[];
  pitch?: "moment" | "missed";
  durationMs: number;
  end?: boolean;
};

const SCRIM: Record<Tint, string> = {
  neutral:
    "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.75) 100%)",
  good:
    "linear-gradient(180deg, rgba(6,78,59,0.5) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.2) 50%, rgba(6,78,59,0.85) 100%)",
  warn:
    "linear-gradient(180deg, rgba(120,53,15,0.5) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.2) 50%, rgba(120,53,15,0.85) 100%)",
  bad:
    "linear-gradient(180deg, rgba(127,29,29,0.5) 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.2) 50%, rgba(127,29,29,0.85) 100%)",
};

const TAG_STYLE: Record<Tint, string> = {
  neutral: "bg-[rgba(255,255,255,0.15)] border-[rgba(255,255,255,0.25)] text-[#ffffff]",
  good: "bg-[rgba(52,211,153,0.2)] border-[rgba(52,211,153,0.5)] text-[#a7f3d0]",
  warn: "bg-[rgba(245,158,11,0.2)] border-[rgba(245,158,11,0.5)] text-[#fcd34d]",
  bad: "bg-[rgba(239,68,68,0.2)] border-[rgba(239,68,68,0.5)] text-[#fca5a5]",
};

function meetsTarget(f: Finding) {
  return f.higherIsWorse ? f.value <= f.target : f.value >= f.target;
}

function gap(f: Finding) {
  return f.higherIsWorse ? f.value - f.target : f.target - f.value;
}

function marginLine(match: LibraryMatch) {
  const d = match.scoreA - match.scoreB;
  if (d === 0) return "Honours even";
  if (d > 1) return `A comfortable ${match.teamA} win`;
  if (d === 1) return `${match.teamA.split(" ").slice(-1)[0]} edged it`;
  return `${match.teamB} took it`;
}

function tickLabel(e: MatchEvent) {
  const who = e.player ? ` · ${e.player}` : "";
  const kind = e.kind === "goal" ? "Goal" : e.kind === "shot" ? "Shot" : "Set piece";
  return `${kind}${who} · ${formatClock(e.t)}`;
}

export function buildStorySlides(match: LibraryMatch, data: MatchData): Slide[] {
  const findings = data.findings;
  const good = findings.find(meetsTarget) ?? [...findings].sort((a, b) => gap(a) - gap(b))[0];
  const fix = [...findings].sort((a, b) => gap(b) - gap(a))[0];
  const moment =
    data.events.find((e) => e.kind === "goal") ??
    data.events.find((e) => e.kind === "shot") ??
    data.events[0];

  const ticks = data.events
    .filter((e) => e.kind === "goal" || e.kind === "shot" || e.kind === "set_piece")
    .slice(0, 4)
    .map((e) => ({ label: tickLabel(e) }));

  const slides: Slide[] = [
    {
      id: "score",
      backdrop: "gradient",
      tint: "neutral",
      tag: "The final score",
      headline: marginLine(match),
      sub: `${match.competition} · ${match.date}. ${match.summary.possession[0]}% of the ball and ${match.summary.shots[0]} shots.`,
      metric: { value: `${match.scoreA}\u2009:\u2009${match.scoreB}`, unit: "final" },
      ticks,
      durationMs: 8000,
    },
  ];

  if (good) {
    slides.push({
      id: "good",
      backdrop: "pitch",
      pitch: "moment",
      tint: "good",
      tag: "Keep doing this",
      tagIcon: "check",
      headline: good.headline,
      sub: good.interpretation,
      metric: {
        value: `${good.value}${good.unit === "%" ? "%" : ""}`,
        unit: good.unit === "%" ? "of the time" : good.unit,
        target: `Target ${good.target}${good.unit === "%" ? "%" : ""}`,
      },
      durationMs: 8000,
    });
  }

  if (fix && fix !== good) {
    slides.push({
      id: "fix",
      backdrop: "pitch",
      pitch: "missed",
      tint: "warn",
      tag: "Work on this",
      tagIcon: "warn",
      headline: fix.headline,
      sub: fix.interpretation,
      metric: {
        value: `${fix.value}${fix.unit === "%" ? "%" : ""}`,
        unit: fix.unit === "%" ? "of the time" : fix.unit,
        target: `Target ${fix.target}${fix.unit === "%" ? "%" : ""}`,
      },
      durationMs: 8000,
    });
  }

  slides.push({
    id: "moment",
    backdrop: "video",
    tint: "neutral",
    tag: moment?.kind === "goal" ? "The goal" : "The moment",
    tagIcon: "play",
    headline: moment?.player ? `${moment.player} makes it ${match.scoreA}–${match.scoreB}` : "The moment it turned",
    sub: moment?.note ?? "The passage the rest of the analysis keeps pointing back to.",
    metric: moment ? { value: formatClock(moment.t), unit: "on the clock" } : undefined,
    durationMs: 12000,
  });

  slides.push({
    id: "end",
    backdrop: "gradient",
    tint: "neutral",
    tag: "",
    headline: "Ready for Tuesday",
    sub: "Two findings are already turned into a session plan.",
    end: true,
    durationMs: 8000,
  });

  return slides.slice(0, 5);
}

export function MatchStory({
  matchId,
  match,
  data,
}: {
  matchId: string;
  match: LibraryMatch;
  data: MatchData;
}) {
  const navigate = useNavigate();
  const slides = useMemo(() => buildStorySlides(match, data), [match, data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const slide = slides[index]!;

  const close = useCallback(() => {
    void navigate({ to: "/match/$matchId/insights", params: { matchId } });
  }, [navigate, matchId]);

  const next = useCallback(() => {
    setProgress(0);
    setIndex((i) => {
      if (i >= slides.length - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [slides.length, close]);

  const prev = useCallback(() => {
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-advance
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let elapsed = (progressRef.current = 0);
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += dt;
        const pct = Math.min(1, elapsed / slide.durationMs);
        progressRef.current = pct;
        setProgress(pct);
        if (pct >= 1) {
          next();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, slide.durationMs, next]);

  const pausedRef = useRef(false);
  const progressRef = useRef(0);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, prev]);

  const actions = useMemo<Action[]>(() => {
    const watch = (t: number) => () =>
      void navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t } });
    if (slide.id === "score") {
      return [
        { label: "Full match", kind: "secondary", icon: "play", run: watch(0) },
        { label: "Next", kind: "primary", run: next },
      ];
    }
    if (slide.id === "good" || slide.id === "fix") {
      const f = data.findings.find((x) => x.headline === slide.headline);
      return [
        {
          label: slide.id === "fix" ? `See the ${f?.value ?? ""} moments`.trim() : "Watch the moments",
          kind: "secondary",
          icon: "play",
          run: () =>
            void navigate({
              to: "/match/$matchId/reel",
              params: { matchId },
            }),
        },
        { label: "Next", kind: "primary", run: next },
      ];
    }
    if (slide.id === "moment") {
      const t = data.events.find((e) => e.kind === "goal")?.t ?? 0;
      return [
        { label: "Replay in video", kind: "secondary", icon: "play", run: watch(t) },
        { label: "Next", kind: "primary", run: next },
      ];
    }
    return [
      {
        label: "Share this reel",
        kind: "secondary",
        icon: "share",
        run: () => {
          void navigator.clipboard
            ?.writeText(`${window.location.origin}/s/reel/${matchId}`)
            .then(() => toast.success("Share link copied"))
            .catch(() => toast.error("Couldn't copy the link"));
        },
      },
      {
        label: "Open the full analysis",
        kind: "primary",
        run: () => void navigate({ to: "/match/$matchId/insights", params: { matchId } }),
      },
    ];
  }, [slide, data, matchId, navigate, next]);

  // Tap / hold / swipe handling
  const gesture = useRef<{ t: number; y: number; hold?: ReturnType<typeof setTimeout> } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    const hold = setTimeout(() => setPaused(true), 220);
    gesture.current = { t: performance.now(), y: e.clientY, hold };
  };
  const onUp = (side: "left" | "right") => (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.hold);
    const held = performance.now() - g.t;
    const dy = e.clientY - g.y;
    setPaused(false);
    if (dy > 90) {
      close();
      return;
    }
    if (held >= 220) return; // it was a hold-to-pause, not a tap
    if (side === "right") next();
    else prev();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#000000]">
      <StoryBackdrop slide={slide} match={match} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: SCRIM[slide.tint] }}
      />

      {/* Progress bars */}
      <div className="relative z-10 flex gap-1 px-3 pt-3">
        {slides.map((s, i) => (
          <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-[rgba(255,255,255,0.25)]">
            <span
              className="block h-full rounded-[2px] bg-cream"
              style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
            />
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2.5 px-3.5 py-3">
        <span
          className="display-i grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-2 border-[rgba(255,255,255,0.9)] text-[11px] text-[#ffffff]"
          style={{ background: "var(--team-a)" }}
          aria-hidden="true"
        >
          {match.teamA.replace(/[^A-Za-zÀ-ÿ ]/g, "").trim()[0]?.toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold tracking-[0.01em] text-[#ffffff]">
            {matchTitle(match)}
          </span>
          <span
            aria-live="polite"
            className="block truncate text-[11px] font-medium text-[rgba(255,255,255,0.7)]"
          >
            {match.date} · {match.competition} · slide {index + 1} of {slides.length}
          </span>
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Close story"
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(0,0,0,0.4)] text-[#ffffff] backdrop-blur-md"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "relative z-[5] flex flex-1 flex-col px-5 pb-8 pt-5 text-[#ffffff]",
            slide.end ? "items-center justify-center gap-5 text-center" : "justify-end gap-5",
          )}
        >
          {slide.end ? (
            <EndCard actions={actions} data={data} />
          ) : (
            <>
              {slide.tag && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 self-start rounded-[20px] border px-3 py-[5px] text-[11px] font-bold uppercase tracking-[0.06em] backdrop-blur-md",
                    TAG_STYLE[slide.tint],
                  )}
                >
                  {slide.tagIcon === "check" && <Check size={14} aria-hidden="true" />}
                  {slide.tagIcon === "warn" && <TriangleAlert size={14} aria-hidden="true" />}
                  {slide.tagIcon === "play" && <Play size={14} aria-hidden="true" />}
                  {slide.tag}
                </span>
              )}
              <h1
                className="display-i text-[40px] leading-[1.05] text-[#ffffff]"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
              >
                {slide.headline}
              </h1>
              <p
                className="max-w-[320px] text-[14px] leading-[1.5] text-[rgba(255,255,255,0.92)]"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
              >
                {slide.sub}
              </p>
              {slide.ticks && slide.ticks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {slide.ticks.map((t) => (
                    <span
                      key={t.label}
                      className="num flex items-center gap-1.5 rounded-[8px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-2.5 py-[5px] text-[12px] text-[#ffffff] backdrop-blur-md"
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
              {slide.metric && (
                <div className="flex items-baseline gap-2.5">
                  <span
                    className="display-i text-[72px] leading-[0.9] text-cream"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {slide.metric.value}
                  </span>
                  <span className="display text-[20px] tracking-[0.04em] text-[rgba(255,255,255,0.75)]">
                    {slide.metric.unit}
                  </span>
                  {slide.metric.target && (
                    <span className="ml-auto text-[12px] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.6)]">
                      {slide.metric.target}
                    </span>
                  )}
                </div>
              )}
              <div className="relative z-20 mt-2 flex gap-2">
                {actions.map((a) => (
                  <StoryButton key={a.label} action={a} />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tap zones */}
      <button
        type="button"
        aria-label="Previous slide"
        onPointerDown={onDown}
        onPointerUp={onUp("left")}
        className="absolute bottom-0 left-0 top-[60px] z-[6] w-[30%]"
      />
      <button
        type="button"
        aria-label="Next slide"
        onPointerDown={onDown}
        onPointerUp={onUp("right")}
        className="absolute bottom-0 right-0 top-[60px] z-[6] w-[70%]"
      />
    </div>
  );
}

function StoryButton({ action }: { action: Action }) {
  return (
    <button
      type="button"
      onClick={action.run}
      className={cn(
        "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[12px] border-[1.5px] px-4 py-3 text-[13px] font-bold backdrop-blur-md",
        action.kind === "primary"
          ? "border-cream bg-cream text-[#111111]"
          : "border-[rgba(255,255,255,0.3)] bg-[rgba(0,0,0,0.4)] text-[#ffffff]",
      )}
    >
      {action.icon === "play" && <Play size={14} aria-hidden="true" />}
      {action.icon === "share" && <Share2 size={14} aria-hidden="true" />}
      {action.label}
    </button>
  );
}

function EndCard({ actions, data }: { actions: Action[]; data: MatchData }) {
  const stats = [
    { value: String(data.findings.length), label: "Findings" },
    { value: String(Math.min(2, data.clips.length)), label: "Reels" },
    { value: "1", label: "Session" },
  ];
  return (
    <>
      <span className="grid h-[72px] w-[72px] place-items-center rounded-[20px] border-[1.5px] border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.1)] backdrop-blur-md">
        <Shield size={32} strokeWidth={1.6} className="text-cream" aria-hidden="true" />
      </span>
      <h1 className="display-i text-[34px] leading-[1.05] text-cream">Ready for Tuesday</h1>
      <p className="max-w-[280px] text-[14px] leading-[1.55] text-[rgba(255,255,255,0.75)]">
        Two findings are already turned into a session plan.
      </p>
      <div className="grid w-full grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[12px] border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-2 py-3.5 backdrop-blur-md"
          >
            <div className="display-i text-[22px] leading-none text-cream">{s.value}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.7)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-20 mt-2 flex w-full flex-col gap-2">
        {[...actions].reverse().map((a) => (
          <StoryButton key={a.label} action={a} />
        ))}
      </div>
    </>
  );
}

function StoryBackdrop({ slide, match }: { slide: Slide; match: LibraryMatch }) {
  if (slide.backdrop === "gradient") {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0b0d10 0%, #14171c 100%)" }}
      />
    );
  }
  if (slide.backdrop === "video") {
    return (
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#0d1218]">
        <span
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.03) 40px 80px)",
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[rgba(255,255,255,0.15)]" />
        <span className="num absolute left-1/2 top-[calc(50%+80px)] -translate-x-1/2 text-[12px] text-[rgba(255,255,255,0.5)]">
          {match.teamA} · clip {formatClock(match.durationS)}
        </span>
      </span>
    );
  }
  return <StoryPitch variant={slide.pitch ?? "moment"} />;
}

function StoryPitch({ variant }: { variant: "moment" | "missed" }) {
  const dots = [
    [10, 50],
    [24, 22],
    [24, 42],
    [24, 60],
    [24, 80],
    [46, 30],
    [46, 52],
    [46, 74],
    [66, 26],
    [66, 52],
    [66, 78],
  ] as const;

  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #2d5c30 0%, #244a26 100%)" }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.3" fill="none">
          <rect x="5" y="6" width="90" height="88" />
          <line x1="50" y1="6" x2="50" y2="94" />
          <circle cx="50" cy="50" r="11" />
          <rect x="5" y="30" width="12" height="40" />
          <rect x="83" y="30" width="12" height="40" />
        </g>
        {variant === "missed" && (
          <>
            <line x1="46" y1="52" x2="72" y2="86" stroke="var(--team-a)" strokeWidth="0.9" />
            <line
              x1="46"
              y1="52"
              x2="80"
              y2="34"
              stroke="var(--quality-risky)"
              strokeWidth="0.9"
              strokeDasharray="3 2"
            />
            <circle
              cx="80"
              cy="34"
              r="4"
              fill="none"
              stroke="var(--quality-risky)"
              strokeWidth="0.7"
              strokeDasharray="2 2"
            />
          </>
        )}
      </svg>
      {dots.map(([x, y], i) => (
        <span
          key={`${x}-${y}`}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            background: i === 6 ? "var(--cream)" : "rgba(255,255,255,0.55)",
            boxShadow: i === 6 ? "0 0 0 3px rgba(237,230,214,0.25)" : "none",
          }}
        />
      ))}
    </span>
  );
}
