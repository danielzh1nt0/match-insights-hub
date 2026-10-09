import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Crest } from "@/components/ip/touchline";
import { ClipThumb } from "@/components/ip/clip-thumb";
import { MatchFlow } from "@/components/insights/MatchFlow";
import { PressureArt, type Loss } from "@/components/visuals/PitchArt";
import type { TeamIdentity } from "@/components/team/TeamToken";
import { useClipPosters } from "@/hooks/use-clip-posters";
import type { MatchModel } from "@/hooks/use-match-model";
import type { LibraryMatch } from "@/lib/sample-data";
import { STORY_CHAPTERS, chapterIndex, type ChapterId } from "@/lib/story-chapters";
import { cn } from "@/lib/utils";

function clock(seconds: number) {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  const s = Math.floor(Math.max(seconds, 0) % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The match as five chapters, for showing a squad.
 *
 * It is the same debrief the Insights page gives, told at arm's length: the
 * result, what held up, when it turned, the one thing to fix, and Tuesday.
 * Every figure on it comes from the shared match model, so a chapter cannot
 * celebrate something the page does not — which is what went wrong when the
 * story worked its own statistics out separately.
 *
 * Visually it is the app, not a second design: the same ground, the same
 * hairlines, the same scoreboard italic for figures and clipboard grotesque
 * for prose. What makes it a story is the scale and the pacing, not a
 * different set of colours.
 */
export function MatchStory({
  matchId,
  match,
  model,
  identities,
  losses = [],
  videoUrl,
  startChapter,
}: {
  matchId: string;
  match: LibraryMatch;
  model: MatchModel;
  identities: { A: TeamIdentity; B: TeamIdentity };
  /** Possession losses that carry real coordinates. */
  losses?: Loss[] | undefined;
  videoUrl?: string | undefined;
  /** Open straight at this chapter, from a rail bubble. */
  startChapter?: string | undefined;
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(() => chapterIndex(startChapter));
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const chapter = STORY_CHAPTERS[index] ?? STORY_CHAPTERS[0]!;

  const close = useCallback(() => {
    void navigate({ to: "/match/$matchId/insights", params: { matchId } });
  }, [navigate, matchId]);

  const next = useCallback(() => {
    setProgress(0);
    if (index >= STORY_CHAPTERS.length - 1) {
      close();
      return;
    }
    setIndex(index + 1);
  }, [index, close]);

  const prev = useCallback(() => {
    setProgress(0);
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!pausedRef.current) {
        elapsed += delta;
        const percent = Math.min(1, elapsed / chapter.durationMs);
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
  }, [index, chapter.durationMs, next]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === " ") {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, prev]);

  const body: Record<ChapterId, ReactNode> = {
    score: <ScoreChapter match={match} model={model} identities={identities} />,
    strength: <StrengthChapter model={model} />,
    turned: <TurnedChapter model={model} identities={identities} />,
    improve: <ImproveChapter model={model} losses={losses} videoUrl={videoUrl} matchId={matchId} />,
    verdict: <VerdictChapter model={model} matchId={matchId} onClose={close} />,
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* One ruled bar across the top: where we are, and how long is left. */}
      <div className="flex gap-[3px] px-3 pt-3 sm:px-5">
        {STORY_CHAPTERS.map((entry, i) => (
          <span key={entry.id} className="h-[3px] flex-1 bg-wire">
            <span
              className="block h-full bg-cream"
              style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }}
            />
          </span>
        ))}
      </div>

      <header className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="num text-[13px] leading-none text-text-faint">
            {String(index + 1).padStart(2, "0")}/{String(STORY_CHAPTERS.length).padStart(2, "0")}
          </span>
          <span className="label-xs truncate text-accent-sea">{chapter.kind}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StoryButton onClick={() => setPaused((p) => !p)} label={paused ? "Play" : "Pause"}>
            {paused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </StoryButton>
          <StoryButton onClick={close} label="Close the story">
            <X size={15} aria-hidden="true" />
          </StoryButton>
        </div>
      </header>

      {/* The chapter. Tapping the left or right third steps through it, which
          is how everyone already expects a story to behave, but the controls
          below are there for anyone who does not know that. */}
      <main className="relative flex flex-1 flex-col justify-center overflow-y-auto px-4 pb-4 sm:px-7">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous chapter"
          className="absolute inset-y-0 left-0 z-10 w-1/4"
        />
        <button
          type="button"
          onClick={next}
          aria-label="Next chapter"
          className="absolute inset-y-0 right-0 z-10 w-1/4"
        />
        <div className="pointer-events-none relative z-20 mx-auto my-auto w-full max-w-[1000px] py-6 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {body[chapter.id]}
        </div>
      </main>

      <footer className="flex items-center justify-between gap-3 border-t border-wire px-3 py-3 sm:px-5">
        <StoryButton onClick={prev} label="Previous chapter" disabled={index === 0}>
          <ChevronLeft size={16} aria-hidden="true" />
        </StoryButton>
        <p className="min-w-0 truncate text-[12px] text-text-faint">{chapter.nav}</p>
        <StoryButton onClick={next} label="Next chapter">
          <ChevronRight size={16} aria-hidden="true" />
        </StoryButton>
      </footer>
    </div>
  );
}

function StoryButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-text-dim transition-colors hover:border-accent-sea hover:text-accent-sea disabled:opacity-35 disabled:hover:border-wire disabled:hover:text-text-dim"
    >
      {children}
    </button>
  );
}

/** The line that names what a chapter is about, above the figure. */
function Kicker({ children }: { children: ReactNode }) {
  return <p className="label-sm text-accent-sea">{children}</p>;
}

/** The sentence under a figure. Never more than two lines on a phone. */
function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-text-dim sm:text-[15.5px]">
      {children}
    </p>
  );
}

/* ---------- 01 · the result ---------- */

function ScoreChapter({
  match,
  model,
  identities,
}: {
  match: LibraryMatch;
  model: MatchModel;
  identities: { A: TeamIdentity; B: TeamIdentity };
}) {
  const headline = model.cells.slice(0, 3);
  return (
    <div>
      <Kicker>{match.competition || match.date}</Kicker>

      <div className="mt-5 flex items-center gap-4 sm:gap-7">
        <Crest team={identities.A} size={44} />
        <p className="display-i shrink-0 text-[clamp(64px,17vw,150px)] leading-[0.8] text-text-bright">
          {match.scoreA}–{match.scoreB}
        </p>
        <Crest team={identities.B} size={44} />
      </div>

      <p className="display-i mt-4 text-[clamp(22px,4vw,38px)] leading-[0.95] text-text">
        {model.flowTitle}
      </p>
      <Caption>
        {identities.A.name} against {identities.B.name}. {model.moments.length} tracked moments,{" "}
        {model.confirmed} of them confirmed by you.
      </Caption>

      {/* The same three figures the page opens with, in the same words. */}
      <dl className="rule-x mt-7 grid grid-cols-3 border-y border-wire">
        {headline.map((cell) => (
          <div key={cell.label} className="px-3 py-4 first:pl-0 sm:px-5">
            <dd className="num text-[clamp(26px,5vw,44px)] leading-[0.9] text-text-bright">
              {cell.value ?? "—"}
            </dd>
            <dt className="label-xs mt-2 text-text-faint">{cell.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- 02 · what held up ---------- */

function StrengthChapter({ model }: { model: MatchModel }) {
  const { strengths } = model;
  if (strengths.length === 0) {
    return (
      <div>
        <Kicker>What held up</Kicker>
        <p className="display-i mt-4 text-[clamp(30px,6vw,56px)] leading-[0.9] text-text-bright">
          Nothing cleared a target
        </p>
        <Caption>
          That is unusual rather than damning — check the targets on your club profile still match
          the level you are playing at.
        </Caption>
      </div>
    );
  }

  return (
    <div>
      <Kicker>What held up</Kicker>
      <p className="display-i mt-3 text-[clamp(30px,6vw,56px)] leading-[0.88] text-text-bright">
        {strengths.length === 1 ? "One thing held up" : `${strengths.length} things held up`}
      </p>

      <ul className="rule-y mt-6 border-y border-wire">
        {strengths.slice(0, 5).map((strength) => (
          <li
            key={strength.id}
            className="flex items-baseline justify-between gap-4 py-3.5 sm:py-4"
          >
            <span className="flex min-w-0 items-baseline gap-3">
              <Check
                size={15}
                aria-hidden="true"
                className="relative top-[2px] shrink-0 text-positive"
              />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug text-text-bright sm:text-[17px]">
                  {strength.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-text-faint">{strength.basis}</span>
              </span>
            </span>
            <span className="num shrink-0 text-[clamp(24px,4.5vw,40px)] leading-none text-positive">
              {strength.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- 03 · when it turned ---------- */

function TurnedChapter({
  model,
  identities,
}: {
  model: MatchModel;
  identities: { A: TeamIdentity; B: TeamIdentity };
}) {
  const { pressureWindow, lossEvents } = model;
  return (
    <div>
      <Kicker>When it turned</Kicker>
      <p className="display-i mt-3 text-[clamp(26px,5vw,48px)] leading-[0.9] text-text-bright">
        {pressureWindow
          ? `The worst of it ran ${clock(pressureWindow.fromS)} to ${clock(pressureWindow.toS)}`
          : "The losses never clustered"}
      </p>
      <Caption>
        {pressureWindow
          ? `${pressureWindow.label}. The band on the chart is that stretch — nobody chose it, a fourteen-minute frame slid across the match and this is where it was busiest.`
          : `We gave the ball away ${lossEvents.length} times, but never often enough in one stretch for the analysis to call it a spell.`}
      </Caption>

      <div className="mt-6">
        <MatchFlow
          momentum={model.momentum}
          halfTimeS={model.halfTimeS}
          durationS={model.duration}
          goals={model.goals}
          turnovers={lossEvents.map((event) => event.t)}
          window={pressureWindow}
          teamA={identities.A}
          teamB={identities.B}
          confirmed={model.confirmed}
          detected={Math.max(model.moments.length - model.confirmed, 0)}
        />
      </div>
    </div>
  );
}

/* ---------- 04 · the one thing ---------- */

function ImproveChapter({
  model,
  losses,
  videoUrl,
  matchId,
}: {
  model: MatchModel;
  losses: Loss[];
  videoUrl?: string | undefined;
  matchId: string;
}) {
  const finding = model.model.top;
  const moments = useMemo(() => finding?.timestamps.slice(0, 3) ?? [], [finding]);
  const { posters, blocked } = useClipPosters(videoUrl, moments, Boolean(videoUrl));

  if (!finding) {
    return (
      <div>
        <Kicker>The one thing</Kicker>
        <p className="display-i mt-4 text-[clamp(30px,6vw,56px)] leading-[0.9] text-text-bright">
          Every target was met
        </p>
        <Caption>
          Nothing in this match crossed one of your thresholds, so there is nothing to build a
          corrective session from.
        </Caption>
      </div>
    );
  }

  const unit = finding.unit === "%" ? "%" : ` ${finding.unit}`;
  return (
    <div>
      <Kicker>The one thing</Kicker>
      <p className="display-i mt-3 text-[clamp(26px,5vw,48px)] leading-[0.9] text-text-bright">
        {finding.headline}
      </p>

      {/* The gap, as two figures rather than a sentence about a gap. */}
      <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4 border-y border-wire py-5">
        <span>
          <span className="num block text-[clamp(44px,9vw,86px)] leading-[0.82] text-reaction-bad">
            {finding.value}
            {unit}
          </span>
          <span className="label-xs mt-2 block text-text-faint">What we did</span>
        </span>
        <span>
          <span className="num block text-[clamp(30px,6vw,56px)] leading-[0.82] text-text-dim">
            {finding.target}
            {unit}
          </span>
          <span className="label-xs mt-2 block text-text-faint">Your target</span>
        </span>
        <span className="ml-auto">
          <span className="num block text-[clamp(30px,6vw,56px)] leading-[0.82] text-text-bright">
            {finding.events}
          </span>
          <span className="label-xs mt-2 block text-text-faint">
            {finding.events === 1 ? "moment" : "moments"}
          </span>
        </span>
      </div>

      <Caption>{finding.interpretation}</Caption>

      {/* The evidence, two ways: the moments as the frames they actually are,
          and every loss on one pitch so the shape of the problem is visible
          rather than only its size. Side by side where there is room for both. */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        {moments.length > 0 && (
          <ul className="flex gap-0 overflow-x-auto border border-wire [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {moments.map((t, i) => (
              <li key={t} className={cn("shrink-0", i > 0 && "border-l border-wire")}>
                <Link
                  to="/match/$matchId/match"
                  params={{ matchId }}
                  search={{ t: Math.round(t * 10) / 10 }}
                  className="group flex w-[128px] flex-col gap-2 p-3 transition-colors hover:bg-surface-2 sm:w-[150px]"
                >
                  <ClipThumb
                    videoUrl={videoUrl}
                    t={t}
                    poster={posters[t]}
                    paintFrame={blocked}
                    className="h-[64px] border border-wire text-text-dim group-hover:border-accent-sea group-hover:text-accent-sea sm:h-[76px]"
                  />
                  <span className="num-flat text-[12.5px] text-text-bright">{clock(t)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {losses.length > 0 && (
          <div className="hidden lg:block">
            <PressureArt
              losses={losses}
              caption="Where we lost it"
              note="Coloured by how long the first pressure took."
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 05 · Tuesday ---------- */

function VerdictChapter({
  model,
  matchId,
  onClose,
}: {
  model: MatchModel;
  matchId: string;
  onClose: () => void;
}) {
  const finding = model.model.top;
  return (
    <div>
      <Kicker>Tuesday</Kicker>
      <p className="display-i mt-3 text-[clamp(30px,6vw,56px)] leading-[0.88] text-text-bright">
        {finding ? "Built from the finding above" : "Keep what worked"}
      </p>
      <Caption>
        {finding
          ? `The session comes from "${finding.headline.toLowerCase()}" — the drills, their durations and the pitch diagrams all come from that finding and the ${finding.events} moments behind it.`
          : "No threshold was crossed in this match, so there is nothing to correct. The plan keeps what already works."}
      </Caption>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/match/$matchId/session" params={{ matchId }} className="btn btn-primary">
          <CalendarCheck size={16} aria-hidden="true" />
          Build Tuesday session
        </Link>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Back to the debrief
        </button>
      </div>
    </div>
  );
}
