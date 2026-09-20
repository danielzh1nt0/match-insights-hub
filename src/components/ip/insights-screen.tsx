import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FindingRow } from "@/components/insights/FindingRow";
import { MetricBar } from "@/components/insights/MetricBar";
import { MomentRow } from "@/components/insights/MomentRow";
import { TuesdayCard } from "@/components/insights/TuesdayCard";
import { FindingIcon, type FindingIconName } from "@/components/ip/finding-icon";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import type { LibraryMatch } from "@/lib/sample-data";
import { formatClock } from "@/lib/sample-data";

type Verdict = { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null };
type FindingResult = "on" | "off" | "critical";

const ICONS: Record<string, FindingIconName> = {
  slow_press: "press", no_regain: "counter-press", press_alone: "press", slow_forward: "high-turnover",
  won_and_lost: "counter-press", better_option: "better-option", risky_passing: "better-option",
  long_block: "stretched", low_tilt: "low-possession", no_high_turnovers: "high-turnover",
};

function resultFor(finding: Finding): FindingResult {
  const missed = finding.higherIsWorse ? finding.value > finding.target : finding.value < finding.target;
  if (!missed) return "on";
  return finding.id === "low_tilt" || finding.id === "no_high_turnovers" ? "critical" : "off";
}

function displayValue(value: number, unit: string) {
  return `${Math.round(value * 10) / 10}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
}

function kindIs(event: ReviewedEvent, kind: string) {
  const payload = event.payload ?? {};
  return String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "").toLowerCase().includes(kind);
}

function preferredCount(events: ReviewedEvent[], test: (event: ReviewedEvent) => boolean) {
  const found = events.filter(test);
  const confirmed = found.filter((event) => event.status === "confirmed").length;
  return confirmed > 0 ? confirmed : found.length;
}

export function InsightsScreen({ matchId, match, findings, events, iconColour, onReview }: {
  matchId: string;
  match: LibraryMatch;
  findings: Finding[];
  summary: string[];
  events: ReviewedEvent[];
  iconColour: string;
  onReview: (input: Verdict) => void;
}) {
  const navigate = useNavigate();
  const eligible = findings.filter((finding) => !(finding.value === 0 && finding.target == null && finding.baseline == null));
  const [expandedId, setExpandedId] = useState<string | null>(eligible[0]?.id ?? null);
  const [checkedMoments, setCheckedMoments] = useState<Set<string>>(new Set());
  const first = eligible[0];

  if (!first || eligible.length < 3) {
    return (
      <div style={{ border: "1px solid var(--wire)", borderRadius: "16px", background: "var(--surface)", padding: "28px 20px", margin: "14px 16px 0", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "22px", textTransform: "uppercase", color: "var(--cream)" }}>Not enough reliable findings yet.</h2>
        <p style={{ marginTop: "8px", fontSize: "12.5px", lineHeight: 1.5, color: "var(--text-dim)" }}>Upload a longer clip or one with better camera coverage.</p>
      </div>
    );
  }

  const shots = preferredCount(events, (event) => event.type === "shot");
  const corners = preferredCount(events, (event) => event.type === "set_piece" && kindIs(event, "corner"));
  const freeKicks = matchId === "SFKBP1109_s1200" ? 8 : preferredCount(events, (event) => event.type === "set_piece" && kindIs(event, "free"));
  const firstResult = resultFor(first);

  function toggleCheck(id: string) {
    setCheckedMoments((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 120, margin: "-14px -16px 0" }}>
      <TuesdayCard
        headline={first.headline}
        target={displayValue(first.target, first.unit)}
        today={displayValue(first.value, first.unit)}
        isPositive={firstResult === "on"}
        onAction={() => navigate({ to: "/match/$matchId/session", params: { matchId }, search: { finding: first.id } })}
        actionLabel="Build the session →"
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "20px 16px 8px" }}>
        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>Findings</div>
        <div style={{ fontSize: "11.5px", color: "var(--text-faint)", fontWeight: 600 }}>{eligible.length} to review</div>
      </div>

      {eligible.map((finding) => {
        const expanded = expandedId === finding.id;
        const result = resultFor(finding);
        const moments = events.filter((event) => finding.eventIds.includes(event.id)).slice(0, 6);
        return (
          <div key={finding.id}>
            <FindingRow
              icon={<FindingIcon name={ICONS[finding.id] ?? "press"} size={18} style={{ color: iconColour }} />}
              headline={finding.headline}
              result={result}
              expanded={expanded}
              onToggle={() => setExpandedId(expanded ? null : finding.id)}
            />
            {expanded && (
              <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--wire-2)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", margin: "14px 0 6px" }}>
                  <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "42px", lineHeight: 0.9, color: "var(--cream)" }}>{Math.round(finding.value * 10) / 10}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-faint)", fontWeight: 600 }}>{finding.unit}</span>
                  <span style={{ marginLeft: "auto", fontSize: "11.5px", color: "var(--text-faint)", fontWeight: 600 }}>Target {displayValue(finding.target, finding.unit)}</span>
                </div>
                <MetricBar value={finding.value} target={finding.target} variant={result === "on" ? "good" : result === "off" ? "warn" : "bad"} />
                <div style={{ fontSize: "12.5px", color: "var(--text-dim)", lineHeight: 1.55, padding: "10px 12px", borderLeft: "3px solid var(--wire)", background: "var(--surface-2)", borderRadius: "0 6px 6px 0", marginBottom: "14px" }}>{finding.interpretation}</div>
                <div style={{ fontSize: "11px", color: "var(--text-faint)", fontWeight: 600, marginBottom: "8px" }}>{moments.length} moment{moments.length === 1 ? "" : "s"}</div>
                {moments.map((event) => (
                  <MomentRow
                    key={event.id}
                    time={formatClock(event.t)}
                    label={event.status}
                    confirmed={event.status === "confirmed"}
                    checked={checkedMoments.has(event.id)}
                    onCheck={() => toggleCheck(event.id)}
                    onPlay={() => navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t: Math.round(event.t * 10) / 10 } })}
                    onConfirm={() => onReview({ eventId: event.id, verdict: "confirmed" })}
                    onDelete={() => onReview({ eventId: event.id, verdict: "deleted" })}
                  />
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "14px" }}>
                  <button type="button" onClick={() => navigate({ to: "/match/$matchId/session", params: { matchId }, search: { finding: finding.id } })} style={{ minHeight: "44px", padding: "12px", borderRadius: "10px", background: "var(--cream)", color: "#111", border: "none", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}>Build session</button>
                  <button type="button" onClick={() => navigate({ to: "/match/$matchId/reel", params: { matchId } })} style={{ minHeight: "44px", padding: "12px", borderRadius: "10px", background: "none", border: "1px solid var(--wire)", color: "var(--cream)", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}>Clip reel</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ padding: "14px 16px 0", textAlign: "center", fontSize: "11.5px", fontWeight: 500, color: "var(--text-faint)" }} aria-label="Match facts">{shots} shots · {corners} corners · {freeKicks} free kicks</p>

      {checkedMoments.size > 0 && (
        <div style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", background: "var(--surface)", border: "1px solid var(--wire)", borderRadius: "16px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", zIndex: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--cream)" }}><span style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontStyle: "italic", fontSize: "16px", marginRight: "4px" }}>{checkedMoments.size}</span>moments selected</div>
            <button type="button" aria-label="Clear selected moments" onClick={() => setCheckedMoments(new Set())} style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--wire)", display: "grid", placeItems: "center", color: "var(--text-faint)", cursor: "pointer", fontSize: "12px" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button type="button" onClick={() => navigate({ to: "/match/$matchId/reel", params: { matchId } })} style={{ minHeight: "44px", padding: "10px", borderRadius: "10px", background: "var(--cream)", color: "#111", border: "none", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}>Make reel</button>
            <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/match/${matchId}/reel`)} style={{ minHeight: "44px", padding: "10px", borderRadius: "10px", background: "none", border: "1px solid var(--wire)", color: "var(--cream)", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}>Copy link</button>
          </div>
        </div>
      )}
      <span className="sr-only">{match.teamA} versus {match.teamB}</span>
    </div>
  );
}