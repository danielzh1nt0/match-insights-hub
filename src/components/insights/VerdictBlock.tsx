import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, ExternalLink, Play, SlidersHorizontal } from "lucide-react";
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
}: {
  teamA: TeamIdentity;
  teamB: TeamIdentity;
  scoreLine: string;
  headline: string;
  finding: Finding | null;
  matchId: string;
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

      {/* A verdict is a prompt, not a ruling.
          Shown the same twenty minutes of football, coaches agree on what they
          saw barely more than chance — on formation, on who stood out, on how
          space was used. There is no consensus for an automated claim to be
          right about, so stating one flatly would contradict a good share of
          the people reading it. What coaches say they want is something that
          confirms or challenges what they already think and starts the
          argument. So the line above makes its case, and this asks. */}
      {finding && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[13.5px] text-text-dim">Does that match what you saw?</p>
          <Link
            to="/match/$matchId/match"
            params={{ matchId }}
            {...(finding.timestamps?.[0] !== undefined
              ? { search: { t: Math.round(finding.timestamps[0]! * 10) / 10 } }
              : {})}
            className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
          >
            <Check size={13} aria-hidden="true" />
            Check it against the video
          </Link>
          <Link
            to="/match/$matchId/stats"
            params={{ matchId }}
            className={cn(actionLinkClass(), "inline-flex items-center gap-1.5")}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            Not what you saw? Change the target
          </Link>
        </div>
      )}
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
