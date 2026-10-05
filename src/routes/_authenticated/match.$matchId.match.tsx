import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { useFrameChunks } from "@/hooks/use-frame-chunks";
import { ballVerdict } from "@/lib/ball-verdict";
import {
  MatchCanvas,
  LAYERS,
  PRESETS,
  presetLayers,
  type LayerKey,
  type PresetKey,
} from "@/components/ip/match-canvas";
import { EventFixSheet } from "@/components/ip/event-review";
import {
  DEFAULT_EVENT_FILTER,
  EventFilter,
  eventMatchesFilter,
  type EventFilterValue,
} from "@/components/ip/event-filter";
import { PlayerOverlay } from "@/components/match/PlayerOverlay";
import { Telestration } from "@/components/match/Telestration";
import { EventRow } from "@/components/match/EventRow";
import { MatchSide, FeedHeading, type SideTab } from "@/components/match/MatchSide";
import { MomentumStrip } from "@/components/match/MomentumStrip";
import type { StatIconName } from "@/components/match/StatIcon";
import { useAnalysis } from "@/hooks/use-match";
import { listableEvents } from "@/lib/match-source";
import { useMatchVideo } from "@/hooks/use-match-video";
import { buildClips } from "@/lib/clips";
import { formatClock } from "@/lib/sample-data";
import { countEvents, downloadReviews, type ReviewedEvent } from "@/lib/event-reviews";
import { feedLabel, type Frame } from "@/lib/match-source";
import { teamRow, type StatsFile } from "@/lib/match-analysis";
import { insidePeriods, shotsOf } from "@/lib/export-contract";
import { cn } from "@/lib/utils";
import { crestForTeam } from "@/lib/team-crests";
import { shortTeamCode, type TeamIdentity } from "@/components/team/TeamToken";

export const Route = createFileRoute("/_authenticated/match/$matchId/match")({
  validateSearch: (search: Record<string, unknown>): { t?: number } =>
    typeof search["t"] === "number" ? { t: search["t"] } : {},
  head: () => ({
    meta: [
      { title: "Watch the match — Ipanema" },
      { name: "description", content: "Video, 2D view and every moment we found, in order." },
      { property: "og:title", content: "Watch the match — Ipanema" },
      { property: "og:description", content: "Jump straight to the moment behind a finding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchScreen,
});

type Mode = "video" | "2d" | "both";

const LAYER_STORE = "ipanema-layers";
const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  players: true,
  ball: true,
  carrier: true,
  shapes: false,
  lanes: false,
  line: false,
  units: false,
  block: false,
  trails: false,
  space: false,
};
const MAX_LAYERS = 4; // players + three analysis layers

function readLayers(): Record<LayerKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(LAYER_STORE);
    return raw
      ? { ...DEFAULT_LAYERS, ...(JSON.parse(raw) as Record<LayerKey, boolean>) }
      : DEFAULT_LAYERS;
  } catch {
    return DEFAULT_LAYERS;
  }
}

const PHASE_WORD: Record<string, string> = {
  control: "in control",
  loose: "ball loose",
  dead: "ball dead",
};

const EVENT_ICONS: Record<string, StatIconName> = {
  goal: "goal",
  shot: "shot",
  shot_blocked: "attempt",
  turnover_won: "turnover-won",
  turnover_lost: "turnover-lost",
  high_turnover: "high-turnover",
  set_piece: "free-kick",
  pass_bad: "pass",
  pass_risky: "pass",
  better_option: "better-option",
  sequence_end: "sequence",
};

function eventMetric(
  events: ReviewedEvent[],
  team: "A" | "B",
  test: (event: ReviewedEvent) => boolean,
) {
  const count = countEvents(events, (event) => event.team === team && test(event));
  return count.confirmed > 0 ? count.confirmed : count.detected;
}

function kindIs(event: ReviewedEvent, kind: string) {
  const payload = event.payload ?? {};
  return String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "")
    .toLowerCase()
    .includes(kind);
}

function MatchScreen() {
  const { matchId } = Route.useParams();
  const { t: startT } = Route.useSearch();
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const { match, row, label, file, stats, team, colours, loading, events: allEvents, hiddenEvents, review } =
    useAnalysis(matchId, scope);
  const [showBeta, setShowBeta] = useState(false);
  const hasBeta = useMemo(() => allEvents.some((e) => (e as { tier?: string }).tier === "beta"), [allEvents]);
  /** Only verified moments are listed; beta behind a toggle, hidden never. */
  const events = useMemo(() => listableEvents(allEvents, showBeta), [allEvents, showBeta]);
  const [typesOverride, setTypesOverride] = useState<string[] | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [fixing, setFixing] = useState<ReviewedEvent | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [speed, setSpeed] = useState(1);
  const [sideTab, setSideTab] = useState<SideTab>("feed");
  const [filter, setFilter] = useState<EventFilterValue>(DEFAULT_EVENT_FILTER);
  const [clock, setClock] = useState<number>(startT ?? 0);
  const liveFile = useFrameChunks(row?.files, file, clock);
  /** Goals in time order, so the score can follow the video. */
  const goalTimes = useMemo(
    () =>
      shotsOf(stats as StatsFile | undefined)
        .filter((s) => s.goal && insidePeriods(s.t, file?.periods))
        .map((s) => ({ t: s.t, team: s.team })),
    [stats, file?.periods],
  );
  const liveScore = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const g of goalTimes) {
      if (g.t > clock) continue;
      if (g.team === "A") a += 1;
      else b += 1;
    }
    return { a, b };
  }, [goalTimes, clock]);
  const [playing, setPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS);
  const [layerSheet, setLayerSheet] = useState(false);
  const [controlsAwake, setControlsAwake] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seededRef = useRef(false);

  useEffect(() => setLayers(readLayers()), []);

  const saveLayers = (next: Record<LayerKey, boolean>) => {
    try {
      window.localStorage.setItem(LAYER_STORE, JSON.stringify(next));
    } catch {
      /* private mode — layers just won't persist */
    }
  };
  const applyPreset = (key: PresetKey) => {
    const next = presetLayers(key);
    saveLayers(next);
    setLayers(next);
  };
  const toggleLayer = (key: LayerKey) =>
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) {
        const on = (Object.keys(next) as LayerKey[]).filter((k) => next[k]);
        if (on.length > MAX_LAYERS) {
          const drop = on.find((k) => k !== key && k !== "players");
          if (drop) next[drop] = false;
        }
      }
      try {
        window.localStorage.setItem(LAYER_STORE, JSON.stringify(next));
      } catch {
        /* private mode — layers just won't persist */
      }
      return next;
    });

  const videoUrl = useMatchVideo(row);

  const total = row?.duration_s ?? match?.durationS ?? 1;
  const verdict = ballVerdict(row?.summary);
  const layerAllowed = (needs: null | "possession" | "events") =>
    needs === null ? true : needs === "possession" ? verdict.possession : verdict.events;
  const shownLayers = Object.fromEntries(
    LAYERS.map((l) => [l.key, layers[l.key] && layerAllowed(l.needs)]),
  ) as Record<LayerKey, boolean>;
  const clips = useMemo(() => buildClips(events, team ?? "A"), [events, team]);
  const momentumWindows = useMemo(() => {
    const frames = file?.frames ?? [];
    const windows: { t: number; tiltA: number }[] = [];
    for (let start = 0; start < total; start += 15) {
      const sample = frames.filter(
        (candidate) => candidate.t >= start && candidate.t < start + 15 && candidate.possession,
      );
      if (sample.length === 0) continue;
      windows.push({
        t: start,
        tiltA: sample.filter((candidate) => candidate.possession === "A").length / sample.length,
      });
    }
    return windows;
  }, [file?.frames, total]);
  const momentumEvents = useMemo<
    { t: number; type: "goal" | "turnover"; team: "A" | "B" }[]
  >(() => {
    const markers: { t: number; type: "goal" | "turnover"; team: "A" | "B" }[] = [];
    for (const event of events) {
      if (!event.team) continue;
      if (event.type === "goal") markers.push({ t: event.t, type: "goal", team: event.team });
      else if (["turnover_lost", "turnover_won", "high_turnover"].includes(event.type))
        markers.push({ t: event.t, type: "turnover", team: event.team });
    }
    return markers;
  }, [events]);
  const playbackMarkers = useMemo(
    () =>
      (team ? events.filter((event) => event.team === team) : events).flatMap((event) =>
        event.team
          ? [
              {
                t: event.t,
                team: event.team,
                kind: event.type === "goal" ? ("goal" as const) : ("event" as const),
              },
            ]
          : [],
      ),
    [events, team],
  );
  const screenVars = { "--team-a": colours.A, "--team-b": colours.B } as CSSProperties;
  const identities: Record<"A" | "B", TeamIdentity> | null = match
    ? {
        A: {
          name: match.teamA,
          shortCode: shortTeamCode(match.teamA),
          kitColour: colours.A,
          ...(crestForTeam(match.teamA) ? { crestUrl: crestForTeam(match.teamA) } : {}),
        },
        B: {
          name: match.teamB,
          shortCode: shortTeamCode(match.teamB),
          kitColour: colours.B,
          ...(crestForTeam(match.teamB) ? { crestUrl: crestForTeam(match.teamB) } : {}),
        },
      }
    : null;
  const seek = useCallback(
    (time: number) => {
      const next = Math.max(0, Math.min(total, time));
      setClock(next);
      if (videoRef.current) videoRef.current.currentTime = next;
    },
    [total],
  );

  // The video clock is the only source of visibility: read it every frame.
  useEffect(() => {
    if (events.length === 0) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      const t = video ? video.currentTime : 0;
      let count = 0;
      while (count < events.length && events[count]!.t <= t) count += 1;
      setVisibleCount((prev) => (prev === count ? prev : count));
      setClock((prev) => (Math.abs(prev - t) < 0.05 ? prev : t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [events]);

  // Deep link ?t= seeks once the video is ready.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || seededRef.current || !startT) return;
    const seek = () => {
      video.currentTime = startT;
      seededRef.current = true;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
  }, [startT, videoUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const node = mediaRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void node
      .requestFullscreen?.()
      .then(() => {
        void window.screen.orientation?.lock?.("landscape").catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === mediaRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** The bar hides itself while the video plays, and comes back on any touch. */
  const wakeControls = useCallback(() => setControlsAwake(true), []);
  useEffect(() => {
    if (!playing || layerSheet || !controlsAwake) return;
    const timer = setTimeout(() => setControlsAwake(false), 2600);
    return () => clearTimeout(timer);
  }, [playing, layerSheet, controlsAwake, clock]);
  const controlsVisible = controlsAwake || !playing || layerSheet;

  const shown = useMemo(() => {
    const visible = events.slice(0, visibleCount);
    const byTeam = team ? visible.filter((e) => e.team === team) : visible;
    const filtered = typesOverride
      ? byTeam.filter((e) => typesOverride.includes(e.type))
      : byTeam.filter((e) => eventMatchesFilter(e, filter));
    return filtered.slice().reverse();
  }, [events, visibleCount, typesOverride, filter, team]);

  const ticks = useMemo(
    () => (team ? events.filter((e) => e.team === team) : events),
    [events, team],
  );

  /** The feed, split at the half so the coach can see which half they are in. */
  const halves = useMemo(() => {
    const mid = total / 2;
    const first = shown.filter((e) => e.t < mid);
    const second = shown.filter((e) => e.t >= mid);
    return [
      ...(first.length ? [{ label: "1st half", rows: first }] : []),
      ...(second.length ? [{ label: "2nd half", rows: second }] : []),
    ];
  }, [shown, total]);

  /** Step to the moment before or after the playhead. */
  const jumpEvent = useCallback(
    (direction: -1 | 1) => {
      if (ticks.length === 0) return;
      const next =
        direction === 1
          ? ticks.find((e) => e.t > clock + 0.25)
          : [...ticks].reverse().find((e) => e.t < clock - 0.25);
      if (next) seek(next.t);
    },
    [ticks, clock, seek],
  );

  const cycleSpeed = useCallback(() => {
    const rates = [1, 1.5, 2, 0.5];
    const next = rates[(rates.indexOf(speed) + 1) % rates.length] ?? 1;
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }, [speed]);

  // Desktop keyboard, as the hint under the player promises.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = ev.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        ev.preventDefault();
        togglePlay();
        return;
      }
      if (key === "arrowleft" || key === "arrowright") {
        ev.preventDefault();
        seek(clock + (key === "arrowright" ? 5 : -5));
        return;
      }
      if (key === "n" || key === "p") {
        ev.preventDefault();
        jumpEvent(key === "n" ? 1 : -1);
        return;
      }
      if (key === "arrowdown" || key === "arrowup") {
        ev.preventDefault();
        setFocusIndex((i) => {
          const next = key === "arrowdown" ? i + 1 : i - 1;
          return Math.max(0, Math.min(shown.length - 1, next));
        });
        return;
      }
      const event = shown[focusIndex];
      if (!event) return;
      if (key === "c") {
        ev.preventDefault();
        review.setVerdict.mutate({ eventId: event.id, verdict: "confirmed" });
      } else if (key === "x") {
        ev.preventDefault();
        review.setVerdict.mutate({ eventId: event.id, verdict: "deleted" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, focusIndex, review.setVerdict, togglePlay, seek, clock, jumpEvent]);

  const possessionTeam = frame?.possession;
  const possessionName =
    possessionTeam === "A" ? match?.teamA : possessionTeam === "B" ? match?.teamB : null;
  const possessionLine = possessionName
    ? `${possessionName.split(" ").at(-1)} · ${PHASE_WORD[frame?.phase ?? ""] ?? "in play"}`
    : (PHASE_WORD[frame?.phase ?? ""] ?? "No clear possession");

  const staleSchema = row ? row.schema_version !== 1 : false;

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {staleSchema && (
        <div className=" border border-quality-risky/60 bg-surface p-5">
          <p className="text-[12.5px] text-text-dim">
            This match was processed with an older pipeline — re-run it. We're showing what we can.
          </p>
        </div>
      )}

      {loading && (
        <div
          className="h-[3px] w-full overflow-hidden bg-surface-2"
          role="status"
          aria-label="Loading match data"
        >
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] bg-cream" />
        </div>
      )}

      {match && (
        <div
          style={screenVars}
          className="grid gap-3.5 min-[1060px]:grid-cols-[minmax(0,1fr)_380px] min-[1060px]:items-start"
        >
          <div className="min-w-0">
            <div
              ref={mediaRef}
              onPointerDown={wakeControls}
              onPointerMove={wakeControls}
              className={cn(
                "relative w-full select-none overflow-hidden border border-wire bg-black",
                fullscreen ? "h-dvh w-dvw max-w-none rounded-none border-0" : "aspect-[16/9]",
              )}
            >
              <video
                ref={videoRef}
                {...(videoUrl ? { src: videoUrl } : {})}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                aria-label={`Match video, ${match.teamA} against ${match.teamB}`}
                className={cn(
                  "h-full w-full bg-black object-contain",
                  mode === "2d" && "invisible",
                )}
              />

              {mode === "2d" ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, var(--pitch-top), var(--pitch-bottom))",
                  }}
                >
                  <MatchCanvas
                    file={liveFile}
                    videoRef={videoRef}
                    team={team}
                    colours={colours}
                    layers={shownLayers}
                    mode="pitch"
                    onFrame={setFrame}
                  />
                </div>
              ) : (
                <MatchCanvas
                  file={liveFile}
                  videoRef={videoRef}
                  team={team}
                  colours={colours}
                  layers={shownLayers}
                  mode="video"
                  onFrame={setFrame}
                />
              )}

              {/* Clock, score and who has it — one row, so nothing collides on a phone. */}
              <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
                <span className="display num bg-black/55 px-2 py-0.5 text-[15px] font-bold text-white">
                  {formatClock(clock)}
                </span>
                {match.status === "ready" && (
                  <span className="display-i bg-black/55 px-2 py-0.5 text-[15px] font-extrabold text-white">
                    {liveScore.a}–{liveScore.b}
                  </span>
                )}
                <span
                  className="flex min-w-0 items-center gap-1.5 truncate bg-black/60 py-1 pl-1.5 pr-2.5 text-[11.5px] font-semibold text-white"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        possessionTeam === "A"
                          ? colours.A
                          : possessionTeam === "B"
                            ? colours.B
                            : "var(--text-faint)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{possessionLine}</span>
                </span>
              </div>

              {mode === "both" && (
                <div
                  className="absolute right-2.5 top-12 w-[34%] overflow-hidden border border-wire"
                  style={{
                    background: "linear-gradient(180deg, var(--pitch-top), var(--pitch-bottom))",
                  }}
                >
                  <div className="relative aspect-[16/10] w-full">
                    <MatchCanvas
                      file={liveFile}
                      videoRef={videoRef}
                      team={team}
                      colours={colours}
                      layers={shownLayers}
                      mode="pitch"
                    />
                  </div>
                </div>
              )}
              <Telestration
                open={drawing}
                onClose={() => setDrawing(false)}
                videoRef={videoRef}
                frameLabel={`${Math.floor(clock / 60)}-${String(Math.floor(clock % 60)).padStart(2, "0")}`}
              />

              <PlayerOverlay
                playing={playing}
                currentTime={clock}
                duration={total}
                markers={playbackMarkers}
                onPlayPause={togglePlay}
                onSeek={seek}
                onStep={(seconds) => seek(clock + seconds)}
                onEvent={jumpEvent}
                speed={speed}
                onSpeed={cycleSpeed}
                mode={mode}
                onMode={setMode}
                onOverlays={() => setLayerSheet((v) => !v)}
                overlaysOpen={layerSheet}
                onDraw={() => {
                  // Drawing is for a still frame — starting it pauses the match.
                  const video = videoRef.current;
                  if (video && !video.paused) video.pause();
                  setDrawing((v) => !v);
                }}
                drawingOpen={drawing}
                fullscreen={fullscreen}
                onFullscreen={toggleFullscreen}
                hasEvents={ticks.length > 0}
                visible={controlsVisible}
              />

              {/* The overlays panel lives inside the frame so it is still reachable
                  in fullscreen, where nothing outside the video element is shown. */}
              {layerSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
                  <button
                    type="button"
                    aria-label="Close overlays"
                    onClick={() => setLayerSheet(false)}
                    className="absolute inset-0 bg-black/60"
                  />
                  <div
                    className="relative max-h-[80vh] w-full max-w-[420px] overflow-y-auto border border-wire bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm: sm:pb-5"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-[17px] font-semibold text-text-bright">Overlays</h2>
                      <button
                        type="button"
                        onClick={() => setLayerSheet(false)}
                        className="tap px-2 text-[12px] font-bold text-text-dim hover:text-text"
                      >
                        Done
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {PRESETS.map((p) => {
                        const active = (Object.keys(layers) as LayerKey[]).every(
                          (k) => layers[k] === presetLayers(p.key)[k],
                        );
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => applyPreset(p.key)}
                            aria-pressed={active}
                            className={cn(
                              "tap h-10 border text-[13px] font-semibold",
                              active
                                ? "border-cream bg-cream text-ink"
                                : "border-wire text-text hover:bg-surface-2",
                            )}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-[11px] uppercase tracking-wide text-text-dim">
                      Custom · up to 3 besides players
                    </p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {LAYERS.map((l) => (
                        <li key={l.key}>
                          <button
                            type="button"
                            onClick={() => layerAllowed(l.needs) && toggleLayer(l.key)}
                            aria-pressed={layers[l.key]}
                            aria-disabled={!layerAllowed(l.needs)}
                            title={
                              layerAllowed(l.needs) ? undefined : "Needs reliable ball tracking"
                            }
                            className={cn(
                              "tap flex w-full items-center justify-between px-2 text-left text-[13.5px] text-text hover:bg-surface-2",
                              !layerAllowed(l.needs) && "opacity-40",
                            )}
                          >
                            <span>
                              {l.label}
                              {!layerAllowed(l.needs) && (
                                <span className="ml-2 text-[11px] text-text-dim">
                                  needs reliable ball
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "h-4 w-4 border",
                                layers[l.key] ? "border-cream bg-cream" : "border-wire",
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 overflow-hidden border border-wire bg-surface">
              <MomentumStrip
                windows={momentumWindows}
                events={momentumEvents}
                durationSeconds={total}
                currentTime={clock}
                onSeek={seek}
              />
            </div>

            <p className="mt-3 hidden text-[11px] leading-[1.7] text-text-faint md:block">
              Shortcuts: <Key>Space</Key> play/pause <Key>←</Key>
              <Key>→</Key> 5 s <Key>N</Key>
              <Key>P</Key> next/previous moment <Key>C</Key> confirm <Key>X</Key> hide
            </p>
          </div>

          <MatchSide tab={sideTab} onTab={setSideTab} clipCount={clips.length}>
            {sideTab === "feed" ? (
              <>
                <EventFilter
                  value={filter}
                  onChange={(next) => {
                    setTypesOverride(null);
                    setFilter(next);
                  }}
                  events={events}
                  teamNames={{ A: match.teamA, B: match.teamB }}
                />
                {hasBeta && (
                  <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-[12px] text-text-dim">
                    <input
                      type="checkbox"
                      checked={showBeta}
                      onChange={(e) => setShowBeta(e.target.checked)}
                      className="h-4 w-4 accent-[var(--cream)]"
                    />
                    Show beta events
                  </label>
                )}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11.5px] font-medium text-text-faint">
                    <strong className="font-semibold text-text">{shown.length}</strong> shown · tap
                    a moment to confirm
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        review.confirmMany.mutate(
                          shown.filter((e) => e.status !== "confirmed").map((e) => e.id),
                        )
                      }
                      disabled={shown.every((e) => e.status === "confirmed")}
                      className="tap border border-cream/60 px-2.5 text-[11.5px] font-semibold text-cream hover:bg-cream/10 disabled:opacity-40"
                    >
                      Confirm all
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadReviews(matchId, review.rows)}
                      disabled={review.rows.length === 0}
                      className="tap border border-wire px-2.5 text-[11.5px] text-text-dim hover:border-cream/50 hover:text-cream disabled:opacity-40"
                    >
                      Export
                    </button>
                  </div>
                </div>

                {halves.map((half) => (
                  <div key={half.label}>
                    <FeedHeading label={half.label} trailing={half.rows.length} />
                    {half.rows.map((e) => (
                      <div key={e.id}>
                        {identities && (
                          <EventRow
                            time={formatClock(e.t)}
                            icon={EVENT_ICONS[e.type] ?? "sequence"}
                            iconTint={
                              e.type.includes("won")
                                ? "good"
                                : e.type.includes("lost") || e.type === "pass_bad"
                                  ? "bad"
                                  : "default"
                            }
                            team={e.team === "B" ? "B" : "A"}
                            identity={identities[e.team === "B" ? "B" : "A"]}
                            title={feedLabel(e.type)}
                            subtitle={`${e.status === "confirmed" ? "confirmed" : "detected"}${e.corrected ? " · fixed" : ""} · ${e.subtitle || e.title}`}
                            state={e.status === "confirmed" ? "confirmed" : "untouched"}
                            focused={shown.indexOf(e) === focusIndex}
                            onPlay={() => {
                              setFocusIndex(shown.indexOf(e));
                              seek(e.t);
                            }}
                            onConfirm={() =>
                              e.status === "confirmed"
                                ? setFixing(e)
                                : review.setVerdict.mutate({ eventId: e.id, verdict: "confirmed" })
                            }
                            onHide={() =>
                              review.setVerdict.mutate({ eventId: e.id, verdict: "deleted" })
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {shown.length === 0 && (
                  <p className="px-3.5 py-6 text-center text-[12.5px] text-text-faint">
                    {visibleCount === 0
                      ? "Press play — moments appear as the match reaches them."
                      : "Nothing of that kind yet."}
                  </p>
                )}

                {hiddenEvents.length > 0 && (
                  <div className="mt-2 border-t border-wire py-2.5">
                    <button
                      type="button"
                      onClick={() => setShowHidden((v) => !v)}
                      aria-expanded={showHidden}
                      className="tap text-[11.5px] uppercase tracking-[0.08em] text-text-faint hover:text-cream"
                    >
                      Hidden ({hiddenEvents.length})
                    </button>
                    {showHidden && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {hiddenEvents.map((e) => (
                          <li key={e.id} className="flex items-center gap-2 text-[12px]">
                            <span className="num w-11 shrink-0 text-text-faint line-through">
                              {formatClock(e.t)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-text-faint line-through">
                              {feedLabel(e.type)}
                            </span>
                            <button
                              type="button"
                              onClick={() => review.clear.mutate([e.id])}
                              className="tap shrink-0 border border-wire px-2 text-[11px] text-text-dim hover:border-cream/50 hover:text-cream"
                            >
                              Put back
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mb-2.5 text-[12px] text-text-dim">
                  Every clip is a moment in the match file, at the time the file gives it. Nothing
                  is made up.
                </p>
                {clips.length === 0 ? (
                  <p className=" border border-wire px-3.5 py-6 text-center text-[12.5px] text-text-faint">
                    No moment in this match is worth a clip yet.
                  </p>
                ) : (
                  clips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => seek(clip.t)}
                      className="mb-1.5 flex w-full items-center gap-2.5 border border-wire px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="display num shrink-0 text-[15px] text-text-dim">
                        {formatClock(clip.t)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-text">
                          {clip.title}
                        </span>
                        <span className="block truncate text-[11px] text-text-faint">
                          {clip.reason}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 border px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.06em]",
                          clip.confirmed
                            ? "bg-reaction-good/15 text-reaction-good"
                            : "border border-wire text-text-faint",
                        )}
                      >
                        {clip.confirmed ? "Confirmed" : "Detected"}
                      </span>
                    </button>
                  ))
                )}
              </>
            )}
          </MatchSide>

          {fixing && (
            <EventFixSheet
              event={fixing}
              names={{
                A: match.teamA.split(" ").at(-1) ?? "Team A",
                B: match.teamB.split(" ").at(-1) ?? "Team B",
              }}
              onReview={(input) => review.setVerdict.mutate(input)}
              onClose={() => setFixing(null)}
            />
          )}
        </div>
      )}
    </MatchShell>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className=" border border-b-2 border-wire px-1.5 text-[10.5px] text-text-dim">
      {children}
    </kbd>
  );
}
