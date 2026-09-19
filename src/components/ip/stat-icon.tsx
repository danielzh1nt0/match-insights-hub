import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type StatIconName =
  | "goals"
  | "shots"
  | "on-target"
  | "corners"
  | "free-kicks"
  | "offsides"
  | "fouls"
  | "attempts"
  | "possession"
  | "passes"
  | "progressive-passes"
  | "turnovers-won"
  | "turnovers-lost"
  | "high-turnovers"
  | "field-tilt"
  | "pressing-intensity"
  | "counterpress"
  | "block-length"
  | "line-height"
  | "better-option";

const LABELS: Record<StatIconName, string> = {
  goals: "Goals",
  shots: "Shots",
  "on-target": "On target",
  corners: "Corners",
  "free-kicks": "Free kicks",
  offsides: "Offsides",
  fouls: "Fouls",
  attempts: "Attempts",
  possession: "Possession",
  passes: "Passes",
  "progressive-passes": "Progressive passes",
  "turnovers-won": "Turnovers won",
  "turnovers-lost": "Turnovers lost",
  "high-turnovers": "High turnovers",
  "field-tilt": "Field tilt",
  "pressing-intensity": "Pressing intensity",
  counterpress: "Counterpress",
  "block-length": "Block length",
  "line-height": "Line height",
  "better-option": "Better pass available",
};

export function StatIcon({
  name,
  size = 32,
  className,
  label,
  style,
}: {
  name: StatIconName;
  size?: number;
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? LABELS[name]}
      className={cn("h-7 w-7 shrink-0 md:h-8 md:w-8", className)}
      style={style}
      {...common}
    >
      {name === "goals" && (
        <>
          <path d="m16 4 8.8 6.4-3.4 10.4H10.6L7.2 10.4 16 4Z" />
          <path d="m16 11 4 2.8-1.5 4.7h-5L12 13.8l4-2.8Zm0 0V4m4 9 4.8-2.6m-6.3 8.1 2.9 2.3m-7.9-2.3-2.9 2.3M12 13l-4.8-2.6" />
        </>
      )}
      {name === "shots" && (
        <>
          <circle cx="14" cy="17" r="9" /><circle cx="14" cy="17" r="4" />
          <path d="m19 12 8-8m-3 0h3v3m-11 10 8-8" />
        </>
      )}
      {name === "on-target" && (
        <>
          <circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="5" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16" r="1.6" fill="var(--surface)" stroke="none" />
        </>
      )}
      {name === "corners" && (
        <>
          <path d="M8 27V5m0 2h13l-3.2 4L21 15H8M5 27h10" />
          <path d="M8 22a5 5 0 0 1 5 5" />
        </>
      )}
      {name === "free-kicks" && (
        <>
          <path d="M9 6c4.5 1 8 3.6 10.5 7.5l-4.2 3.2C12 13.8 9 10.4 9 6Z" />
          <path d="m19.5 13.5 6.2 7.7-4.5 3.4-5.9-7.9M7 8 4.5 5.5M23 21l2 2" />
        </>
      )}
      {name === "offsides" && (
        <>
          <path d="M4 18h24" strokeDasharray="3 3" /><path d="M8 11h13m0 0-4-4m4 4-4 4" />
          <circle cx="9" cy="23" r="2" />
        </>
      )}
      {name === "fouls" && <path d="m18 3-11 15h8l-1 11 11-16h-8l1-10Z" />}
      {name === "attempts" && (
        <>
          <path d="M7 25 24 8m-9 0h9v9" /><path d="M7 11v14h14" opacity=".45" />
        </>
      )}
      {name === "possession" && (
        <>
          <circle cx="16" cy="16" r="11" /><path d="M16 16V5a11 11 0 0 1 9.5 16.5L16 16Z" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "passes" && (
        <>
          <path d="M5 20c5 0 7-2 9-7l3-7 4 2-1.5 6c2 2.8 4.5 4.2 7.5 5l-2 6H10c-3 0-5-2-5-5Z" />
          <path d="M14 13c1.5 2 3.3 3 5.5 3" />
        </>
      )}
      {name === "progressive-passes" && (
        <>
          <path d="M3 21c4.5 0 6-1.7 8-6l2-5 3.5 2-1 4c1.7 2.3 3.6 3.4 6.5 4l-1.5 5H7c-2.5 0-4-1.5-4-4Z" />
          <path d="M19 9h9m0 0-3.5-3.5M28 9l-3.5 3.5" />
        </>
      )}
      {name === "better-option" && (
        <>
          <path d="M3 21c4.5 0 6-1.7 8-6l2-5 3.5 2-1 4c1.7 2.3 3.6 3.4 6.5 4l-1.5 5H7c-2.5 0-4-1.5-4-4Z" strokeDasharray="3 2" />
          <path d="M19 9h9m0 0-3.5-3.5M28 9l-3.5 3.5" />
        </>
      )}
      {name === "turnovers-won" && (
        <><circle cx="16" cy="16" r="11" /><path d="M16 23V9m0 0-5 5m5-5 5 5" /></>
      )}
      {name === "turnovers-lost" && (
        <><circle cx="16" cy="16" r="11" /><path d="M16 9v14m0 0-5-5m5 5 5-5" /></>
      )}
      {name === "high-turnovers" && (
        <>
          <path d="M8 25V13m0 0-4 4m4-4 4 4M24 25V13m0 0-4 4m4-4 4 4" />
          <path d="m11 9 5-5 5 5" />
        </>
      )}
      {name === "field-tilt" && (
        <>
          <path d="M4 6h24v20H4zM16 6v20m0-7h7m0 0-3-3m3 3-3 3" /><path d="M4 11h5v10H4" />
        </>
      )}
      {name === "pressing-intensity" && (
        <>
          <path d="M4 9h8l5 7-5 7H4m24-14h-8l-5 7 5 7h8" />
          <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "counterpress" && (
        <>
          <path d="M7 12a10 10 0 0 1 17-3l2 3m0 0V6m0 6h-6M25 20a10 10 0 0 1-17 3l-2-3m0 0v6m0-6h6" />
        </>
      )}
      {name === "block-length" && (
        <>
          <path d="M5 16h22M5 16l5-5m-5 5 5 5m17-5-5-5m5 5-5 5" /><path d="M5 7v18m22-18v18" opacity=".45" />
        </>
      )}
      {name === "line-height" && (
        <>
          <path d="M16 5v22m0-22-5 5m5-5 5 5m-5 17-5-5m5 5 5-5" /><path d="M7 5h18M7 27h18" opacity=".45" />
        </>
      )}
    </svg>
  );
}

export const STAT_ICON_NAMES = Object.keys(LABELS) as StatIconName[];
export const statIconLabel = (name: StatIconName) => LABELS[name];