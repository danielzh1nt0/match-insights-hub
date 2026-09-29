import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { Finding } from "@/lib/match-data";
import { cn } from "@/lib/utils";

/**
 * The poster at the top of Insights, as in the prototype.
 *
 * One card carrying the whole verdict: what to fix, why, what to do about it,
 * and the three numbers behind it in a stack down the right. On a phone the
 * stack drops under the copy.
 */
export function OneThingPoster({
  kicker,
  headline,
  body,
  finding,
  matchId,
  momentum,
  momentumLine,
  chaptersLine,
}: {
  kicker: string;
  headline: string;
  body: string | null;
  finding: Finding | null;
  matchId: string;
  /** −1…1 per slice of the match, ours positive. */
  momentum: number[];
  momentumLine: string;
  chaptersLine: string;
}) {
  const unit = finding?.unit === "%" ? "%" : finding?.unit ? ` ${finding.unit}` : "";
  const figures = finding
    ? [
        { value: `${finding.value}${unit}`, label: "Today", tone: "bad" as const },
        { value: `${finding.target}${unit}`, label: "Target" },
        { value: `${finding.events}`, label: finding.events === 1 ? "Moment" : "Moments" },
      ]
    : [];

  return (
    <section
      className="relative overflow-hidden rounded-[18px] border border-wire bg-surface p-5 md:p-6"
      aria-labelledby="insights-verdict"
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-team-a via-cream to-team-b opacity-70"
        aria-hidden="true"
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(200px,280px)] md:gap-8">
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold text-text-faint">{kicker}</p>
          <h1
            id="insights-verdict"
            className="display-i mt-3 max-w-[16ch] text-[clamp(30px,6.4vw,52px)] uppercase leading-[0.95] text-cream"
          >
            {headline}
          </h1>
          {body && (
            <p className="mt-4 max-w-[52ch] text-[13.5px] leading-relaxed text-text-dim md:text-[14.5px]">
              {body}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/match/$matchId/story"
              params={{ matchId }}
              className="inline-flex min-h-12 items-center gap-2.5 rounded-[10px] bg-cream px-5 text-[13.5px] font-bold text-ink transition-opacity hover:opacity-90"
            >
              <Play size={13} className="fill-ink" aria-hidden="true" />
              Play the story
            </Link>
            <Link
              to="/match/$matchId/session"
              params={{ matchId }}
              search={finding ? { finding: finding.id } : {}}
              className="inline-flex min-h-12 items-center rounded-[10px] border border-wire px-5 text-[13.5px] font-bold text-text transition-colors hover:border-cream/40 hover:text-cream"
            >
              Build Tuesday&apos;s session
            </Link>
          </div>
        </div>

        {figures.length > 0 && (
          <dl className="w-full self-start justify-self-end overflow-hidden rounded-[14px] bg-surface-2">
            {figures.map((f, i) => (
              <div key={f.label} className={cn("px-5 py-4", i > 0 && "border-t border-wire-2")}>
                <dd
                  className={cn(
                    "display-i text-[30px] leading-none",
                    f.tone === "bad" ? "text-reaction-bad" : "text-cream",
                  )}
                >
                  {f.value}
                </dd>
                <dt className="mt-1 text-[12px] text-text-dim">{f.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-6 grid items-center gap-3 border-t border-wire-2 pt-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <p className="text-[12.5px] font-semibold text-text">{momentumLine}</p>
        <Momentum values={momentum} />
        <p className="text-[12px] text-text-faint md:text-right">{chaptersLine}</p>
      </div>
    </section>
  );
}

/** The match as one line: ours above, theirs below. */
function Momentum({ values }: { values: number[] }) {
  if (values.length === 0) return <span />;
  const step = 100 / values.length;
  return (
    <svg
      viewBox="0 0 100 34"
      className="h-[34px] w-full md:w-[320px]"
      role="img"
      aria-label="Momentum through the match"
    >
      <line x1="0" y1="17" x2="100" y2="17" stroke="var(--wire)" strokeWidth=".4" />
      {values.map((v, i) => {
        const h = Math.max(Math.abs(v) * 15, 0.6);
        return (
          <rect
            key={i}
            x={i * step + step * 0.15}
            y={v >= 0 ? 17 - h : 17}
            width={step * 0.7}
            height={h}
            fill={v >= 0 ? "var(--team-a)" : "var(--team-b)"}
          />
        );
      })}
    </svg>
  );
}
