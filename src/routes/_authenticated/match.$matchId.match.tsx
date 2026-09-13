import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Video } from "lucide-react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip, Pill, Segmented } from "@/components/ip/primitives";
import { MomentumStrip, Pitch, PitchDots } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";
import { EVENT_FILTERS, EVENT_LABEL, EVENT_TONE, eventsFor } from "@/lib/match-data";
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
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("both");
  const [period, setPeriod] = useState<Period>("full");
  const [mode, setMode] = useState<Mode>("video");
  const [filter, setFilter] = useState<string>("all");
  const [playhead, setPlayhead] = useState<number>(startT ?? 0);

  const total = match?.durationS ?? 1;
  const shown = data ? eventsFor(filter, data.events) : [];

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {data && match && (
        <>
          <Card className="p-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-surface-2">
              {mode === "2d" ? (
                <Pitch className="h-full">
                  <PitchDots points={data.heat} color="var(--team-a)" radius={1.4} />
                </Pitch>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-faint">
                  <Video size={26} aria-hidden="true" />
                  <span className="text-[11.5px]">Video placeholder</span>
                </div>
              )}
              <span className="absolute left-3 top-3">
                <Pill tone="cream">{`${match.teamA.split(" ").at(-1)} · controlled`}</Pill>
              </span>
              {mode === "both" && (
                <div className="absolute bottom-3 right-3 w-[38%] overflow-hidden rounded-[10px] border border-wire">
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
                  value={playhead}
                  aria-label="Playback position"
                  onChange={(e) => setPlayhead(Number(e.target.value))}
                  className="absolute inset-x-0 top-3 h-2 w-full appearance-none rounded-full bg-surface-3 accent-[var(--cream)]"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-2">
                  {data.events.map((e) => (
                    <span
                      key={e.id}
                      className="absolute top-0 h-2 w-[2px] rounded-full"
                      style={{
                        left: `${(e.t / total) * 100}%`,
                        background: e.kind === "goal" ? "var(--cream)" : "var(--text-faint)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-text-faint">
                <span className="num text-cream">{formatClock(playhead)}</span>
                <span className="num">{formatClock(total)}</span>
              </div>
              <MomentumStrip values={data.momentum} className="mt-1 h-8" />
            </div>
          </Card>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {EVENT_FILTERS.map((f) => (
              <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </Chip>
            ))}
          </div>

          <Card className="p-0">
            <ul>
              {shown.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setPlayhead(e.t)}
                    className="tap flex w-full items-center gap-3 border-b border-wire-2 px-3.5 py-3 text-left last:border-0 hover:bg-surface-2"
                  >
                    <span className="num w-11 shrink-0 text-[13px] text-cream">{formatClock(e.t)}</span>
                    <span
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ background: e.team === "a" ? "var(--team-a)" : "var(--team-b)" }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] text-text">{EVENT_LABEL[e.kind]}</span>
                      <span className="block truncate text-[11.5px] text-text-faint">
                        {e.note || e.player || (e.team === "a" ? match.teamA : match.teamB)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0",
                        EVENT_TONE[e.kind] === "bad" && "text-quality-bad",
                        EVENT_TONE[e.kind] === "risky" && "text-quality-risky",
                        EVENT_TONE[e.kind] === "good" && "text-quality-good",
                        EVENT_TONE[e.kind] === "cream" && "text-cream",
                        EVENT_TONE[e.kind] === "neutral" && "text-text-faint",
                      )}
                    >
                      <Play size={13} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="px-3.5 py-6 text-center text-[12.5px] text-text-faint">
                  Nothing of that kind in this half.
                </li>
              )}
            </ul>
          </Card>
        </>
      )}
    </MatchShell>
  );
}
