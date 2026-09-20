import type { StatIconName } from "./StatIcon";
import { StatIcon } from "./StatIcon";

export type MatchNumberTile = {
  icon: StatIconName;
  label: string;
  valueA: number;
  valueB: number;
  unit?: string;
  unreliable?: boolean;
};

export function MatchNumbers({ tiles, onTileTap }: {
  tiles: MatchNumberTile[];
  onTileTap: (label: string) => void;
}) {
  return (
    <section aria-labelledby="match-numbers-title" style={{ marginTop: "16px" }}>
      <div id="match-numbers-title" style={{ padding: "0 16px 8px", fontFamily: "Barlow Condensed, sans-serif", fontSize: "18px", fontWeight: 700, textTransform: "uppercase", color: "var(--text)" }}>Match in numbers</div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
          {tiles.map((tile) => {
            const bothZero = tile.valueA === 0 && tile.valueB === 0;
            const inactive = tile.unreliable || bothZero;
            return (
              <button key={tile.label} type="button" onClick={() => onTileTap(tile.label)} aria-label={`Open ${tile.label.toLowerCase()} details`} style={{ minHeight: "132px", border: "1px solid var(--wire)", borderRadius: "12px", background: "var(--surface)", padding: "14px 10px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "inherit" }}>
                <div style={{ opacity: inactive ? 0.35 : 1, marginBottom: "10px" }}><StatIcon name={tile.icon} size={24} /></div>
                <div style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", fontWeight: 700, marginBottom: "4px" }}>{tile.label}</div>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "22px", lineHeight: 1, color: bothZero ? "var(--text-faint)" : "var(--cream)", fontVariantNumeric: "tabular-nums" }}>
                  {bothZero ? "—" : <><span style={{ color: "var(--team-a)" }}>{tile.valueA}</span> : <span style={{ color: "var(--team-b)" }}>{tile.valueB}</span>{tile.unit ?? ""}</>}
                </div>
                {tile.unreliable && <div style={{ marginTop: "6px", display: "inline-block", padding: "2px 6px", borderRadius: "4px", background: "rgba(186,117,23,0.15)", border: "1px solid rgba(186,117,23,0.5)", color: "#fcd34d", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Unreliable</div>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}