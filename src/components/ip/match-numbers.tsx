import { ballVerdict } from "@/lib/ball-verdict";
import { Link } from "@tanstack/react-router";
import { Info, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StatIcon, type StatIconName } from "@/components/ip/stat-icon";
import { Card } from "@/components/ip/primitives";
import { useAnalysis } from "@/hooks/use-match";
import { countEvents, type ReviewedEvent } from "@/lib/event-reviews";
import { teamRow } from "@/lib/match-analysis";
import { formatClock } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Metric = {
  key: string;
  label: string;
  icon: StatIconName;
  a: number;
  b: number;
  types: string[];
  meaning: string;
  glossaryId: string;
  unreliable?: boolean;
};

function kindIs(event: ReviewedEvent, kind: string) {
  const payload = event.payload ?? {};
  return String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "")
    .toLowerCase()
    .includes(kind);
}

function valueFor(events: ReviewedEvent[], team: "A" | "B", test: (event: ReviewedEvent) => boolean) {
  const count = countEvents(events, (event) => event.team === team && test(event));
  return count.confirmed > 0 ? count.confirmed : count.detected;
}

export function MatchNumbers({
  matchId,
  onFilterTypes,
}: {
  matchId: string;
  onFilterTypes?: ((types: string[]) => void) | undefined;
}) {
  const { match, row, stats, colours, events, loading } = useAnalysis(matchId, "both");
  const [selected, setSelected] = useState<Metric | null>(null);
  const teamA = teamRow(stats, "A");
  const teamB = teamRow(stats, "B");
  const reliable = ballVerdict(row?.summary).possession;

  const eventMetric = (team: "A" | "B", test: (event: ReviewedEvent) => boolean) =>
    valueFor(events, team, test);
  const metrics: Metric[] = [
    {
      key: "goals", label: "Goals", icon: "goals",
      a: eventMetric("A", (e) => e.type === "goal"), b: eventMetric("B", (e) => e.type === "goal"),
      types: ["goal"], meaning: "Goals are confirmed scoring events in this match.", glossaryId: "finding",
    },
    {
      key: "shots", label: "Shots", icon: "shots",
      a: eventMetric("A", (e) => e.type === "shot"), b: eventMetric("B", (e) => e.type === "shot"),
      types: ["shot"], meaning: "Shots are attempts directed towards goal, before blocked attempts are added.", glossaryId: "finding",
    },
    {
      key: "corners", label: "Corners", icon: "corners",
      a: eventMetric("A", (e) => e.type === "set_piece" && kindIs(e, "corner")),
      b: eventMetric("B", (e) => e.type === "set_piece" && kindIs(e, "corner")),
      types: ["set_piece"], meaning: "Corners are restarts awarded when the defending side puts the ball over its goal line.", glossaryId: "finding",
    },
    {
      key: "free-kicks", label: "Free kicks", icon: "free-kicks",
      a: eventMetric("A", (e) => e.type === "set_piece" && kindIs(e, "free")),
      b: eventMetric("B", (e) => e.type === "set_piece" && kindIs(e, "free")),
      types: ["set_piece"], meaning: "Free kicks show how often each team restarted play after an infringement.", glossaryId: "finding",
    },
    {
      key: "attempts", label: "Attempts", icon: "attempts",
      a: eventMetric("A", (e) => e.type === "shot" || e.type === "shot_blocked" || kindIs(e, "blocked")),
      b: eventMetric("B", (e) => e.type === "shot" || e.type === "shot_blocked" || kindIs(e, "blocked")),
      types: ["shot", "shot_blocked"], meaning: "Attempts combine shots with efforts blocked before they reached goal.", glossaryId: "finding",
    },
    {
      key: "possession", label: "Possession", icon: "possession",
      a: Math.round(teamA?.possession_pct ?? 0), b: Math.round(teamB?.possession_pct ?? 0),
      types: [], meaning: "Possession is the share of reliable ball-tracked playing time controlled by each team.", glossaryId: "possession",
      unreliable: !reliable,
    },
  ];

  return (
    <section aria-labelledby="match-numbers-title">
      <h2 id="match-numbers-title" className="display mb-2 text-[18px] uppercase text-text">Match in numbers</h2>
      <Card className="grid grid-cols-2 p-0 md:grid-cols-3">
        {metrics.map((metric, index) => {
          const empty = metric.a === 0 && metric.b === 0;
          const inactive = empty || metric.unreliable;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => setSelected(metric)}
              aria-label={`Open ${metric.label.toLowerCase()} details`}
              className={cn(
                "tap min-h-[132px] border-wire-2 p-3.5 text-left transition-colors hover:bg-surface-2",
                index % 2 === 0 ? "border-r md:border-r" : "md:border-r",
                index < 4 && "border-b md:border-b",
                index === 2 && "md:border-r-0",
                index === 3 && "md:border-b-0 md:border-r",
                index === 5 && "border-r-0",
              )}
            >
              {loading ? (
                <div className="h-full animate-pulse">
                  <div className="h-7 w-7 rounded-full bg-surface-3" />
                  <div className="mt-4 h-2 w-16 rounded bg-surface-3" />
                  <div className="mt-2 h-7 w-20 rounded bg-surface-3" />
                </div>
              ) : (
                <>
                  <StatIcon
                    name={metric.icon}
                    {...(inactive ? { className: "text-text-faint opacity-40" } : {})}
                    {...(!inactive ? { style: { color: metric.b > metric.a ? colours.B : colours.A } } : {})}
                  />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">{metric.label}</p>
                  <p className="display-i mt-0.5 text-[22px] text-cream">
                    {inactive ? "—" : (
                      <><span style={{ color: colours.A }}>{metric.a}</span><span className="px-1.5 text-text-faint">:</span><span style={{ color: colours.B }}>{metric.b}</span></>
                    )}
                  </p>
                  {metric.unreliable && (
                    <span className="mt-1.5 inline-flex rounded-full border border-quality-risky/40 bg-quality-risky/10 px-2 py-0.5 text-[10px] font-semibold text-quality-risky">Unreliable</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </Card>

      {selected && match && (
        <MetricSheet
          metric={selected}
          events={events.filter((event) => selected.types.includes(event.type)).slice(0, 8)}
          colours={colours}
          teamNames={{ A: match.teamA, B: match.teamB }}
          onClose={() => setSelected(null)}
          onSeeEvents={selected.types.length > 0 && onFilterTypes ? () => {
            onFilterTypes(selected.types);
            setSelected(null);
          } : undefined}
        />
      )}
    </section>
  );
}

function MetricSheet({ metric, events, colours, teamNames, onClose, onSeeEvents }: {
  metric: Metric;
  events: ReviewedEvent[];
  colours: { A: string; B: string };
  teamNames: { A: string; B: string };
  onClose: () => void;
  onSeeEvents?: (() => void) | undefined;
}) {
  const withheld = metric.unreliable;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end">
      <button type="button" aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-bg/80 backdrop-blur-sm" />
      <aside role="dialog" aria-modal="true" aria-label={`${metric.label} details`} className="relative w-full rounded-t-[16px] border border-wire bg-surface p-5 pb-7 md:h-full md:max-w-[420px] md:rounded-none md:border-y-0 md:border-r-0 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 text-cream"><StatIcon name={metric.icon} /><h2 className="display text-[20px] uppercase">{metric.label}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close details" className="tap grid place-items-center text-text-faint hover:text-text"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div><p className="text-[11px] text-text-faint">{teamNames.A}</p><p className="display-i text-[38px]" style={{ color: withheld ? "var(--text-faint)" : colours.A }}>{withheld ? "—" : metric.a}</p></div>
          <span className="pb-2 text-text-faint">:</span>
          <div className="text-right"><p className="text-[11px] text-text-faint">{teamNames.B}</p><p className="display-i text-[38px]" style={{ color: withheld ? "var(--text-faint)" : colours.B }}>{withheld ? "—" : metric.b}</p></div>
        </div>
        {withheld && <span className="mt-2 inline-flex rounded-full border border-quality-risky/40 bg-quality-risky/10 px-2.5 py-1 text-[11px] font-semibold text-quality-risky">Unreliable</span>}
        <p className="mt-5 text-[13.5px] leading-relaxed text-text-dim">{metric.meaning}</p>
        {events.length > 0 && (
          <div className="mt-5 border-t border-wire pt-4">
            <h3 className="display text-[14px] uppercase text-text-dim">Moments</h3>
            <ul className="mt-2 space-y-1">
              {events.map((event) => <li key={event.id} className="flex items-center gap-2 py-1.5 text-[12.5px] text-text"><Play size={13} className="text-cream" aria-hidden="true" /><span className="num text-cream">{formatClock(event.t)}</span><span>{event.title}</span></li>)}
            </ul>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          {onSeeEvents && <button type="button" onClick={onSeeEvents} className="tap flex-1 rounded-[12px] bg-cream px-4 text-sm font-semibold text-primary-foreground">See events</button>}
          <Link to="/glossary" hash={metric.glossaryId} className="tap inline-flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-cream/60 px-4 text-sm font-semibold text-cream"><Info size={15} aria-hidden="true" /> Glossary</Link>
        </div>
      </aside>
    </div>
  );
}