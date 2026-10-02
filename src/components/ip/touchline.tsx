import { useState, type ComponentType, type ReactNode } from "react";
import type { TeamIdentity } from "@/components/team/TeamToken";
import { cn } from "@/lib/utils";

/**
 * The Touchline card system.
 *
 * Every analytical module on the app is the same object: an icon in a square,
 * a question as its title, the answer underneath, and a hairline footer that
 * says what the answer rests on and where to go next. The repetition is the
 * point — a coach reading in the rain should never have to work out what kind
 * of thing he is looking at.
 */

/* ---------------- Section headings ---------------- */

/** The small archival label that names a region of the page. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-sm text-accent-sea", className)}>{children}</p>;
}

export function SectionHead({
  eyebrow,
  title,
  right,
  className,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1 text-[clamp(18px,2.2vw,22px)] font-semibold leading-tight text-text-bright">
          {title}
        </h2>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ---------------- The card ---------------- */

export function IconSquare({
  icon: Icon,
  className,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea",
        className,
      )}
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden={true} />
    </span>
  );
}

/**
 * One analytical module.
 *
 * `footnote` is what the number stands on — tracked frames, confirmed moments,
 * why it was withheld. It is never decoration, so a card without a basis
 * simply has no footer rather than an invented one.
 */
export function StatCard({
  icon,
  title,
  question,
  children,
  footnote,
  action,
  className,
}: {
  icon?: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  question?: string;
  children: ReactNode;
  footnote?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col border border-wire bg-surface", className)}>
      <header className="flex items-start gap-3 p-4 sm:p-5">
        {icon && <IconSquare icon={icon} />}
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug text-text-bright sm:text-[17px]">
            {title}
          </h3>
          {question && <p className="mt-0.5 text-[13px] leading-snug text-text-dim">{question}</p>}
        </div>
      </header>

      <div className="flex-1 px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>

      {(footnote || action) && (
        <footer className="flex items-center justify-between gap-4 border-t border-wire px-4 py-3 sm:px-5">
          <span className="min-w-0 truncate text-[12px] text-text-faint">{footnote}</span>
          {action && <span className="shrink-0">{action}</span>}
        </footer>
      )}
    </section>
  );
}

/* ---------------- Numbers ---------------- */

/**
 * A scoreboard figure.
 *
 * Withheld is a first-class answer, not an error: when the pipeline could not
 * measure something it says so in words, in the muted voice, and never shows a
 * dash dressed up as data.
 */
export function BigNumber({
  value,
  unit,
  tone = "default",
  size = "lg",
  className,
}: {
  value: string | null;
  unit?: string;
  tone?: "default" | "muted" | "alarm";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    md: "text-[34px] leading-[0.9]",
    lg: "text-[clamp(44px,5.5vw,60px)] leading-[0.86]",
    xl: "text-[clamp(52px,7vw,76px)] leading-[0.84]",
  } as const;
  if (value === null) {
    return <p className={cn("text-[22px] font-medium text-text-dim", className)}>Withheld</p>;
  }
  return (
    <p className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "num",
          sizes[size],
          tone === "alarm"
            ? "text-reaction-bad"
            : tone === "muted"
              ? "text-text-dim"
              : "text-text-bright",
        )}
      >
        {value}
      </span>
      {unit && <span className="text-[13px] text-text-dim">{unit}</span>}
    </p>
  );
}

/**
 * A bar against a target mark.
 *
 * This is how the system shows a miss. The bar falls short of the tick and the
 * eye does the rest — no red number, no warning badge, because any hue
 * reserved for alarm will sooner or later be somebody's shirt.
 */
export function TargetBar({
  value,
  target,
  max = 100,
  label,
}: {
  value: number;
  target?: number | undefined;
  max?: number;
  label?: string | undefined;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const targetPct = target === undefined ? null : Math.max(0, Math.min(100, (target / max) * 100));
  const short = target !== undefined && value < target;
  return (
    <div className="mt-4">
      <div className="relative h-[10px] w-full bg-surface-3">
        <span
          className={cn("absolute inset-y-0 left-0", short ? "bg-text-dim" : "bg-positive")}
          style={{ width: `${pct}%` }}
        />
        {targetPct !== null && (
          <span
            aria-hidden="true"
            className="absolute -top-1 bottom-[-4px] w-px bg-text"
            style={{ left: `${targetPct}%` }}
          />
        )}
      </div>
      {targetPct !== null && (
        <div className="relative mt-1.5 h-[14px]">
          <span
            className="num-flat absolute -translate-x-1/2 text-[11px] text-text-dim"
            style={{ left: `${targetPct}%` }}
          >
            {label ?? target}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Every measurement on one axis, fastest to slowest.
 *
 * A median hides the shape of a problem; the spread is the story. The target
 * tick and the median line are the only annotations, so the reader sees the
 * distribution rather than a verdict about it.
 */
export function DotPlot({
  values,
  target,
  median,
  max,
  unit = "s",
}: {
  values: number[];
  target?: number | undefined;
  median?: number | undefined;
  max: number;
  unit?: string;
}) {
  const x = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  return (
    <div className="mt-5">
      <div className="relative h-[52px]">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-wire" />
        {target !== undefined && (
          <>
            <span
              aria-hidden="true"
              className="absolute top-2 bottom-2 w-px bg-text-dim"
              style={{ left: `${x(target)}%` }}
            />
            <span
              className="num-flat absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-text-dim"
              style={{ left: `${x(target)}%` }}
            >
              target {target}
              {unit}
            </span>
          </>
        )}
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            aria-hidden="true"
            className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-sea ring-1 ring-kit-outline"
            style={{ left: `${x(v)}%` }}
          />
        ))}
        {median !== undefined && (
          <>
            <span
              aria-hidden="true"
              className="absolute top-1.5 bottom-3.5 w-[1.5px] bg-text-bright"
              style={{ left: `${x(median)}%` }}
            />
            <span
              className="num-flat absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-text-bright"
              style={{ left: `${x(median)}%` }}
            >
              median {median}
              {unit}
            </span>
          </>
        )}
      </div>
      <div className="mt-1 flex justify-between">
        {ticks.map((t) => (
          <span key={t} className="num-flat text-[10px] text-text-faint">
            {Math.round(t * 10) / 10}
            {unit}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Crest ---------------- */

/**
 * A club's mark.
 *
 * The real crest when the club has one on file, and otherwise a plate bearing
 * the club's code — never a coloured blob, because the code is what a coach
 * actually reads on a team sheet. A crest that fails to load falls back to the
 * same plate rather than leaving a broken image in the scoreline, which is the
 * one place on the page identity has to be right.
 *
 * The plate takes its height from `size` but sets its own width, since a square
 * at 14px cannot hold "SFK" and clipping a club's code is worse than a plate
 * that is a few pixels wider than its neighbour.
 */
export function Crest({
  team,
  size = 26,
  className,
}: {
  team: TeamIdentity;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (team.crestUrl && !failed) {
    return (
      <img
        src={team.crestUrl}
        alt=""
        title={team.name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      title={team.name}
      aria-hidden="true"
      className={cn(
        "label-xs inline-flex shrink-0 items-center justify-center whitespace-nowrap border px-1 tracking-[0.04em]",
        className,
      )}
      style={{
        minWidth: size,
        height: size,
        borderColor: team.kitColour,
        color: team.kitColour,
        fontSize: Math.max(8, Math.round(size * 0.38)),
      }}
    >
      {team.shortCode}
    </span>
  );
}

/* ---------------- Links ---------------- */

/** The quiet way out of a card. Underlined, never shouted in capitals. */
export function actionLinkClass(className?: string) {
  return cn(
    "text-[12.5px] font-semibold text-accent-sea underline decoration-accent-sea/40 underline-offset-[3px] transition-colors hover:decoration-accent-sea",
    className,
  );
}
