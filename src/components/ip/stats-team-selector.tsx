import { Button } from "./primitives";
import type { TeamScope } from "./chrome";
import { cn } from "@/lib/utils";

export type StatsTeamIdentity = {
  name: string;
  code: string;
  colour: string;
  crest?: string;
};

function isLightColour(colour: string) {
  const hex = colour.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function IdentityMark({ identity }: { identity: StatsTeamIdentity }) {
  return identity.crest ? (
    <img src={identity.crest} alt="" className="h-[22px] w-[22px] shrink-0 object-contain" />
  ) : (
    <span
      className="display grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[4px] text-[10px] text-text"
      style={{ background: identity.colour }}
      aria-hidden="true"
    >
      {identity.code.slice(0, 1)}
    </span>
  );
}

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
  const teams = [
    { value: "a" as const, identity: teamA },
    { value: "b" as const, identity: teamB },
  ];
  return (
    <div role="group" aria-label="Team" className="grid w-full grid-cols-3 gap-1 rounded-[8px] border border-wire bg-surface p-1">
      <Button
        variant="ghost"
        aria-pressed={value === "a"}
        aria-label={`Show ${teamA.name} only`}
        onClick={() => onChange("a")}
        className={cn("h-11 min-w-0 px-2", value !== "a" && "border border-wire text-text-faint")}
        style={value === "a" ? { background: teamA.colour, color: isLightColour(teamA.colour) ? "var(--ink)" : "var(--text)" } : undefined}
      >
        <IdentityMark identity={teamA} />
        <span className="display truncate text-[11px]">{teamA.code}</span>
      </Button>
      <Button
        variant="ghost"
        aria-pressed={value === "both"}
        onClick={() => onChange("both")}
        className={cn("h-11 min-w-0 px-2", value === "both" ? "border border-cream text-cream" : "border border-transparent text-text-faint")}
      >
        Both
      </Button>
      <Button
        variant="ghost"
        aria-pressed={value === "b"}
        aria-label={`Show ${teamB.name} only`}
        onClick={() => onChange("b")}
        className={cn("h-11 min-w-0 px-2", value !== "b" && "border border-wire text-text-faint")}
        style={value === "b" ? { background: teamB.colour, color: isLightColour(teamB.colour) ? "var(--ink)" : "var(--text)" } : undefined}
      >
        <IdentityMark identity={teamB} />
        <span className="display truncate text-[11px]">{teamB.code}</span>
      </Button>
    </div>
  );
}

export function StatsTeamPill({ identity, both }: { identity: StatsTeamIdentity; both?: StatsTeamIdentity }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-[14px] bg-surface-2 px-2 text-[10px] font-semibold uppercase text-text-faint">
      <span className="h-2 w-2 rounded-full" style={{ background: identity.colour }} aria-hidden="true" />
      {identity.crest && <img src={identity.crest} alt="" className="h-4 w-4 object-contain" />}
      <span>{identity.code}{both ? ` + ${both.code}` : " · Only"}</span>
    </span>
  );
}