import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Maximize2, Minimize2, Pause, Play } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { MatchCanvas, LAYERS, type LayerKey } from "@/components/ip/match-canvas";
import { Card, Chip, Segmented } from "@/components/ip/primitives";
import { EventFixSheet, EventReviewControls } from "@/components/ip/event-review";
import { MatchNumbers } from "@/components/ip/match-numbers";
import { useAnalysis } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
import { downloadReviews, type ReviewedEvent } from "@/lib/event-reviews";
import { EVENT_GROUPS, feedLabel, groupTypes, videoSrc, type Frame } from "@/lib/match-source";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/match/$matchId/match")({
  validateSearch: (search: Record<string, unknown>): { t?: number } =>
    typeof search["t"] === "number" ? { t: search["t"] } : {},
  head: () => ({
    meta: [
      { title: "Watch the match — Ipanema" },
      { name: "description", content: "Video, 2D view and every moment we found, in order." },
      { property: "og:title", content: "Watch the match — Ipanema" },
      { property: "og:description", content: "Jump straight to the moment behind a finding." },
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
};

function readLayers(): Record<LayerKey, boolean> {
  if (typeof window === "undefined") return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(LAYER_STORE);
    return raw ? { ...DEFAULT_LAYERS, ...(JSON.parse(raw) as Record<LayerKey, boolean>) } : DEFAULT_LAYERS;
  } catch {
    return DEFAULT_LAYERS;
  }
}

const PHASE_WORD: Record<string, string> = {
  control: "in control",
  loose: "ball loose",
  dead: "ball dead",
};

function MatchScreen() {
  const { matchId } = Route.useParams();
  const { t: startT } = Route.useSearch();
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const {
    match,
    row,
    label,
    file,
    stats,
    team,
    colours,
    loading,
    events,
    hiddenEvents,
    confirmedCount,
    review,
  } = useAnalysis(matchId, scope);
  const [typesOverride, setTypesOverride] = useState<string[] | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [fixing, setFixing] = useState<ReviewedEvent | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [filter, setFilter] = useState<string>("all");
  const [clock, setClock] = useState<number>(startT ?? 0);
  const [playing, setPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS);
  const [layerSheet, setLayerSheet] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seededRef = useRef(false);

  useEffect(() => setLayers(readLayers()), []);

  const toggleLayer = (key: LayerKey) =>
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(LAYER_STORE, JSON.stringify(next));
      } catch {
        /* private mode — layers just won't persist */
      }
      return next;
    });

  const { data: videoUrl } = useQuery({
    queryKey: ["match-video", matchId],
    queryFn: () => videoSrc(row!),
    enabled: Boolean(row),
    staleTime: 30 * 60_000,
  });

  const total = row?.duration_s ?? match?.durationS ?? 1;


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
    void node.requestFullscreen?.().then(() => {
      void window.screen.orientation?.lock?.("landscape").catch(() => undefined);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === mediaRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const types = typesOverride ?? groupTypes(filter);
  const shown = useMemo(() => {
    const visible = events.slice(0, visibleCount);
    const byTeam = team ? visible.filter((e) => e.team === team) : visible;
    const filtered = types ? byTeam.filter((e) => types.includes(e.type)) : byTeam;
    return filtered.slice().reverse();
  }, [events, visibleCount, types, team]);

  // Desktop keyboard: C confirms, X deletes, arrows move through the feed.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = ev.key.toLowerCase();
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
  }, [shown, focusIndex, review.setVerdict]);

  const ticks = useMemo(() => (team ? events.filter((e) => e.team === team) : events), [events, team]);

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
        <Card className="border-quality-risky/60">
          <p className="text-[12.5px] text-text-dim">
            This match was processed with an older pipeline — re-run it. We're showing what we can.
          </p>
        </Card>
      )}

      {loading && (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
          role="status"
          aria-label="Loading match data"
        >
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {match && (
        <>
          <Card className="p-3">
            <div className="flex flex-col bg-surface">
            <div
              ref={mediaRef}
              className={cn(
                "relative mx-auto w-full overflow-hidden bg-surface-2",
                fullscreen
                  ? "h-dvh w-dvw max-w-none rounded-none bg-bg"
                  : "aspect-[16/10] max-w-[880px] rounded-[12px]",
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
                  style={{ background: "linear-gradient(180deg, var(--pitch-top), var(--pitch-bottom))" }}
                >
                  <MatchCanvas
                    file={file}
                    videoRef={videoRef}
                    team={team}
                    colours={colours}
                    layers={layers}
                    mode="pitch"
                    onFrame={setFrame}
                  />
                </div>
              ) : (
                <MatchCanvas
                  file={file}
                  videoRef={videoRef}
                  team={team}
                  colours={colours}
                  layers={layers}
                  mode="video"
                  onFrame={setFrame}
                />
              )}

              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLayerSheet(true)}
                  aria-label="Choose layers"
                  className={cn(
                    "tap h-8 w-8 place-items-center rounded-full bg-[rgba(0,0,0,0.5)] text-cream backdrop-blur-md",
                    fullscreen ? "hidden" : "grid",
                  )}
                >
                  <Layers size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "Leave fullscreen" : "Fullscreen"}
                  className="tap grid h-8 w-8 place-items-center rounded-full bg-[rgba(0,0,0,0.5)] text-cream backdrop-blur-md"
                >
                  {fullscreen ? (
                    <Minimize2 size={15} aria-hidden="true" />
                  ) : (
                    <Maximize2 size={15} aria-hidden="true" />
                  )}
                </button>
              </div>

              {mode === "both" && (
                <div
                  className="absolute bottom-3 right-3 w-[38%] overflow-hidden rounded-[10px] border border-wire"
                  style={{ background: "linear-gradient(180deg, var(--pitch-top), var(--pitch-bottom))" }}
                >
                  <div className="relative aspect-[16/10] w-full">
                    <MatchCanvas
                      file={file}
                      videoRef={videoRef}
                      team={team}
                      colours={colours}
                      layers={layers}
                      mode="pitch"
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex min-h-11 w-full items-center border-l-4 border-wire bg-cream px-4 py-2 text-[#111315]"
              style={{
                borderLeftColor:
                  possessionTeam === "A"
                    ? colours.A
                    : possessionTeam === "B"
                      ? colours.B
                      : "var(--wire)",
              }}
              role="status"
              aria-live="polite"
            >
              <span className="display text-[16px] font-bold uppercase">{possessionLine}</span>
            </div>

            <div className="mt-3">
              <Segmented
                ariaLabel="View mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "video", label: "Video" },
                  { value: "2d", label: "2D" },
                  { value: "both", label: "Both" },
                ]}
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className="tap grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-[#111315]"
              >
                {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="relative h-9">
                  <input
                    type="range"
                    min={0}
                    max={total}
                    step={0.1}
                    value={clock}
                    aria-label="Playback position"
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setClock(t);
                      if (videoRef.current) videoRef.current.currentTime = t;
                    }}
                    className="absolute inset-x-0 top-3 h-2 w-full appearance-none rounded-full bg-surface-3 accent-[var(--cream)]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-2">
                    {ticks.map((e) => (
                      <span
                        key={e.id}
                        className="absolute top-0 h-2 w-[2px] rounded-full"
                        style={{
                          left: `${Math.min(100, (e.t / total) * 100)}%`,
                          background: e.team === "B" ? colours.B : colours.A,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-text-faint">
                  <span className="num text-cream">{formatClock(clock)}</span>
                  <span className="num">{formatClock(total)}</span>
                </div>
              </div>
            </div>
            </div>
          </Card>

          <MatchNumbers matchId={matchId} onFilterTypes={(nextTypes) => setTypesOverride(nextTypes)} />

          <div className="flex items-center gap-3 py-1" role="separator" aria-label="Every event">
            <span className="h-px flex-1 bg-wire" />
            <h2 className="display text-[14px] uppercase text-text-dim">Every event</h2>
            <span className="h-px flex-1 bg-wire" />
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {EVENT_GROUPS.map((f) => (
              <Chip
                key={f.key}
                active={filter === f.key && !typesOverride}
                onClick={() => {
                  setTypesOverride(null);
                  setFilter(f.key);
                }}
              >
                {f.label}
              </Chip>
            ))}
            {typesOverride && (
              <Chip active onClick={() => setTypesOverride(null)}>
                Clear selection
              </Chip>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] text-text-faint">
              {confirmedCount > 0
                ? `${confirmedCount} confirmed · ${events.length} detected`
                : `${events.length} detected — confirm moments to lock the numbers`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  review.confirmMany.mutate(
                    shown.filter((e) => e.status !== "confirmed").map((e) => e.id),
                  )
                }
                disabled={shown.every((e) => e.status === "confirmed")}
                className="tap rounded-[10px] border border-cream/60 px-3 text-[11.5px] font-semibold text-cream hover:bg-cream/10 disabled:opacity-40"
              >
                Confirm all visible
              </button>
              <button
                type="button"
                onClick={() => downloadReviews(matchId, review.rows)}
                disabled={review.rows.length === 0}
                className="tap rounded-[10px] border border-wire px-3 text-[11.5px] text-text-dim hover:border-cream/50 hover:text-cream disabled:opacity-40"
              >
                Export reviews
              </button>
            </div>
          </div>

          <Card className="p-0">
            <ul>
              {shown.map((e, i) => (
                <li
                  key={e.id}
                  className={cn(
                    "feed-in flex items-center gap-2 border-b border-wire-2 pr-3 last:border-0",
                    i === focusIndex && "bg-surface-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFocusIndex(i);
                      if (videoRef.current) videoRef.current.currentTime = e.t;
                      setClock(e.t);
                    }}
                    className="tap flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left hover:bg-surface-2"
                  >
                    <span className="num w-11 shrink-0 text-[13px] text-cream">{formatClock(e.t)}</span>
                    <span
                      className={cn(
                        "h-6 w-1 shrink-0 rounded-full",
                        e.status === "detected" && "opacity-40",
                      )}
                      style={{
                        background:
                          e.status === "confirmed"
                            ? e.team === "B"
                              ? colours.B
                              : colours.A
                            : "transparent",
                        boxShadow:
                          e.status === "confirmed"
                            ? undefined
                            : `inset 0 0 0 1px ${e.team === "B" ? colours.B : colours.A}`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-text">
                        {feedLabel(e.type)}
                        {e.corrected && <span className="ml-1.5 text-[11px] text-cream-dim">fixed</span>}
                      </span>
                      <span className="block truncate text-[11.5px] text-text-faint">
                        {e.status === "confirmed" ? "confirmed" : "detected"} ·{" "}
                        {e.subtitle || e.title}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0",
                        e.type === "turnover_lost" && "text-quality-bad",
                        e.type === "better_option" && "text-quality-risky",
                        e.type === "turnover_won" && "text-quality-good",
                        e.type === "shot" && "text-cream",
                      )}
                    >
                      <Play size={13} aria-hidden="true" />
                    </span>
                  </button>
                  <EventReviewControls
                    event={e}
                    onReview={(input) => review.setVerdict.mutate(input)}
                    onFix={() => setFixing(e)}
                  />
                </li>
              ))}
              {shown.length === 0 && (
                <li className="px-3.5 py-6 text-center text-[12.5px] text-text-faint">
                  {visibleCount === 0
                    ? "Press play — moments appear as the match reaches them."
                    : "Nothing of that kind yet."}
                </li>
              )}
            </ul>

            {hiddenEvents.length > 0 && (
              <div className="border-t border-wire px-3.5 py-2.5">
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
                          className="tap shrink-0 rounded-[8px] border border-wire px-2 text-[11px] text-text-dim hover:border-cream/50 hover:text-cream"
                        >
                          Put back
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

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

          {layerSheet && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,0,0,0.6)] p-0 md:items-center md:p-6">
              <button
                type="button"
                aria-label="Close layers"
                onClick={() => setLayerSheet(false)}
                className="absolute inset-0"
              />
              <div className="relative w-full max-w-[420px] rounded-t-[16px] border border-wire bg-surface p-5 md:rounded-[16px]">
                <h2 className="display text-[17px] uppercase text-cream">Layers</h2>
                <ul className="mt-3 flex flex-col gap-1">
                  {LAYERS.map((l) => (
                    <li key={l.key}>
                      <button
                        type="button"
                        onClick={() => toggleLayer(l.key)}
                        aria-pressed={layers[l.key]}
                        className="tap flex w-full items-center justify-between rounded-[10px] px-2 text-left text-[13.5px] text-text hover:bg-surface-2"
                      >
                        {l.label}
                        <span
                          className={cn(
                            "h-4 w-4 rounded-[5px] border",
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
        </>
      )}
    </MatchShell>
  );
}
