import type { Period, TeamScope } from "@/components/ip/chrome";
import { cn } from "@/lib/utils";

export type ScopeTeam = {
  name: string;
  shortCode: string;
  kitColour: string;
  crestUrl?: string | undefined;
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "full", label: "Full" },
  { key: "1st", label: "1st" },
  { key: "2nd", label: "2nd" },
];

/**
 * Which team, which half — one scrollable row of chips.
 *
 * This used to be two full-width blocks stacked above the content, which on a
 * phone pushed the actual screen below the fold before it had said anything.
 */
export function ScopeChips({
  scope,
  onScope,
  period,
  onPeriod,
  teamA,
  teamB,
  allowBoth = true,
  halves,
  className,
}: {
  scope: TeamScope;
  onScope: (scope: TeamScope) => void;
  period?: Period | undefined;
  onPeriod?: ((period: Period) => void) | undefined;
  teamA: ScopeTeam;
  teamB: ScopeTeam;
  allowBoth?: boolean;
  /** How many periods the file holds. One means there is no half to choose. */
  halves?: number | undefined;
  className?: string;
}) {
  const teams: { key: TeamScope; team: ScopeTeam | null; label: string }[] = [
    { key: "a", team: teamA, label: teamA.shortCode },
    ...(allowBoth ? [{ key: "both" as const, team: null, label: "Both" }] : []),
    { key: "b", team: teamB, label: teamB.shortCode },
  ];

  return (
    <div
      className={cn(
        "-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex shrink-0 border border-wire bg-surface" role="group" aria-label="Team">
        {teams.map(({ key, team, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={scope === key}
            onClick={() => onScope(key)}
            title={team?.name ?? "Both teams"}
            className={cn(
              "flex min-h-11 items-center gap-1.5 px-3 text-[12px] font-bold transition-colors",
              "border-l border-wire first:border-l-0",
              scope === key
                ? "bg-accent-sea text-ink"
                : "text-text-dim hover:bg-surface-2 hover:text-text",
            )}
          >
            {team &&
              (team.crestUrl ? (
                <img src={team.crestUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: team.kitColour }}
                  aria-hidden="true"
                />
              ))}
            {label}
          </button>
        ))}
      </div>

      {/* A match the pipeline only has one period for has no half to pick, so
          the control says what you are looking at rather than offering two
          options that would both show the same thing. */}
      {period && onPeriod && halves !== undefined && halves < 2 && (
        <span className="flex min-h-11 shrink-0 items-center border border-wire bg-surface px-3 text-[12px] font-bold text-text-dim">
          First half only
        </span>
      )}

      {period && onPeriod && (halves === undefined || halves >= 2) && (
        <div
          className="flex shrink-0 border border-wire bg-surface"
          role="group"
          aria-label="Period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => onPeriod(p.key)}
              className={cn(
                "min-h-11 border-l border-wire px-3.5 text-[12px] font-bold transition-colors first:border-l-0",
                period === p.key
                  ? "bg-accent-sea text-ink"
                  : "text-text-dim hover:bg-surface-2 hover:text-text",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
