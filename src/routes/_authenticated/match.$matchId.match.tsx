import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip, Pill, Segmented } from "@/components/ip/primitives";
import { MomentumStrip, Pitch, PitchDots } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
import {
  EVENT_GROUPS,
  fetchMatchData,
  feedLabel,
  groupTypes,
  videoSrc,
  type FeedEvent,
} from "@/lib/match-source";
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

function MatchScreen() {
  const { matchId } = Route.useParams();
  const { t: startT } = Route.useSearch();
  const { match, data, item } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const [mode, setMode] = useState<Mode>("video");
  const [filter, setFilter] = useState<string>("all");
  const [clock, setClock] = useState<number>(startT ?? 0);
  const [visibleCount, setVisibleCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seededRef = useRef(false);

  const row = item?.row ?? null;

  const { data: matchData, isPending: dataPending } = useQuery({
    queryKey: ["match-data", matchId],
    queryFn: () => fetchMatchData(row!),
    enabled: Boolean(row),
    staleTime: Infinity,
  });

  const { data: videoUrl } = useQuery({
    queryKey: ["match-video", matchId],
    queryFn: () => videoSrc(row!),
    enabled: Boolean(row),
    staleTime: 30 * 60_000,
  });

  const events: FeedEvent[] = matchData?.events ?? [];
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

  const types = groupTypes(filter);
  const shown = useMemo(() => {
    const visible = events.slice(0, visibleCount);
    const filtered = types ? visible.filter((e) => types.includes(e.type)) : visible;
    return filtered.slice().reverse();
  }, [events, visibleCount, types]);

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

      {dataPending && (
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
            <div className="relative mx-auto aspect-[16/10] w-full max-w-[880px] overflow-hidden rounded-[12px] bg-surface-2">
              {mode === "2d" ? (
                <Pitch className="h-full">{data && <PitchDots points={data.heat} color="var(--team-a)" radius={1.4} />}</Pitch>
              ) : (
                <video
                  ref={videoRef}
                  {...(videoUrl ? { src: videoUrl } : {})}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`Match video, ${match.teamA} against ${match.teamB}`}
                  className="h-full w-full bg-black object-contain"
                />
              )}
              <span className="pointer-events-none absolute left-3 top-3">
                <Pill tone="cream">{`${match.teamA.split(" ").at(-1)} · controlled`}</Pill>
              </span>
              {mode === "both" && data && (
                <div className="pointer-events-none absolute bottom-14 right-3 w-[38%] overflow-hidden rounded-[10px] border border-wire">
                  <Pitch>
                    <PitchDots points={data.heat.slice(0, 12)} color="var(--team-a)" radius={1.6} />
                  </Pitch>
                </div>
              )}
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

            <div className="mt-3">
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
                  {events.map((e) => (
                    <span
                      key={e.id}
                      className="absolute top-0 h-2 w-[2px] rounded-full"
                      style={{
                        left: `${Math.min(100, (e.t / total) * 100)}%`,
                        background: e.team === "A" ? "var(--team-a)" : "var(--team-b)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-text-faint">
                <span className="num text-cream">{formatClock(clock)}</span>
                <span className="num">{formatClock(total)}</span>
              </div>
              {data && <MomentumStrip values={data.momentum} className="mt-1 h-8" />}
            </div>
          </Card>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {EVENT_GROUPS.map((f) => (
              <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </Chip>
            ))}
          </div>

          <Card className="p-0">
            <ul>
              {shown.map((e) => (
                <li key={e.id} className="feed-in">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = e.t;
                      setClock(e.t);
                    }}
                    className="tap flex w-full items-center gap-3 border-b border-wire-2 px-3.5 py-3 text-left last:border-0 hover:bg-surface-2"
                  >
                    <span className="num w-11 shrink-0 text-[13px] text-cream">{formatClock(e.t)}</span>
                    <span
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ background: e.team === "A" ? "var(--team-a)" : "var(--team-b)" }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-text">{feedLabel(e.type)}</span>
                      <span className="block truncate text-[11.5px] text-text-faint">
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
          </Card>
        </>
      )}
    </MatchShell>
  );
}
