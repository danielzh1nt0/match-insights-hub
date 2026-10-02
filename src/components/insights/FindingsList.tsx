import { Link } from "@tanstack/react-router";
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
            const unit = finding.unit === "%" ? "%" : ` ${finding.unit}`;
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
                  {finding.value}
                  {unit} against a {finding.target}
                  {unit} target ·{" "}
                  {/* How many moments show the fault, out of how many were
                      measured. "116 moments" against a 35% figure invited the
                      reading that all 116 were bad. */}
                  {finding.evidence === "exact" && finding.population > finding.events
                    ? `${finding.events} of ${finding.population} moments`
                    : `${finding.events} ${finding.events === 1 ? "moment" : "moments"}`}
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
                    className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
                  >
                    Save into Tuesday session
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
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
