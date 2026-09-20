import type { CSSProperties } from "react";

export type FindingIconName = "press" | "counter-press" | "better-option" | "stretched" | "deep" | "low-possession" | "no-shots" | "high-turnover";

const LABELS: Record<FindingIconName, string> = {
  press: "Press together",
  "counter-press": "Counter-press",
  "better-option": "Forward passing option",
  stretched: "Team stretched",
  deep: "Defensive line depth",
  "low-possession": "Low possession",
  "no-shots": "No shots",
  "high-turnover": "High turnover",
};

export function FindingIcon({ name, size = 24, style }: { name: FindingIconName; size?: number; style?: CSSProperties }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={LABELS[name]} style={style} {...common}>
      {name === "press" && <><path d="M4 8h8l5 8-5 8H4M28 8h-8l-5 8 5 8h8"/><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none"/></>}
      {name === "counter-press" && <><path d="M7 12a10 10 0 0 1 17-3l2 3m0 0V6m0 6h-6M25 20a10 10 0 0 1-17 3l-2-3m0 0v6m0-6h6"/></>}
      {name === "better-option" && <><path d="M3 21c4.5 0 6-1.7 8-6l2-5 3.5 2-1 4c1.7 2.3 3.6 3.4 6.5 4l-1.5 5H7c-2.5 0-4-1.5-4-4Z" strokeDasharray="3 2"/><path d="M19 9h9m0 0-3.5-3.5M28 9l-3.5 3.5"/></>}
      {name === "stretched" && <><path d="M5 16h22M5 16l5-5m-5 5 5 5m17-5-5-5m5 5-5 5"/><path d="M5 7v18m22-18v18" opacity=".45"/></>}
      {name === "deep" && <><path d="M16 5v22m0-22-5 5m5-5 5 5m-5 17-5-5m5 5 5-5"/><path d="M7 5h18M7 27h18" opacity=".45"/></>}
      {name === "low-possession" && <><circle cx="16" cy="16" r="11"/><path d="M16 16V5a11 11 0 0 1 6 20Z" fill="currentColor" stroke="none"/></>}
      {name === "no-shots" && <><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M7 7l18 18"/></>}
      {name === "high-turnover" && <><path d="M8 25V13m0 0-4 4m4-4 4 4M24 25V13m0 0-4 4m4-4 4 4"/><path d="m11 9 5-5 5 5"/></>}
    </svg>
  );
}