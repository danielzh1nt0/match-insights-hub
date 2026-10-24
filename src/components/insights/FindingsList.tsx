import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchFindingUses, recordFindingUse } from "@/lib/squad";
import { ArrowRight } from "lucide-react";
import { ClipStrip } from "@/components/insights/ClipStrip";
import { actionLinkClass } from "@/components/ip/touchline";
import type { Finding } from "@/lib/match-data";
import { cn } from "@/lib/utils";

/**
 * Every finding the analysis produced, worst first.
 *
 * Each one is a claim, the evidence for it set apart as a quotation, and what
 * it cost. The evidence is boxed because it is the part a coach will read out
 * in the dressing room — it has to survive being quoted on its own.
 *
 * A finding exists only because a real number crossed a threshold the coach
 * set, so there is no empty-list filler: when nothing fired, the list says so.
 */
export function FindingsList({
  findings,
  matchId,
  videoUrl,
}: {
  findings: Finding[];
  matchId: string;
  /** Absent until the match video is signed; the clip tiles then link out. */
  videoUrl?: string | undefined;
}) {
  return (
    <section aria-labelledby="all-findings">
      {findings.length === 0 ? (
        <p className="mt-4 border border-wire bg-surface p-5 text-[13px] leading-relaxed text-text-dim">
          Every target you set was met in this match. Nothing here is hidden — the analysis simply
          found nothing that crossed one of your thresholds.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {findings.map((finding, index) => {
            return (
              <article
                key={finding.id}
                className={cn(
                  "border bg-surface p-4 sm:p-5",
                  index === 0 ? "border-cream/40" : "border-wire",
                )}
              >
                <h3 className="text-[16px] font-semibold leading-snug text-text-bright sm:text-[17px]">
                  {finding.headline}
                </h3>
                <p className="mt-1 text-[12.5px] text-text-faint">
                  {findingLine(finding)}
                  {finding.basis
                    ? ` · ${finding.basis === "confirmed" ? "confirmed" : "detected"}`
                    : ""}
                </p>

                {/* The evidence, set apart so it can be quoted on its own. */}
                <blockquote className="mt-4 border border-wire bg-bg p-3.5 text-[13.5px] leading-snug text-text sm:p-4">
                  {finding.interpretation}
                </blockquote>

                {/* The moments sit with the claim they prove rather than in a
                    strip at the top of the page, so the evidence is attached to
                    the thing it is evidence for. */}
                {finding.timestamps.length > 0 && (
                  <div className="mt-4 border border-wire">
                    <ClipStrip
                      matchId={matchId}
                      timestamps={finding.timestamps}
                      total={finding.events}
                      label={finding.headline}
                      videoUrl={videoUrl}
                      note={finding.evidenceNote}
                      bare
                    />
                  </div>
                )}

                <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <Link
                    to="/match/$matchId/session"
                    params={{ matchId }}
                    search={{ finding: finding.id }}
                    onClick={() => void recordFindingUse(matchId, finding.id, "session", finding.headline)}
                    className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
                  >
                    Save into Tuesday session
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                  <UseMarks matchId={matchId} findingId={finding.id} headline={finding.headline} />
                  {finding.timestamps?.[0] !== undefined && (
                    <Link
                      to="/match/$matchId/match"
                      params={{ matchId }}
                      search={{ t: Math.round(finding.timestamps[0]! * 10) / 10 }}
                      className={actionLinkClass()}
                    >
                      Review the {finding.events} {finding.events === 1 ? "moment" : "moments"}
                    </Link>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** "1 player", "411 times", "34%" — a figure with its unit, in plain words. */
function withUnit(value: number, unit: string) {
  if (unit === "%") return `${value}%`;
  const one = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return `${value} ${value === 1 ? one : unit}`;
}

/**
 * The line under a finding's headline: the figure, the target, and how many
 * moments show it. A count with a target of one ("411 times against a 1 times
 * target") said nothing, so counts carry no target.
 */
function findingLine(finding: {
  value: number;
  target: number;
  unit: string;
  higherIsWorse: boolean;
  events: number;
  population: number;
  evidence: string;
}) {
  const figure = withUnit(finding.value, finding.unit);
  const target =
    finding.unit === "times"
      ? ""
      : ` · target ${finding.higherIsWorse ? "at most" : "at least"} ${withUnit(finding.target, finding.unit)}`;
  const moments =
    finding.events === 0
      ? ""
      : finding.evidence === "exact" && finding.population > finding.events
        ? ` · ${finding.events} of ${finding.population} moments show it`
        : ` · ${finding.events} ${finding.events === 1 ? "moment" : "moments"}`;
  return figure + target + moments;
}

/**
 * "Showed this" / "Not relevant": the coach's verdict on a finding, recorded with one tap. It is a label for the
 * analysis (which findings coaches act on, which they dismiss), not a filter - nothing is hidden by it.
 */
function UseMarks({ matchId, findingId, headline }: { matchId: string; findingId: string; headline: string }) {
  const [marks, setMarks] = useState<Set<string>>(new Set());
  useEffect(() => {
    let live = true;
    void fetchFindingUses(matchId).then((rows) => {
      if (live) setMarks(new Set(rows.filter((r) => r.finding_id === findingId).map((r) => r.kind)));
    });
    return () => {
      live = false;
    };
  }, [matchId, findingId]);
  const mark = (kind: "shown" | "dismissed") => {
    setMarks((m) => new Set([...m, kind]));
    void recordFindingUse(matchId, findingId, kind, headline);
  };
  return (
    <span className="flex items-center gap-3 text-[12px] text-text-faint">
      <button type="button" onClick={() => mark("shown")} className={cn("hover:text-text", marks.has("shown") && "text-quality-good")} aria-pressed={marks.has("shown")}>
        {marks.has("shown") ? "Shown to the players" : "Showed this"}
      </button>
      <button type="button" onClick={() => mark("dismissed")} className={cn("hover:text-text", marks.has("dismissed") && "text-text-dim")} aria-pressed={marks.has("dismissed")}>
        {marks.has("dismissed") ? "Marked not relevant" : "Not relevant"}
      </button>
    </span>
  );
}
