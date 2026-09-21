import type { StatIconName } from "./StatIcon";
import { StatIcon } from "./StatIcon";
import { TeamToken, type TeamIdentity } from "@/components/team/TeamToken";

export function EventRow({ time, icon, iconTint = "default", team, identity, title, subtitle, state, focused, onPlay, onConfirm, onHide }: {
  time: string;
  icon: StatIconName;
  iconTint?: "default" | "good" | "warn" | "bad";
  team: "A" | "B";
  identity: TeamIdentity;
  title: string;
  subtitle?: string;
  state: "confirmed" | "hidden" | "untouched";
  focused?: boolean;
  onPlay: () => void;
  onConfirm: () => void;
  onHide: () => void;
}) {
  const tint = iconTint === "good" ? "var(--reaction-good)" : iconTint === "warn" ? "var(--reaction-warn)" : iconTint === "bad" ? "var(--reaction-bad)" : "var(--cream)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 32px minmax(0,1fr) auto", gap: "10px", alignItems: "center", padding: "10px 12px", border: "1px solid var(--wire)", borderRadius: "10px", background: state === "confirmed" || focused ? "var(--surface-2)" : "none", borderLeft: state === "confirmed" ? "3px solid var(--reaction-good)" : "1px solid var(--wire)", marginBottom: "8px", opacity: state === "hidden" ? 0.4 : 1 }}>
      <button type="button" onClick={onPlay} aria-label={`Play at ${time}`} style={{ minWidth: "44px", minHeight: "44px", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)", fontFamily: "Barlow Condensed, sans-serif", fontSize: "15px", fontWeight: 700 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="var(--cream)" aria-hidden="true"><polygon points="8,5 19,12 8,19" /></svg>{time}</button>
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--wire)" }}><StatIcon name={icon} size={14} color={tint} /></div>
       <div style={{ minWidth: 0 }}><div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}><TeamToken identity={identity} size="sm" state="compare" />{title}</div>{subtitle && <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>}</div>
      <div style={{ display: "flex", gap: "4px" }}><button type="button" onClick={onConfirm} aria-label="Confirm" aria-pressed={state === "confirmed"} style={{ width: "44px", height: "44px", borderRadius: "6px", border: state === "confirmed" ? "none" : "1px solid var(--wire)", background: state === "confirmed" ? "var(--reaction-good)" : "none", color: state === "confirmed" ? "#fff" : "var(--text-faint)", cursor: "pointer", fontSize: "12px" }}>✓</button><button type="button" onClick={onHide} aria-label="Hide" style={{ width: "44px", height: "44px", borderRadius: "6px", border: "1px solid var(--wire)", background: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: "12px" }}>×</button></div>
    </div>
  );
}