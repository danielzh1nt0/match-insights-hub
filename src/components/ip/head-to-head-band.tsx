import type { StatRow } from "@/lib/match-analysis";
import type { StatsTeamIdentity } from "@/components/ip/stats-team-selector";
import { Crest } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";

/** The number inside a formatted cell, or null when the file could not supply one. */
function numberIn(value: string): number | null {
  const match = /-?\d+(\.\d+)?/.exec(value);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Us against them, for the metrics of one tab.
 *
 * The pipeline computes roughly twenty figures that had no home on the screen —
 * seconds with the ball, passes per spell, team-mates near at two seconds,
 * PPDA, block width, line height, forward share, progressive passes, field tilt
 * and the rest. They were being calculated on every match and thrown away.
 *
 * They belong here rather than in their own cards, because every one of them
 * only means something next to the opponent's version of the same number: 54%
 * possession is neither good nor bad until you know they had 46%. This is also
 * the shape every other product in the category opens its match report with.
 *
 * A row whose figure the match file cannot support shows a dash and no bar,
 * rather than a bar at zero — an unmeasured number must not look like a bad one.
 */
export function HeadToHeadBand({
  rows,
  teamA,
  teamB,
  title,
}: {
  rows: StatRow[];
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
  title: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="border border-wire bg-surface" aria-label={`${title}: both teams`}>
      <header className="flex items-center justify-between gap-3 border-b border-wire px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-center gap-2">
          <Crest team={teamA} size={22} />
          <span className="label-sm truncate text-text">{teamA.shortCode}</span>
        </span>
        <span className="label-xs shrink-0 text-text-faint">{title}</span>
        <span className="flex min-w-0 flex-row-reverse items-center gap-2">
          <Crest team={teamB} size={22} />
          <span className="label-sm truncate text-text">{teamB.shortCode}</span>
        </span>
      </header>

      <dl className="rule-y">
        {rows.map((row) => (
          <Row key={row.label} row={row} teamA={teamA} teamB={teamB} />
        ))}
      </dl>
    </section>
  );
}

function Row({
  row,
  teamA,
  teamB,
}: {
  row: StatRow;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
}) {
  const a = numberIn(row.a);
  const b = numberIn(row.b);
  // Each side's bar is its share of the pair, so the two always read against
  // each other rather than against an invented maximum.
  const total = a !== null && b !== null ? Math.abs(a) + Math.abs(b) : null;
  const aPct = total && total > 0 ? (Math.abs(a!) / total) * 100 : null;
  const leads = a !== null && b !== null ? (a > b ? "a" : a < b ? "b" : null) : null;

  return (
    <div className="grid grid-cols-[minmax(52px,auto)_minmax(0,1fr)_minmax(52px,auto)] items-center gap-3 px-4 py-2.5 sm:px-5">
      <dd
        className={cn(
          "num-flat text-left text-[13.5px]",
          leads === "a" ? "text-text-bright" : "text-text-dim",
        )}
      >
        {row.a}
      </dd>

      <div className="min-w-0">
        <dt className="text-center text-[12px] leading-tight text-text-dim">
          {row.label}
          {row.target && <span className="label-xs ml-2 text-text-faint">target {row.target}</span>}
        </dt>
        {aPct === null ? (
          <div className="mt-1.5 h-[5px] w-full bg-surface-2" aria-hidden="true" />
        ) : (
          <div className="mt-1.5 flex h-[5px] w-full gap-px" aria-hidden="true">
            <span style={{ width: `${aPct}%`, background: teamA.kitColour }} />
            <span style={{ width: `${100 - aPct}%`, background: teamB.kitColour }} />
          </div>
        )}
      </div>

      <dd
        className={cn(
          "num-flat text-right text-[13.5px]",
          leads === "b" ? "text-text-bright" : "text-text-dim",
        )}
      >
        {row.b}
      </dd>
    </div>
  );
}
