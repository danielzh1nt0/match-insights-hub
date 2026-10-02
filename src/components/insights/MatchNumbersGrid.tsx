import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { actionLinkClass, IconSquare, SectionHead } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";

export type NumberCell = {
  label: string;
  /** null means the file cannot support it — the cell says so instead of guessing. */
  value: string | null;
  /** What the number means, in a sentence. */
  sentence?: string | undefined;
  /** What it rests on: counts, confirmations, how it was measured. */
  basis?: string | undefined;
  /** Shown in place of the sentence when the value is withheld. */
  withheldNote?: string | undefined;
  icon?: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** Where the number can be inspected properly. */
  link?: { label: string; to: string; search?: Record<string, string> } | undefined;
};

/**
 * The match in numbers.
 *
 * Six cells on one ruled sheet, each the same shape: the figure, what it means,
 * what it rests on, and the way through to the evidence. A cell with nothing
 * behind it says "Withheld" and why — the certainty sits on the same card as
 * the number, which is the only way a coach can tell a measurement from a guess.
 */
export function MatchNumbersGrid({ cells, matchId }: { cells: NumberCell[]; matchId: string }) {
  return (
    <section aria-labelledby="match-numbers">
      <SectionHead
        eyebrow="Counts"
        title="Match numbers"
        right={
          <span className="text-[12px] text-text-faint">
            Every figure comes from this match file
          </span>
        }
      />

      <div className="rule-y mt-4 grid border border-wire bg-surface sm:grid-cols-2 xl:grid-cols-3">
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            className={cn(
              "flex min-w-0 flex-col p-4 sm:p-5",
              // The hairlines run between columns as well as rows, without a
              // trailing rule on the last cell of a row.
              "sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-wire",
              "xl:border-r xl:border-wire xl:[&:nth-child(3n)]:border-r-0",
              i < 1 && "border-t-0",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[15px] font-semibold leading-snug text-text-bright">
                {cell.label}
              </h3>
              {cell.icon && <IconSquare icon={cell.icon} />}
            </div>

            <div className="mt-4 flex-1">
              {cell.value === null ? (
                <>
                  <p className="text-[20px] font-medium text-text-dim">Withheld</p>
                  {cell.withheldNote && (
                    <p className="mt-2 text-[12.5px] leading-snug text-text-dim">
                      {cell.withheldNote}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="num text-[clamp(34px,4vw,46px)] leading-[0.9] text-text-bright">
                    {cell.value}
                  </p>
                  {cell.sentence && (
                    <p className="mt-3 text-[12.5px] leading-snug text-text-dim">{cell.sentence}</p>
                  )}
                </>
              )}
              {cell.basis && (
                <p className="mt-2 text-[11.5px] leading-snug text-text-faint">{cell.basis}</p>
              )}
            </div>

            {cell.link && (
              <p className="mt-4">
                <Link
                  to={cell.link.to}
                  params={{ matchId }}
                  {...(cell.link.search ? { search: cell.link.search } : {})}
                  className={actionLinkClass()}
                >
                  {cell.link.label}
                </Link>
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
