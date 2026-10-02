import { Link } from "@tanstack/react-router";
import { CalendarCheck, ExternalLink, Play } from "lucide-react";
import type { TeamIdentity } from "@/components/team/TeamToken";
import { Crest, actionLinkClass } from "@/components/ip/touchline";
import type { Finding } from "@/lib/match-data";
import { cn } from "@/lib/utils";

/**
 * The verdict at the top of Insights.
 *
 * One sentence in the scoreboard voice saying what went wrong, then the three
 * figures it rests on and the two things the coach can do about it. It is a
 * quotation because that is how a debrief actually opens — the coach says the
 * thing, then shows the evidence.
 */
export function VerdictBlock({
  teamA,
  teamB,
  scoreLine,
  headline,
  finding,
  matchId,
  confirmed,
  moments,
}: {
  teamA: TeamIdentity;
  teamB: TeamIdentity;
  scoreLine: string;
  headline: string;
  finding: Finding | null;
  matchId: string;
  confirmed: number;
  moments: number;
}) {
  const unit = finding?.unit === "%" ? "%" : finding?.unit ? ` ${finding.unit}` : "";
  const pct = finding && finding.unit === "%" ? finding.value : null;
  const targetPct = finding && finding.unit === "%" ? finding.target : null;

  return (
    <section aria-labelledby="insights-verdict">
      <div className="flex flex-wrap items-center gap-3">
        <Crest team={teamA} size={28} />
        <h1 className="text-[14px] font-semibold text-text-bright">{scoreLine}</h1>
        <Crest team={teamB} size={28} />
        <span className="label-xs text-text-faint">Post-match debrief</span>
      </div>

      <p
        id="insights-verdict"
        className="display-i mt-5 max-w-[22ch] text-[clamp(32px,6.6vw,58px)] leading-[0.92] text-text-bright md:max-w-[30ch]"
      >
        &ldquo;{headline}&rdquo;
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
        {/* The three figures the verdict stands on, as one ruled strip. */}
        <div className="rule-x grid border border-wire bg-surface sm:grid-cols-3">
          <Panel label="Reaction rate today">
            {finding ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="num text-[clamp(38px,5vw,52px)] leading-[0.86] text-text-bright">
                    {finding.value}
                    {unit}
                  </span>
                  <span className="text-[12px] text-text-dim">
                    Target {finding.target}
                    {unit}
                  </span>
                </p>
                {pct !== null && targetPct !== null && (
                  <div className="relative mt-4 h-[8px] w-full bg-surface-3">
                    <span
                      className="absolute inset-y-0 left-0 bg-text-dim"
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 bottom-[-4px] w-px bg-text"
                      style={{ left: `${Math.max(0, Math.min(100, targetPct))}%` }}
                    />
                  </div>
                )}
                <p className="mt-3 text-[12px] text-text-faint">{finding.interpretation}</p>
              </>
            ) : (
              <>
                <p className="num text-[clamp(32px,4vw,44px)] leading-none text-text-bright">
                  All met
                </p>
                <p className="mt-3 text-[12px] text-text-faint">
                  Nothing in this match crossed a threshold you set.
                </p>
              </>
            )}
          </Panel>

          <Panel label="Model standard">
            <p className="num text-[clamp(32px,4vw,44px)] leading-none text-accent-sea">
              {finding ? `${finding.target}${unit}` : "—"}
            </p>
            <p className="mt-3 text-[12px] text-text-faint">
              The threshold on your own club profile, not a league average.
            </p>
          </Panel>

          <Panel label="Video evidence">
            <p className="flex items-baseline gap-2">
              <span className="num text-[clamp(32px,4vw,44px)] leading-none text-positive">
                {confirmed} of {moments}
              </span>
              <span className="text-[12px] text-text-dim">moments</span>
            </p>
            <p className="mt-3">
              <Link
                to="/match/$matchId/match"
                params={{ matchId }}
                className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
              >
                Review in the workspace
                <ExternalLink size={13} aria-hidden="true" />
              </Link>
            </p>
          </Panel>
        </div>

        {/* What the coach does next. One chalk fill, one outline. */}
        <div className="flex flex-col gap-3">
          <Link
            to="/match/$matchId/session"
            params={{ matchId }}
            className="btn btn-primary w-full"
          >
            <CalendarCheck size={16} aria-hidden="true" />
            Build Tuesday session
          </Link>
          <Link
            to="/match/$matchId/match"
            params={{ matchId }}
            className="btn btn-secondary w-full"
          >
            <Play size={15} aria-hidden="true" />
            Review {moments} moments
          </Link>
        </div>
      </div>
    </section>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <p className="label-xs text-text-faint">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
