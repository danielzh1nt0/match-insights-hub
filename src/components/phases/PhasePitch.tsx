import { useMemo } from "react";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { TeamKey } from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";
import { eventPoint } from "@/lib/pitch-coords";
import { cn } from "@/lib/utils";

export type PhaseView = "shape" | "zones" | "heat";

const ROWS = 3;
const COLS = 6;
/** The heat grid is finer than the zone grid — it is a picture, not a number. */
const HEAT_ROWS = 8;
const HEAT_COLS = 12;

/**
 * The pitch for one phase: the average shape, or where the moments happened.
 *
 * Both are read straight off the match file — the shape from the tracked
 * frames of that phase, the zones from the moments of it. Neither is drawn
 * when the file holds nothing for it.
 */
export function PhasePitch({
  view,
  frames,
  events,
  team,
  colour,
  attackLabel,
  length,
  width,
}: {
  view: PhaseView;
  frames: Frame[];
  events: ReviewedEvent[];
  team: TeamKey;
  colour: string;
  attackLabel: string;
  length: number;
  width: number;
  file?: MatchDataFile | undefined;
}) {
  const shape = useMemo(() => {
    const sums = new Map<number, { x: number; y: number; n: number; gk: boolean }>();
    for (const frame of frames) {
      for (const player of frame.players) {
        if (player.team !== team || player.state === "stale") continue;
        const cell = sums.get(player.id) ?? { x: 0, y: 0, n: 0, gk: Boolean(player.gk) };
        cell.x += (player.m[0] / length) * 100;
        cell.y += (player.m[1] / width) * 100;
        cell.n += 1;
        sums.set(player.id, cell);
      }
    }
    return [...sums.entries()]
      .filter(([, cell]) => cell.n > 0)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 11)
      .map(([id, cell]) => ({ id, x: cell.x / cell.n, y: cell.y / cell.n, gk: cell.gk }));
  }, [frames, team, length, width]);

  const zones = useMemo(() => {
    const grid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
    let total = 0;
    for (const event of events) {
      const point = eventPoint(event);
      if (!point) continue;
      const col = Math.min(COLS - 1, Math.floor((point.x / 100) * COLS));
      const rowIndex = Math.min(ROWS - 1, Math.floor((point.y / 100) * ROWS));
      grid[rowIndex]![col] = (grid[rowIndex]![col] ?? 0) + 1;
      total += 1;
    }
    return { grid, total };
  }, [events]);

  const heat = useMemo(() => {
    if (view !== "heat") return { grid: [], max: 0 };
    const grid = Array.from({ length: HEAT_ROWS }, () => Array<number>(HEAT_COLS).fill(0));
    for (const frame of frames) {
      for (const player of frame.players) {
        if (player.team !== team || player.state === "stale") continue;
        const x = Math.min(0.999, Math.max(0, player.m[0] / length));
        const y = Math.min(0.999, Math.max(0, player.m[1] / width));
        const r = Math.floor(y * HEAT_ROWS);
        const c = Math.floor(x * HEAT_COLS);
        grid[r]![c] = (grid[r]![c] ?? 0) + 1;
      }
    }
    return { grid, max: Math.max(1, ...grid.flat()) };
  }, [view, frames, team, length, width]);

  const empty =
    view === "shape" ? shape.length === 0 : view === "zones" ? zones.total === 0 : heat.max <= 1;

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <svg
        viewBox="0 0 100 64"
        className="block h-auto w-full bg-surface-2"
        role="img"
        aria-label={view === "shape" ? "Average shape" : "Where it happened"}
      >
        <rect x="0" y="0" width="100" height="64" fill="var(--surface-2)" />
        <g stroke="var(--cream)" strokeOpacity=".3" strokeWidth=".4" fill="none">
          <rect x="3" y="2" width="94" height="60" />
          <line x1="50" y1="2" x2="50" y2="62" />
          <circle cx="50" cy="32" r="8" />
          <rect x="3" y="14" width="12" height="36" />
          <rect x="85" y="14" width="12" height="36" />
        </g>

        {view === "zones" &&
          zones.total > 0 &&
          zones.grid.map((row, r) =>
            row.map((count, c) => {
              const share = count / zones.total;
              const max = Math.max(...zones.grid.flat(), 1);
              return (
                <g key={`${r}-${c}`}>
                  <rect
                    x={(100 / COLS) * c}
                    y={(64 / ROWS) * r}
                    width={100 / COLS}
                    height={64 / ROWS}
                    fill={colour}
                    fillOpacity={(count / max) * 0.6}
                    stroke="rgba(255,255,255,.12)"
                    strokeWidth=".3"
                  />
                  <text
                    x={(100 / COLS) * (c + 0.5)}
                    y={(64 / ROWS) * (r + 0.5) + 2}
                    textAnchor="middle"
                    fontSize="5"
                    fontWeight="800"
                    fill="#fff"
                    opacity={count ? 1 : 0.35}
                  >
                    {Math.round(share * 100)}%
                  </text>
                </g>
              );
            }),
          )}

        {view === "heat" &&
          heat.grid.map((row, r) =>
            row.map((count, c) =>
              count === 0 ? null : (
                <rect
                  key={`h-${r}-${c}`}
                  x={(100 / HEAT_COLS) * c}
                  y={(64 / HEAT_ROWS) * r}
                  width={100 / HEAT_COLS}
                  height={64 / HEAT_ROWS}
                  fill={colour}
                  fillOpacity={(count / heat.max) * 0.75}
                />
              ),
            ),
          )}

        {view === "shape" &&
          shape.map((player) => (
            <g key={player.id}>
              <circle
                cx={player.x}
                cy={player.y}
                r="2.7"
                fill={player.gk ? "var(--team-gk, #eab308)" : colour}
                stroke="rgba(0,0,0,.35)"
                strokeWidth=".3"
              />
              {/* No label: these are tracking ids, not shirt numbers, and a
                  follow camera splits one player into several of them. */}
            </g>
          ))}
      </svg>

      {empty && (
        <p
          className={cn(
            "absolute inset-0 grid place-items-center px-6 text-center text-[12px] text-text-faint",
          )}
        >
          {view === "zones"
            ? "No moment of this phase has a position in the match file."
            : "No tracked frames of this phase in the match file."}
        </p>
      )}

      <span className="mt-1.5 block text-right text-[8px] font-bold uppercase text-text-faint">
        → {attackLabel}
      </span>
    </div>
  );
}
