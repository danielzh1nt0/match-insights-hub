import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Target } from "lucide-react";
import { FindingRow } from "@/components/insights/FindingRow";
import type { Finding } from "@/lib/match-data";

/**
 * Every finding the analysis produced, worst first, each opening to its
 * evidence. This is the prototype's "All findings" list.
 *
 * A finding exists only because a real number crossed a threshold the coach
 * set, so there is no empty-list filler: when nothing fired, the list says
 * exactly that.
 */
export function FindingsList({ findings, matchId }: { findings: Finding[]; matchId: string }) {
  const [openId, setOpenId] = useState<string | null>(findings[0]?.id ?? null);

  return (
    <section aria-labelledby="all-findings" className="rounded-[14px] border border-wire bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
        <h2 id="all-findings" className="display text-[20px] text-text">All findings</h2>
        <span className="text-[11.5px] text-text-faint">
          {findings.length === 0
            ? "Nothing crossed a threshold"
            : `${findings.length} ${findings.length === 1 ? "finding" : "findings"}, worst first`}
        </span>
      </div>

      {findings.length === 0 ? (
        <p className="border-t border-wire-2 px-5 py-5 text-[13px] leading-relaxed text-text-dim">
          Every target you set was met in this match. Nothing here is hidden — the analysis simply found
          nothing that crossed one of your thresholds.
        </p>
      ) : (
        <div className="border-t border-wire-2">
          {findings.map((finding, index) => {
            const open = openId === finding.id;
            const unit = finding.unit === "%" ? "%" : ` ${finding.unit}`;
            return (
              <div key={finding.id}>
                <FindingRow
                  icon={index === 0 ? <AlertTriangle size={16} className="text-reaction-bad" /> : <Target size={15} className="text-text-faint" />}
                  headline={finding.headline}
                  result={index === 0 ? "critical" : "off"}
                  expanded={open}
                  onToggle={() => setOpenId(open ? null : finding.id)}
                />
                {open && (
                  <div className="border-b border-wire-2 px-5 pb-5">
                    <p className="max-w-[70ch] text-[13px] leading-relaxed text-text-dim">{finding.interpretation}</p>
                    <div className="mt-4 flex flex-wrap items-end gap-6">
                      <Figure label="Today" value={`${finding.value}${unit}`} tone="bad" />
                      <Figure label="Target" value={`${finding.target}${unit}`} />
                      <Figure label={finding.events === 1 ? "Moment" : "Moments"} value={`${finding.events}`} />
                      {finding.basis && <Figure label="Basis" value={finding.basis === "confirmed" ? "Confirmed" : "Detected"} />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Link
                        to="/match/$matchId/session"
                        params={{ matchId }}
                        search={{ finding: finding.id }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-cream px-4 text-[12.5px] font-bold text-ink"
                      >
                        Train it <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      {finding.timestamps[0] !== undefined && (
                        <Link
                          to="/match/$matchId/match"
                          params={{ matchId }}
                          search={{ t: Math.round(finding.timestamps[0]! * 10) / 10 }}
                          className="inline-flex min-h-11 items-center rounded-[10px] border border-wire px-4 text-[12.5px] font-bold text-text hover:border-cream/40 hover:text-cream"
                        >
                          See the moments
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-faint">{label}</div>
      <div className={tone === "bad" ? "display-i text-[24px] leading-none text-reaction-bad" : "display-i text-[24px] leading-none text-cream"}>
        {value}
      </div>
    </div>
  );
}
