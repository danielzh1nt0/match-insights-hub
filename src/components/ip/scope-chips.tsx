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
  className,
}: {
  scope: TeamScope;
  onScope: (scope: TeamScope) => void;
  period?: Period | undefined;
  onPeriod?: ((period: Period) => void) | undefined;
  teamA: ScopeTeam;
  teamB: ScopeTeam;
  allowBoth?: boolean;
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
      <div
        className="flex shrink-0 gap-[2px] border border-wire bg-surface p-[3px]"
        role="group"
        aria-label="Team"
      >
        {teams.map(({ key, team, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={scope === key}
            onClick={() => onScope(key)}
            title={team?.name ?? "Both teams"}
            className={cn(
              "flex min-h-9 items-center gap-1.5 px-2.5 text-[12px] font-bold transition-colors",
              scope === key ? "bg-surface-3 text-text" : "text-text-faint hover:text-text",
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

      {period && onPeriod && (
        <div
          className="flex shrink-0 gap-[2px] border border-wire bg-surface p-[3px]"
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
                "min-h-9 px-3 text-[12px] font-bold transition-colors",
                period === p.key ? "bg-surface-3 text-text" : "text-text-faint hover:text-text",
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
