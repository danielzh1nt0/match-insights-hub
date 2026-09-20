import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Play, RotateCcw, Share2, Target, X } from "lucide-react";
import { toast } from "sonner";
import type { TeamKey } from "@/lib/match-analysis";
import type { RecapAnalysis } from "@/lib/recap-analysis";
import { crestForTeam } from "@/lib/team-crests";
import { formatClock, matchTitle, type LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Chapter = "score" | "strength" | "player" | "improve" | "verdict";
type Action = { label: string; kind: "primary" | "secondary"; run: () => void; icon?: "play" | "share" | "session" };
type StorySlide = { id: Chapter; durationMs: number; moment?: number };
export type StoryShape = {
  dots: { x: number; y: number; team: TeamKey }[];
  carrier?: { x: number; y: number };
  target?: { x: number; y: number };
};

const SLIDES: StorySlide[] = [
  { id: "score", durationMs: 7000 },
  { id: "strength", durationMs: 7500 },
  { id: "player", durationMs: 7500 },
  { id: "improve", durationMs: 9000 },
  { id: "verdict", durationMs: 8000 },
];

export function MatchStory({
  matchId,
  match,
  recap,
  shape,
}: {
  matchId: string;
  match: LibraryMatch;
  recap: RecapAnalysis;
  shape?: StoryShape | null;
}) {
  const navigate = useNavigate();
  const slides = useMemo(
    () => SLIDES.map((slide) => (slide.id === "improve" ? { ...slide, moment: recap.firstMoment ?? undefined } : slide)),
    [recap.firstMoment],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const slide = slides[index] ?? slides[0]!;

  const close = useCallback(() => {
    void navigate({ to: "/match/$matchId/insights", params: { matchId } });
  }, [navigate, matchId]);
  const next = useCallback(() => {
    setProgress(0);
    if (index >= slides.length - 1) {
      close();
      return;
    }
    setIndex(index + 1);
  }, [index, slides.length, close]);
  const prev = useCallback(() => {
    setProgress(0);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += delta;
        const percent = Math.min(1, elapsed / slide.durationMs);
        setProgress(percent);
        if (percent >= 1) {
          next();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, slide.durationMs, next]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, prev]);

  const watch = useCallback(
    (t: number) => void navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t } }),
    [navigate, matchId],
  );
  const actions = useMemo<Action[]>(() => {
    if (slide.id === "score") return [
      { label: "Watch match", kind: "secondary", icon: "play", run: () => watch(0) },
      { label: "See the story", kind: "primary", run: next },
    ];
    if (slide.id === "strength" || slide.id === "player") return [
      { label: "Next chapter", kind: "primary", run: next },
    ];
    if (slide.id === "improve") return [
      { label: `See ${recap.improvement?.events ?? 0} moments`, kind: "secondary", icon: "play", run: () => watch(recap.firstMoment ?? 0) },
      { label: "Build the fix", kind: "primary", icon: "session", run: () => void navigate({ to: "/match/$matchId/session", params: { matchId }, search: recap.improvement ? { finding: recap.improvement.id } : {} }) },
    ];
    return [
      { label: "Share recap", kind: "secondary", icon: "share", run: () => {
        void navigator.clipboard?.writeText(`${window.location.origin}/s/reel/${matchId}`)
          .then(() => toast.success("Share link copied"))
          .catch(() => toast.error("Couldn't copy the link"));
      } },
      { label: "Open analysis", kind: "primary", run: close },
    ];
  }, [slide.id, recap, watch, next, navigate, matchId, close]);

  const gesture = useRef<{ started: number; y: number; hold?: ReturnType<typeof setTimeout> } | null>(null);
  const onDown = (event: ReactPointerEvent) => {
    const hold = setTimeout(() => setPaused(true), 220);
    gesture.current = { started: performance.now(), y: event.clientY, hold };
  };
  const onUp = (side: "left" | "right") => (event: ReactPointerEvent) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    clearTimeout(start.hold);
    const held = performance.now() - start.started;
    const vertical = event.clientY - start.y;
    setPaused(false);
    if (vertical > 90) close();
    else if (held < 220) side === "right" ? next() : prev();
  };

  const storyStyle = {
    "--story-own": recap.ownColour,
    "--story-other": recap.otherColour,
  } as CSSProperties;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-story-ink text-story-paper" style={storyStyle}>
      <StoryBackdrop chapter={slide.id} shape={shape ?? null} />
      <div className="absolute inset-0 z-10 flex flex-col px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))] sm:px-6">
        <div className="flex gap-1" aria-label={`Slide ${index + 1} of ${slides.length}`}>
          {slides.map((item, itemIndex) => (
            <span key={item.id} className="h-1 flex-1 overflow-hidden bg-story-paper/20">
              <span className="block h-full bg-story-paper" style={{ width: itemIndex < index ? "100%" : itemIndex === index ? `${progress * 100}%` : "0%" }} />
            </span>
          ))}
        </div>
        <header className="mt-3 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[10px] font-black uppercase text-story-paper/75">
            {matchTitle(match)} · {match.competition}
          </span>
          <span className="num text-[10px] text-story-paper/55">0{index + 1}/05</span>
          <button type="button" onClick={close} aria-label="Close recap" className="tap grid h-9 w-9 place-items-center rounded-full border border-story-paper/25 bg-story-ink/45 backdrop-blur-md">
            <X size={15} aria-hidden="true" />
          </button>
        </header>
        <AnimatePresence mode="wait">
          <motion.section key={slide.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: "easeOut" }} className="relative z-20 flex min-h-0 flex-1 flex-col">
            <ChapterContent chapter={slide.id} match={match} recap={recap} shape={shape ?? null} />
            <div className="relative z-30 mt-auto flex gap-2 pt-4">
              {actions.map((action) => <StoryButton key={action.label} action={action} />)}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
      <button type="button" aria-label="Previous slide" onPointerDown={onDown} onPointerUp={onUp("left")} className="absolute bottom-16 left-0 top-16 z-[15] w-[28%]" />
      <button type="button" aria-label="Next slide" onPointerDown={onDown} onPointerUp={onUp("right")} className="absolute bottom-16 right-0 top-16 z-[15] w-[72%]" />
    </main>
  );
}

function ChapterContent({ chapter, match, recap, shape }: { chapter: Chapter; match: LibraryMatch; recap: RecapAnalysis; shape: StoryShape | null }) {
  if (chapter === "score") return <ScoreChapter match={match} recap={recap} />;
  if (chapter === "strength") return <StrengthChapter recap={recap} />;
  if (chapter === "player") return <PlayerChapter recap={recap} />;
  if (chapter === "improve") return <ImproveChapter recap={recap} shape={shape} />;
  return <VerdictChapter recap={recap} />;
}

function Kicker({ children, tone = "paper" }: { children: ReactNode; tone?: "paper" | "own" }) {
  return <span className={cn("inline-flex self-start px-2.5 py-1 text-[10px] font-black uppercase", tone === "own" ? "bg-story-own text-story-ink" : "bg-story-paper text-story-ink")}>{children}</span>;
}

function ScoreChapter({ match, recap }: { match: LibraryMatch; recap: RecapAnalysis }) {
  const crestA = crestForTeam(match.teamA);
  const crestB = crestForTeam(match.teamB);
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-2 text-center">
      <Kicker>{match.date} · final</Kicker>
      <h1 className="display-i mt-3 text-[44px] leading-[0.84] sm:text-[64px]">The game<br />in one frame</h1>
      <div className="relative mt-7 flex w-full max-w-[520px] items-center justify-between px-2 sm:px-8">
        <Crest name={match.teamA} {...(crestA ? { src: crestA } : {})} colour="var(--story-own)" />
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="display-i whitespace-nowrap text-[74px] leading-none drop-shadow-story sm:text-[108px]">{match.scoreA}:{match.scoreB}</div>
          <span className="mt-1 inline-block bg-story-paper px-3 py-1 text-[9px] font-black uppercase text-story-ink">Full time</span>
        </div>
        <Crest name={match.teamB} {...(crestB ? { src: crestB } : {})} colour="var(--story-other)" />
      </div>
      <div className="mt-8 grid w-full max-w-[520px] grid-cols-3 border-y border-story-paper/25 bg-story-ink/55 py-3 backdrop-blur-md">
        <MiniStat value={`${match.summary.possession[0]}–${match.summary.possession[1]}`} label="possession" />
        <MiniStat value={`${recap.turnoversLost}–${recap.turnoversWon}`} label="lost / won" />
        <MiniStat value={`${match.summary.shots[0]}–${match.summary.shots[1]}`} label="shots" />
      </div>
    </div>
  );
}

function StrengthChapter({ recap }: { recap: RecapAnalysis }) {
  const total = Math.max(recap.strength.value + recap.strength.other, 1);
  const ownWidth = `${Math.max(8, (recap.strength.value / total) * 100)}%`;
  return (
    <div className="flex flex-1 flex-col justify-center pb-3">
      <Kicker tone="own">Where {recap.ownName} excelled</Kicker>
      <p className="display-i mt-4 text-[64px] leading-[0.82] text-story-own sm:text-[90px]">{recap.strength.value}{recap.strength.unit}</p>
      <h1 className="display-i mt-3 max-w-[620px] text-[38px] leading-[0.92] sm:text-[58px]">{recap.strength.headline}</h1>
      <p className="mt-3 max-w-[520px] text-[13px] font-semibold leading-relaxed text-story-paper/75 sm:text-[16px]">{recap.strength.explanation}</p>
      <div className="mt-7 max-w-[620px] border-y border-story-paper/25 bg-story-ink/60 p-4 backdrop-blur-md">
        <div className="flex justify-between text-[10px] font-black uppercase">
          <span>{recap.ownName} · {recap.strength.value}{recap.strength.unit}</span>
          <span className="text-story-paper/60">{recap.otherName} · {recap.strength.other}{recap.strength.unit}</span>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden bg-story-paper/15">
          <span className="h-full bg-story-own" style={{ width: ownWidth }} />
          <span className="h-full flex-1 bg-story-other" />
        </div>
        <p className="mt-2 text-[10px] uppercase text-story-paper/50">{recap.strength.label} · direct match comparison</p>
      </div>
    </div>
  );
}

function PlayerChapter({ recap }: { recap: RecapAnalysis }) {
  const player = recap.standout;
  return (
    <div className="flex flex-1 flex-col justify-center pb-3">
      <Kicker>Who excelled — and why</Kicker>
      {player ? (
        <>
          <div className="mt-5 flex items-end gap-4">
            <span className="display-i grid h-28 w-28 shrink-0 place-items-center rounded-full border-[7px] border-story-own bg-story-ink text-[62px] text-story-own shadow-story">{player.id}</span>
            <div className="pb-2">
              <p className="text-[10px] font-black uppercase text-story-own">Highest all-round involvement</p>
              <h1 className="display-i mt-1 text-[42px] leading-[0.88] sm:text-[62px]">{player.title}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-[560px] text-[13px] leading-relaxed text-story-paper/75 sm:text-[16px]">Names are not in the tracking file, so the recap uses the player’s tracked shirt number rather than inventing one.</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {player.reasons.map((reason) => <MiniStat key={reason.label} value={reason.value} label={reason.label} strong />)}
          </div>
          <div className="mt-4 border-l-4 border-story-own bg-story-ink/65 p-4 text-[12px] font-semibold leading-relaxed backdrop-blur-md">
            Led the team’s combined involvement ranking through touches, completed passes and distance covered.
          </div>
        </>
      ) : (
        <h1 className="display-i mt-5 text-[42px]">No player rows were supplied</h1>
      )}
    </div>
  );
}

function ImproveChapter({ recap, shape }: { recap: RecapAnalysis; shape: StoryShape | null }) {
  const finding = recap.improvement;
  return (
    <div className="flex flex-1 flex-col justify-center pb-3">
      <Kicker>Biggest improvement area</Kicker>
      <div className="mt-4 grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-[1.05fr_.95fr] sm:items-center">
        <div>
          <p className="display-i text-[56px] leading-none text-story-own">{finding ? `${finding.value}${finding.unit === "%" ? "%" : ""}` : "—"}</p>
          <h1 className="display-i mt-2 text-[34px] leading-[0.92] sm:text-[48px]">{finding?.headline ?? "No improvement rule fired"}</h1>
          <p className="mt-3 text-[12px] leading-relaxed text-story-paper/75 sm:text-[15px]">{finding?.interpretation ?? `${recap.ownName} met every configured target in this match.`}</p>
          {finding && <div className="mt-3 flex items-center gap-3 text-[10px] font-black uppercase"><span className="bg-story-paper px-2 py-1 text-story-ink">Target {finding.target}{finding.unit === "%" ? "%" : ` ${finding.unit}`}</span><span>{finding.events} real moments</span></div>}
        </div>
        <TacticalMoment shape={shape} colour={recap.ownColour} moment={recap.firstMoment} />
      </div>
    </div>
  );
}

function VerdictChapter({ recap }: { recap: RecapAnalysis }) {
  return (
    <div className="flex flex-1 flex-col justify-center pb-3">
      <Kicker tone="own">The coach’s page</Kicker>
      <h1 className="display-i mt-4 text-[48px] leading-[0.86] sm:text-[70px]">Keep it.<br />Fix it.<br /><span className="text-story-own">Train it.</span></h1>
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <VerdictItem icon={<Check size={16} />} label="Keep" value={recap.strength.headline} />
        <VerdictItem icon={<RotateCcw size={16} />} label="Improve" value={recap.improvement?.headline ?? "Maintain every target"} />
        <VerdictItem icon={<Target size={16} />} label="Next session" value={recap.improvement ? `Train the ${recap.improvement.events} moments behind the finding` : "Reinforce the strongest match habit"} />
      </div>
      <p className="mt-5 max-w-[560px] border-t border-story-paper/20 pt-4 text-[11px] leading-relaxed text-story-paper/60">Built only from this match: {recap.eventCount} team events, the tracking frames, player rows and your saved targets.</p>
    </div>
  );
}

function Crest({ name, src, colour }: { name: string; src?: string; colour: string }) {
  return <div className="relative z-10 flex w-[88px] flex-col items-center sm:w-[130px]">
    <span className="grid h-[76px] w-[76px] place-items-center rounded-full border-[5px] bg-story-paper shadow-story sm:h-[106px] sm:w-[106px]" style={{ borderColor: colour }}>
      {src ? <img src={src} alt={`${name} crest`} className="h-[86%] w-[86%] object-contain" /> : <span className="display-i text-[24px] text-story-ink">{name.slice(0, 3)}</span>}
    </span>
    <span className="mt-2 max-w-full truncate bg-story-ink px-2 py-1 text-[9px] font-black uppercase" style={{ color: colour }}>{name}</span>
  </div>;
}

function MiniStat({ value, label, strong = false }: { value: string; label: string; strong?: boolean }) {
  return <div className={cn("px-2 text-center", strong && "border border-story-paper/15 bg-story-ink/60 py-4 backdrop-blur-md")}><div className="display-i text-[22px] leading-none sm:text-[28px]">{value}</div><div className="mt-1 text-[8px] font-black uppercase text-story-paper/55 sm:text-[10px]">{label}</div></div>;
}

function VerdictItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="border-l-4 border-story-own bg-story-ink/65 p-3 backdrop-blur-md"><div className="flex items-center gap-2 text-story-own">{icon}<span className="text-[9px] font-black uppercase">{label}</span></div><p className="display mt-2 text-[15px] leading-tight">{value}</p></div>;
}

function TacticalMoment({ shape, colour, moment }: { shape: StoryShape | null; colour: string; moment: number | null }) {
  return <div className="relative aspect-[16/10] overflow-hidden border border-story-paper/25 bg-pitch-top shadow-story">
    <svg viewBox="0 0 100 62.5" className="absolute inset-0 h-full w-full" aria-label="Actual player positions at the first finding moment" role="img">
      <g fill="none" stroke="var(--pitch-line)" strokeWidth="0.45"><rect x="3" y="3" width="94" height="56.5"/><line x1="50" y1="3" x2="50" y2="59.5"/><circle cx="50" cy="31.25" r="8"/><rect x="3" y="19" width="14" height="24"/><rect x="83" y="19" width="14" height="24"/></g>
      {shape?.carrier && shape.target && <line x1={shape.carrier.x} y1={shape.carrier.y * .625} x2={shape.target.x} y2={shape.target.y * .625} stroke="var(--cream)" strokeWidth="1" strokeDasharray="3 2" />}
      {(shape?.dots ?? []).map((dot, index) => <circle key={`${dot.x}-${dot.y}-${index}`} cx={dot.x} cy={dot.y * .625} r="1.7" fill={dot.team === "A" ? colour : "var(--story-other)"} stroke="var(--story-paper)" strokeWidth=".35" />)}
    </svg>
    <span className="num absolute bottom-2 left-2 bg-story-ink/75 px-2 py-1 text-[10px]">{moment == null ? "No timestamp" : `${formatClock(moment)} · actual frame`}</span>
  </div>;
}

function StoryBackdrop({ chapter, shape }: { chapter: Chapter; shape: StoryShape | null }) {
  return <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-story-ink">
    <div className={cn("absolute -left-[24%] -top-[10%] h-[120%] w-[70%] -skew-x-12 bg-story-own transition-transform", chapter === "strength" && "w-[82%]", chapter === "improve" && "w-[42%]")} />
    <div className={cn("absolute -right-[24%] -top-[10%] h-[120%] w-[70%] -skew-x-12 bg-story-other", chapter === "player" && "opacity-25", chapter === "strength" && "w-[36%] opacity-70", chapter === "improve" && "w-[35%] opacity-25", chapter === "verdict" && "w-[30%]")} />
    <div className="absolute inset-0 bg-story-scrim" />
    <div className="display-i absolute -bottom-8 -right-5 rotate-[-8deg] text-[110px] leading-none text-story-paper/[0.035] sm:text-[180px]">{chapter === "score" ? "MATCH" : chapter === "player" ? "PLAYER" : chapter === "improve" ? "FIX" : "IPANEMA"}</div>
    {chapter === "improve" && shape && <div className="absolute inset-0 opacity-[0.08]"><TacticalMoment shape={shape} colour="var(--story-own)" moment={null} /></div>}
  </div>;
}

function StoryButton({ action }: { action: Action }) {
  return <button type="button" onClick={action.run} className={cn("tap relative z-30 flex min-h-12 flex-1 items-center justify-center gap-2 border px-3 text-[11px] font-black uppercase backdrop-blur-md", action.kind === "primary" ? "border-story-paper bg-story-paper text-story-ink" : "border-story-paper/40 bg-story-ink/55 text-story-paper")}>
    {action.icon === "play" && <Play size={14} aria-hidden="true" />}{action.icon === "share" && <Share2 size={14} aria-hidden="true" />}{action.icon === "session" && <ArrowRight size={14} aria-hidden="true" />}{action.label}
  </button>;
}
