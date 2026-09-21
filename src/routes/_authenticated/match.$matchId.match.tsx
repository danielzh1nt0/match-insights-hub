import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { MatchCanvas, LAYERS, PRESETS, presetLayers, type LayerKey, type PresetKey } from "@/components/ip/match-canvas";
import { Card, Segmented } from "@/components/ip/primitives";
import { EventFixSheet } from "@/components/ip/event-review";
import {
  DEFAULT_EVENT_FILTER,
  EventFilter,
  eventMatchesFilter,
  type EventFilterValue,
} from "@/components/ip/event-filter";
import { EventRow } from "@/components/match/EventRow";
import { MatchNumbers, type MatchNumberTile } from "@/components/match/MatchNumbers";
import { MomentumStrip } from "@/components/match/MomentumStrip";
import { PlaybackBar } from "@/components/match/PlaybackBar";
import type { StatIconName } from "@/components/match/StatIcon";
import { useAnalysis } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
import { countEvents, downloadReviews, type ReviewedEvent } from "@/lib/event-reviews";
import { feedLabel, videoSrc, type Frame } from "@/lib/match-source";
import { teamRow } from "@/lib/match-analysis";
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

const EVENT_ICONS: Record<string, StatIconName> = {
  goal: "goal", shot: "shot", shot_blocked: "attempt", turnover_won: "turnover-won",
  turnover_lost: "turnover-lost", high_turnover: "high-turnover", set_piece: "free-kick",
  pass_bad: "pass", pass_risky: "pass", better_option: "better-option", sequence_end: "sequence",
};

function eventMetric(events: ReviewedEvent[], team: "A" | "B", test: (event: ReviewedEvent) => boolean) {
  const count = countEvents(events, (event) => event.team === team && test(event));
  return count.confirmed > 0 ? count.confirmed : count.detected;
}

function kindIs(event: ReviewedEvent, kind: string) {
  const payload = event.payload ?? {};
  return String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "").toLowerCase().includes(kind);
}

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
    review,
  } = useAnalysis(matchId, scope);
  const [typesOverride, setTypesOverride] = useState<string[] | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [fixing, setFixing] = useState<ReviewedEvent | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [filter, setFilter] = useState<EventFilterValue>(DEFAULT_EVENT_FILTER);
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

  const { data: videoUrl } = useQuery({
    queryKey: ["match-video", matchId],
    queryFn: () => videoSrc(row!),
    enabled: Boolean(row),
    staleTime: 30 * 60_000,
  });

  const total = row?.duration_s ?? match?.durationS ?? 1;
  const teamAStats = teamRow(stats, "A");
  const teamBStats = teamRow(stats, "B");
  const reliableBall = row?.summary?.["ball_reliable"] !== false;
  const grade = (row?.summary?.["ball_grade"] ?? null) as { possession_ok?: boolean; events_ok?: boolean } | null;
  const layerAllowed = (needs: null | "possession" | "events") =>
    needs === null ? true : grade ? Boolean(needs === "possession" ? grade.possession_ok : grade.events_ok) : reliableBall;
  const shownLayers = Object.fromEntries(
    LAYERS.map((l) => [l.key, layers[l.key] && layerAllowed(l.needs)]),
  ) as Record<LayerKey, boolean>;
  const tiles = useMemo<MatchNumberTile[]>(() => [
    { icon: "goal", label: "Goals", valueA: eventMetric(events, "A", (e) => e.type === "goal"), valueB: eventMetric(events, "B", (e) => e.type === "goal") },
    { icon: "shot", label: "Shots", valueA: eventMetric(events, "A", (e) => e.type === "shot"), valueB: eventMetric(events, "B", (e) => e.type === "shot") },
    { icon: "corner", label: "Corners", valueA: eventMetric(events, "A", (e) => e.type === "set_piece" && kindIs(e, "corner")), valueB: eventMetric(events, "B", (e) => e.type === "set_piece" && kindIs(e, "corner")) },
    { icon: "free-kick", label: "Free kicks", valueA: eventMetric(events, "A", (e) => e.type === "set_piece" && kindIs(e, "free")), valueB: eventMetric(events, "B", (e) => e.type === "set_piece" && kindIs(e, "free")) },
    { icon: "attempt", label: "Attempts", valueA: eventMetric(events, "A", (e) => e.type === "shot" || e.type === "shot_blocked"), valueB: eventMetric(events, "B", (e) => e.type === "shot" || e.type === "shot_blocked") },
    { icon: "possession", label: "Possession", valueA: Math.round(teamAStats?.possession_pct ?? 0), valueB: Math.round(teamBStats?.possession_pct ?? 0), unit: "%", unreliable: !reliableBall },
  ], [events, teamAStats?.possession_pct, teamBStats?.possession_pct, reliableBall]);
  const momentumWindows = useMemo(() => {
    const frames = file?.frames ?? [];
    const windows: { t: number; tiltA: number }[] = [];
    for (let start = 0; start < total; start += 15) {
      const sample = frames.filter((candidate) => candidate.t >= start && candidate.t < start + 15 && candidate.possession);
      if (sample.length === 0) continue;
      windows.push({ t: start, tiltA: sample.filter((candidate) => candidate.possession === "A").length / sample.length });
    }
    return windows;
  }, [file?.frames, total]);
  const momentumEvents = useMemo<{ t: number; type: "goal" | "turnover"; team: "A" | "B" }[]>(() => {
    const markers: { t: number; type: "goal" | "turnover"; team: "A" | "B" }[] = [];
    for (const event of events) {
      if (!event.team) continue;
      if (event.type === "goal") markers.push({ t: event.t, type: "goal", team: event.team });
      else if (["turnover_lost", "turnover_won", "high_turnover"].includes(event.type)) markers.push({ t: event.t, type: "turnover", team: event.team });
    }
    return markers;
  }, [events]);
  const playbackMarkers = useMemo(() => (team ? events.filter((event) => event.team === team) : events).flatMap((event) => event.team ? [{ t: event.t, team: event.team, kind: event.type === "goal" ? "goal" as const : "event" as const }] : []), [events, team]);
  const screenVars = { "--team-a": colours.A, "--team-b": colours.B } as CSSProperties;
  const identities: Record<"A" | "B", TeamIdentity> | null = match ? {
    A: { name: match.teamA, shortCode: shortTeamCode(match.teamA), kitColour: colours.A, ...(crestForTeam(match.teamA) ? { crestUrl: crestForTeam(match.teamA) } : {}) },
    B: { name: match.teamB, shortCode: shortTeamCode(match.teamB), kitColour: colours.B, ...(crestForTeam(match.teamB) ? { crestUrl: crestForTeam(match.teamB) } : {}) },
  } : null;
  const seek = useCallback((time: number) => {
    const next = Math.max(0, Math.min(total, time));
    setClock(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  }, [total]);


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

  const shown = useMemo(() => {
    const visible = events.slice(0, visibleCount);
    const byTeam = team ? visible.filter((e) => e.team === team) : visible;
    const filtered = typesOverride
      ? byTeam.filter((e) => typesOverride.includes(e.type))
      : byTeam.filter((e) => eventMatchesFilter(e, filter));
    return filtered.slice().reverse();
  }, [events, visibleCount, typesOverride, filter, team]);

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
        <div style={screenVars}>
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
                    layers={shownLayers}
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
                  layers={shownLayers}
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "Leave fullscreen" : "Fullscreen"}
                  className="tap grid h-8 w-8 place-items-center rounded-full bg-[rgba(0,0,0,0.5)] text-cream backdrop-blur-md"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={fullscreen ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"}/></svg>
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
                      layers={shownLayers}
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

            </div>
          </Card>

          <PlaybackBar playing={playing} currentTime={clock} duration={total} markers={playbackMarkers} onPlayPause={togglePlay} onSeek={seek} onFullscreen={toggleFullscreen} />
          <MomentumStrip windows={momentumWindows} events={momentumEvents} durationSeconds={total} currentTime={clock} onSeek={seek} />
          <MatchNumbers tiles={tiles} onTileTap={(label) => {
            const tile = tiles.find((candidate) => candidate.label === label);
            if (!tile) return;
            const types = label === "Goals" ? ["goal"] : label === "Shots" ? ["shot"] : label === "Corners" || label === "Free kicks" ? ["set_piece"] : label === "Attempts" ? ["shot", "shot_blocked"] : [];
            setTypesOverride(types.length ? types : null);
          }} />

          <div className="flex items-center gap-3 py-1" role="separator" aria-label="Every event">
            <span className="h-px flex-1 bg-wire" />
            <h2 className="display text-[14px] uppercase text-text-dim">Every event</h2>
            <span className="h-px flex-1 bg-wire" />
          </div>

          <EventFilter
            value={filter}
            onChange={(next) => {
              setTypesOverride(null);
              setFilter(next);
            }}
            events={events}
            teamNames={{ A: match.teamA, B: match.teamB }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] font-medium text-text-faint">
              <strong className="font-semibold text-text">{events.length} events</strong>
              <span className="mx-1.5">·</span>
              Tap a moment to confirm
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

          <div style={{ padding: "8px 16px 0" }}>
            <ul>
              {shown.map((e, i) => (
                <li key={e.id}>
                   {identities && <EventRow time={formatClock(e.t)} icon={EVENT_ICONS[e.type] ?? "sequence"} iconTint={e.type.includes("won") ? "good" : e.type.includes("lost") || e.type === "pass_bad" ? "bad" : "default"} team={e.team === "B" ? "B" : "A"} identity={identities[e.team === "B" ? "B" : "A"]} title={feedLabel(e.type)} subtitle={`${e.status === "confirmed" ? "confirmed" : "detected"}${e.corrected ? " · fixed" : ""} · ${e.subtitle || e.title}`} state={e.status === "confirmed" ? "confirmed" : "untouched"} focused={i === focusIndex} onPlay={() => { setFocusIndex(i); seek(e.t); }} onConfirm={() => e.status === "confirmed" ? setFixing(e) : review.setVerdict.mutate({ eventId: e.id, verdict: "confirmed" })} onHide={() => review.setVerdict.mutate({ eventId: e.id, verdict: "deleted" })} />}
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
          </div>

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
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const active = (Object.keys(layers) as LayerKey[]).every((k) => layers[k] === presetLayers(p.key)[k]);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.key)}
                        aria-pressed={active}
                        className={cn(
                          "tap h-10 rounded-[10px] border text-[13px] font-semibold",
                          active ? "border-cream bg-cream text-[#111315]" : "border-wire text-text hover:bg-surface-2",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] uppercase tracking-wide text-text-dim">Custom · up to 3 besides players</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {LAYERS.map((l) => (
                    <li key={l.key}>
                      <button
                        type="button"
                        onClick={() => layerAllowed(l.needs) && toggleLayer(l.key)}
                        aria-pressed={layers[l.key]}
                        aria-disabled={!layerAllowed(l.needs)}
                        title={layerAllowed(l.needs) ? undefined : "Needs reliable ball tracking"}
                        className={cn(
                          "tap flex w-full items-center justify-between rounded-[10px] px-2 text-left text-[13.5px] text-text hover:bg-surface-2",
                          !layerAllowed(l.needs) && "opacity-40",
                        )}
                      >
                        <span>
                          {l.label}
                          {!layerAllowed(l.needs) && <span className="ml-2 text-[11px] text-text-dim">needs reliable ball</span>}
                        </span>
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
        </div>
      )}
    </MatchShell>
  );
}
