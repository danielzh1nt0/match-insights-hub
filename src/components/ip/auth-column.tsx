import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "./primitives";
import { cn } from "@/lib/utils";

/**
 * The surface every signed-out screen sits on.
 *
 * One centred column rather than a split screen with a decorative panel. The
 * page ground already carries the gradient, so a second illustrated half earns
 * nothing except width taken from the form — and on a phone the split collapsed
 * into a strip of pitch markings above the fold, which is the worst of both.
 *
 * Rules above and below the column do the framing instead, which is how the
 * rest of the system separates anything.
 */
export function AuthColumn({
  eyebrow,
  meta,
  title,
  sub,
  steps,
  children,
  foot,
  note,
}: {
  /** Small label on the left of the rule, e.g. "Step 1 of 3". */
  eyebrow: string;
  /** Small label on the right of the rule, e.g. "Your account". */
  meta?: string;
  title: string;
  sub?: string;
  /** Progress bars: the count, and how many are complete. */
  steps?: { total: number; done: number };
  children: ReactNode;
  foot?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-wire">
        <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center px-4 md:px-7">
          <Link to="/" aria-label="Ipanema home" className="flex items-center gap-2.5">
            <Wordmark size="sm" />
            <span className="label-xs border border-wire px-1.5 py-1 text-text-faint">
              Tactical
            </span>
          </Link>
        </div>
      </header>

      <main className="relative z-[1] flex flex-1 items-start justify-center px-4 py-10 md:items-center md:py-16">
        <div className="w-full max-w-[560px]">
          {steps && (
            <div className="mb-6 flex gap-2" aria-hidden="true">
              {Array.from({ length: steps.total }, (_, i) => (
                <span
                  key={i}
                  className={cn("h-[4px] flex-1", i < steps.done ? "bg-cream" : "bg-wire")}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-b border-wire pb-3">
            <span className="label-sm text-text-faint">{eyebrow}</span>
            {meta && <span className="label-sm text-text-faint">{meta}</span>}
          </div>

          <h1 className="display-i mt-6 text-[clamp(34px,6vw,56px)] leading-none text-text-bright">
            {title}
          </h1>
          {sub && <p className="mt-3 max-w-[48ch] text-[14px] text-text-dim">{sub}</p>}

          <div className="mt-8 flex flex-col gap-5">{children}</div>

          {note && <p className="mt-6 text-[12px] leading-relaxed text-text-faint">{note}</p>}
          {foot && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-wire pt-5 text-[12.5px] text-text-dim">
              {foot}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * A labelled field, with the label row carrying an optional action on the right
 * — "Forgot password" belongs beside the field it concerns, not under it.
 */
export function AuthField({
  label,
  action,
  help,
  error,
  children,
}: {
  label: string;
  action?: ReactNode;
  help?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="label-sm text-text-dim">{label}</span>
        {action && <span className="shrink-0">{action}</span>}
      </span>
      {children}
      {help && !error && <span className="mt-2 block text-[12px] text-text-faint">{help}</span>}
      {error && (
        <span role="alert" className="alarm mt-2 block px-2.5 py-1.5 text-[12px]">
          {error}
        </span>
      )}
    </label>
  );
}
