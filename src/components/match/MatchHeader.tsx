type Team = {
  id: "A" | "B";
  name: string;
  shortName: string;
  colour: string;
  crestUrl?: string | null;
};

export function MatchHeader({ home, away, scoreHome, scoreAway, periodLabel, attackDirection, attackTeam, durationSeconds, onSettingsTap }: {
  home: Team;
  away: Team;
  scoreHome: number;
  scoreAway: number;
  periodLabel: string;
  attackDirection: "left" | "right";
  attackTeam: string;
  durationSeconds: number;
  onSettingsTap: () => void;
}) {
  const duration = `${Math.floor(durationSeconds / 60)}:${Math.floor(durationSeconds % 60).toString().padStart(2, "0")}`;
  const tile = (team: Team) => <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}><div style={{ width: "48px", height: "48px", display: "grid", placeItems: "center", background: team.crestUrl ? "var(--surface-2)" : team.colour, border: "1.5px solid rgba(255,255,255,0.12)", fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "22px", color: "#fff" }}>{team.crestUrl ? <img src={team.crestUrl} alt="" style={{ width: "42px", height: "42px", objectFit: "contain" }} /> : team.id}</div><div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>{team.shortName}</div></div>;
  return <div style={{ padding: "16px 20px 12px", background: "var(--surface)", borderBottom: "1px solid var(--wire-2)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>{tile(home)}<div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "44px", letterSpacing: "0.02em", color: "var(--cream)", fontVariantNumeric: "tabular-nums" }}>{scoreHome} : {scoreAway}</div>{tile(away)}</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "10px", fontSize: "11.5px", color: "var(--text-dim)", fontWeight: 500 }}><strong style={{ fontWeight: 600 }}>{periodLabel}</strong><span style={{ opacity: .5 }}>·</span><span>{attackTeam} attack {attackDirection}</span><span style={{ opacity: .5 }}>·</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{duration}</span><button type="button" onClick={onSettingsTap} aria-label="Match setup" style={{ marginLeft: "6px", width: "44px", height: "44px", borderRadius: "50%", background: "var(--surface)", border: "1.5px solid var(--wire)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text-faint)" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.9 2.9-.1-.1a1.7 1.7 0 0 0-2.8 1.2v.1h-4v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1-2.9-2.9.1-.1a1.7 1.7 0 0 0-1.2-2.8H3v-4h.1A1.7 1.7 0 0 0 4.3 7.2l-.1-.1 2.9-2.9.1.1A1.7 1.7 0 0 0 10 3.1V3h4v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1 2.9 2.9-.1.1a1.7 1.7 0 0 0 1.2 2.8h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></button></div>
  </div>;
}