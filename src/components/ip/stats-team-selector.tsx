import { Button } from "./primitives";
import type { TeamScope } from "./chrome";
import { TeamToken, type TeamIdentity } from "@/components/team/TeamToken";
import { cn } from "@/lib/utils";

export type StatsTeamIdentity = TeamIdentity;

export function StatsTeamSelector({
  value,
  onChange,
  teamA,
  teamB,
}: {
  value: TeamScope;
  onChange: (value: TeamScope) => void;
  teamA: StatsTeamIdentity;
  teamB: StatsTeamIdentity;
}) {
  return (
    <div role="group" aria-label="Team" className="grid w-full grid-cols-[1fr_auto_1fr] gap-2 rounded-[8px] border border-wire bg-surface p-2">
      <Button
        variant="ghost"
        aria-pressed={value === "a"}
        aria-label={`Show ${teamA.name} only`}
        onClick={() => onChange("a")}
        className={cn("h-auto min-h-14 min-w-0 justify-start px-2", value !== "a" && "border border-wire")}
        style={value === "a" ? { background: teamA.kitColour, color: "var(--text)" } : undefined}
      >
        <TeamToken identity={teamA} size="md" state={value === "a" ? "compare" : "inactive"} />
      </Button>
      <Button
        variant="ghost"
        aria-pressed={value === "both"}
        onClick={() => onChange("both")}
        className={cn("h-auto min-h-14 min-w-12 px-2", value === "both" ? "border border-cream text-cream" : "border border-transparent text-text-faint")}
      >
        Both
      </Button>
      <Button
        variant="ghost"
        aria-pressed={value === "b"}
        aria-label={`Show ${teamB.name} only`}
        onClick={() => onChange("b")}
        className={cn("h-auto min-h-14 min-w-0 justify-end px-2", value !== "b" && "border border-wire")}
        style={value === "b" ? { background: teamB.kitColour, color: "var(--text)" } : undefined}
      >
        <TeamToken identity={teamB} size="md" state={value === "b" ? "compare" : "inactive"} mirrored />
      </Button>
    </div>
  );
}

export function StatsTeamPill({ identity, both }: { identity: StatsTeamIdentity; both?: StatsTeamIdentity }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-[6px] bg-surface-2 px-2 py-1">
      <TeamToken identity={identity} size="sm" state="compare" suffix={both ? undefined : " · Only"} />
      {both && <><span className="display text-[9px] text-text-faint">vs</span><TeamToken identity={both} size="sm" state="compare" /></>}
    </span>
  );
}