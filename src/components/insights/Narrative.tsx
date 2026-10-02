import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { TileSheet } from "@/components/insights/StatTile";
import type { Strength } from "@/lib/insights-model";
import { cn } from "@/lib/utils";

/**
 * A numbered beat of the debrief.
 *
 * The page is an argument, not a dashboard, so each section announces which
 * question it answers. A coach reading top to bottom should be able to say what
 * he learned without scrolling back up.
 */
export function Beat({
  step,
  question,
  title,
  aside,
  children,
}: {
  step: number;
  /** The question this section answers, in the coach's words. */
  question: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={question}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-wire pb-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="num shrink-0 text-[20px] leading-none text-text-faint">
            {String(step).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="label-sm text-accent-sea">{question}</p>
            <h2 className="mt-1 text-[clamp(18px,2.2vw,22px)] font-semibold leading-tight text-text-bright">
              {title}
            </h2>
          </div>
        </div>
        {aside && <div className="shrink-0 text-[12px] text-text-faint">{aside}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * What went right.
 *
 * The findings engine only ever produces problems, so without this the debrief
 * is a list of faults — which is neither how a review is run nor what the match
 * file actually says. Every entry is a target that was met, measured the same
 * way the misses are.
 */
export function WhatWorked({ strengths, matchId }: { strengths: Strength[]; matchId: string }) {
  if (strengths.length === 0)
    return (
      <p className="border border-wire bg-surface p-5 text-[13px] leading-relaxed text-text-dim">
        Nothing in this match cleared one of your targets. That is unusual rather than damning —
        check the targets on your club profile still match the level you are playing at.
      </p>
    );

  // The same tile as every other figure on the page: a target met is a number,
  // not a different kind of object, so it is not a list row with a tick.
  return (
    <TileSheet
      matchId={matchId}
      tiles={strengths.map((strength) => ({
        label: strength.label,
        value: strength.value,
        basis: strength.basis,
        icon: Check,
        tone: "met" as const,
      }))}
    />
  );
}

/**
 * The evidence, folded away.
 *
 * Counts, confirmations and the full list of moments are what a coach checks
 * once he disagrees with something — they are not what he opens the page for.
 * Closed by default, so the argument above it is read first.
 */
export function Drawer({
  label,
  summary,
  children,
  className,
}: {
  label: string;
  summary: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group border border-wire bg-surface", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-2 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[14.5px] font-semibold text-text-bright">{label}</span>
          <span className="mt-0.5 block text-[12.5px] text-text-faint">{summary}</span>
        </span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className="shrink-0 text-text-dim transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-wire">{children}</div>
    </details>
  );
}
