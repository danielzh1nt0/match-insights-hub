import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type NumberCell = {
  label: string;
  /** null means the file cannot support it — the cell says so instead of guessing. */
  value: string | null;
  sub?: string | undefined;
  tone?: "bad" | "warn" | undefined;
  /** Shown in place of a value when it is withheld. */
  withheldNote?: string | undefined;
};

/**
 * The match in numbers, as a bordered grid.
 *
 * A cell with no value says "Withheld" and what would make it available,
 * rather than printing a figure the match file cannot support. That is the
 * point of the section: the certainty shows on the same line as the number.
 */
export function MatchNumbersGrid({ cells, matchId }: { cells: NumberCell[]; matchId: string }) {
  return (
    <section aria-labelledby="match-numbers" className="rounded-[14px] border border-wire bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-1 pt-4">
        <h2 id="match-numbers" className="display text-[20px] text-text">Match numbers</h2>
        <span className="text-[11.5px] text-text-faint">Everything here comes from this match file</span>
      </div>

      <dl className="grid grid-cols-2 border-t border-wire-2 md:grid-cols-3">
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            className={cn(
              "border-wire-2 px-5 py-4",
              i % 2 === 0 && "border-r md:border-r-0",
              "md:border-r",
              i >= 2 && "border-t md:border-t-0",
              i >= 3 && "md:border-t",
            )}
          >
            <dt className="text-[11.5px] text-text-faint">{cell.label}</dt>
            {cell.value === null ? (
              <>
                <dd className="display mt-1 text-[20px] leading-none text-text-dim">Withheld</dd>
                {cell.withheldNote && <p className="mt-1 text-[11px] leading-snug text-text-faint">{cell.withheldNote}</p>}
              </>
            ) : (
              <>
                <dd className={cn("display-i mt-1 text-[26px] leading-none", cell.tone === "bad" ? "text-reaction-bad" : cell.tone === "warn" ? "text-reaction-warn" : "text-cream")}>
                  {cell.value}
                </dd>
                {cell.sub && <p className="mt-1 text-[11px] leading-snug text-text-faint">{cell.sub}</p>}
              </>
            )}
          </div>
        ))}

        <div className="col-span-2 border-t border-wire-2 px-5 py-4 md:col-span-1 md:border-t-0">
          <dt className="text-[11.5px] text-text-faint">All match stats</dt>
          <dd className="mt-1">
            <Link to="/match/$matchId/stats" params={{ matchId }} className="display text-[18px] text-cream hover:underline">
              Open →
            </Link>
          </dd>
          <p className="mt-1 text-[11px] leading-snug text-text-faint">Shots, passes, set pieces, shape</p>
        </div>
      </dl>
    </section>
  );
}
