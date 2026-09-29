import type { ReactNode } from "react";
import type { Phase, PhaseMoment, PhaseNumber, PhaseSeries } from "@/lib/phases";
import { cn } from "@/lib/utils";

/** One bordered panel with a question at the top, as the prototype has it. */
export function Panel({
  title,
  question,
  right,
  children,
  note,
}: {
  title: string;
  question?: string | undefined;
  right?: ReactNode | undefined;
  children: ReactNode;
  note?: string | undefined;
}) {
  return (
    <section className="rounded-[14px] border border-wire bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="display text-[18px] uppercase leading-tight text-cream">{title}</h2>
          {question && (
            <p className="mt-1 text-[11.5px] leading-[1.5] text-text-faint">{question}</p>
          )}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
      {note && (
        <p className="mt-3 inline-flex items-center gap-1.5 border-t border-wire-2 pt-2.5 text-[10.5px] text-text-faint before:h-[5px] before:w-[5px] before:rounded-full before:bg-text-faint">
          {note}
        </p>
      )}
    </section>
  );
}

/** The numbers for one phase, each against the target the team set. */
export function PhaseNumbers({
  numbers,
  onWatch,
  phaseName,
}: {
  numbers: PhaseNumber[];
  onWatch: (() => void) | null;
  phaseName: string;
}) {
  return (
    <>
      <div className="divide-y divide-wire-2">
        {numbers.map((number) => (
          <div key={number.label} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-text">{number.label}</span>
              {number.target && (
                <span className="mt-0.5 block text-[11px] text-text-faint">{number.target}</span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  "display-i text-[22px] leading-none",
                  number.value === null
                    ? "text-text-faint"
                    : number.status === "off"
                      ? "text-reaction-bad"
                      : "text-cream",
                )}
              >
                {number.value ?? "Not tracked"}
              </span>
              {number.status !== "unknown" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.06em]",
                    number.status === "on"
                      ? "bg-reaction-good/15 text-reaction-good"
                      : "bg-reaction-warn/15 text-reaction-warn",
                  )}
                >
                  {number.status === "on" ? "On track" : "Off target"}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {onWatch && (
        <button
          type="button"
          onClick={onWatch}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-cream px-4 text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
        >
          Watch every {phaseName.toLowerCase()} moment
        </button>
      )}
    </>
  );
}

/**
 * The phase's one series across the match.
 *
 * Bars outside the target are red. A phase with nothing to plot says so
 * instead of drawing a flat line.
 */
export function PhaseRibbon({ series, duration }: { series: PhaseSeries; duration: number }) {
  const values = series.points.map((point) => point.value);
  const high = Math.max(...values, series.target ?? -Infinity);
  const low = Math.min(...values, series.target ?? Infinity);
  const top = high * 1.12;
  // Keep the baseline below the smallest value so its bar is still visible,
  // but never below zero — these are seconds, metres and percentages.
  const bottom = Math.max(0, low - (high - low) * 0.6);
  const span = Math.max(top - bottom, 0.001);
  const y = (value: number) => 112 - ((value - bottom) / span) * 104;
  const bad = (value: number) =>
    series.target === null
      ? false
      : series.lowerIsBetter
        ? value > series.target
        : value < series.target;
  const barWidth = Math.max(700 / Math.max(series.points.length, 1) - 2, 1.5);

  return (
    <svg
      viewBox="0 0 700 120"
      className="h-[120px] w-full"
      role="img"
      aria-label={`${series.label} across the match`}
    >
      {series.points.map((point, i) => {
        const x = (point.t / Math.max(duration, 1)) * 700;
        return (
          <rect
            key={`${point.t}-${i}`}
            x={x}
            y={y(point.value)}
            width={barWidth}
            height={Math.max(112 - y(point.value), 1)}
            fill={bad(point.value) ? "var(--reaction-bad)" : "var(--text-dim)"}
            opacity={bad(point.value) ? 0.85 : 0.45}
          />
        );
      })}
      {series.target !== null && (
        <>
          <line
            x1="0"
            y1={y(series.target)}
            x2="700"
            y2={y(series.target)}
            stroke="var(--cream)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x="696"
            y={y(series.target) - 5}
            textAnchor="end"
            fontSize="12"
            fontWeight="600"
            fill="var(--cream)"
          >
            Target {series.target}
          </text>
        </>
      )}
    </svg>
  );
}

/** The best and the worst example of the phase, each a jump into the video. */
export function PhaseMoments({ phase, onWatch }: { phase: Phase; onWatch: (t: number) => void }) {
  const cards: [string, PhaseMoment | null, string][] = [
    ["Best", phase.best, "text-reaction-good"],
    ["Worst", phase.worst, "text-reaction-bad"],
  ];
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {cards.map(([label, moment, tone]) => (
        <div key={label} className="rounded-[10px] border border-wire bg-surface-2 p-4">
          <span className={cn("text-[11px] font-bold uppercase tracking-[0.06em]", tone)}>
            {label}
          </span>
          {moment ? (
            <button
              type="button"
              onClick={() => onWatch(moment.t)}
              className="mt-1.5 block w-full text-left"
            >
              <span className="block text-[13.5px] font-semibold text-text">{moment.title}</span>
              <span className="mt-1 block text-[11.5px] text-text-faint">{moment.why}</span>
              <span className="mt-2 inline-block text-[11.5px] font-bold text-cream">
                Watch it →
              </span>
            </button>
          ) : (
            <p className="mt-1.5 text-[12px] text-text-faint">
              This match file does not rank {phase.name.toLowerCase()} moments, so there is nothing
              to pick out.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
