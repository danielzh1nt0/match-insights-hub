import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { actionLinkClass, IconSquare } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";

export type Tile = {
  /** What the figure is, as a coach would name it. */
  label: string;
  /** null means the file cannot support it — the tile says so instead of guessing. */
  value: string | null;
  /** What the number means, in a sentence. */
  sentence?: string | undefined;
  /** What it rests on: counts, confirmations, how it was measured. */
  basis?: string | undefined;
  /** Shown in place of the sentence when the value is withheld. */
  withheldNote?: string | undefined;
  icon?: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** Met means the figure cleared the target it was measured against. */
  tone?: "default" | "met";
  /** Where the number can be inspected properly. */
  link?: { label: string; to: string; search?: Record<string, string> } | undefined;
};

/**
 * One figure, in the shape every figure on this page takes.
 *
 * The label, the number, what it means, what it rests on, and the way through
 * to the evidence. A count and a target that was met are the same kind of
 * object — only the colour of the figure differs — so they share a tile rather
 * than one being a card and the other a list row.
 */
export function StatTile({ tile, matchId }: { tile: Tile; matchId: string }) {
  const met = tile.tone === "met";
  return (
    <div className="flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug text-text-bright">{tile.label}</h3>
        {tile.icon && (
          <IconSquare icon={tile.icon} className={met ? "border-positive/50 text-positive" : ""} />
        )}
      </div>

      <div className="mt-4 flex-1">
        {tile.value === null ? (
          <>
            <p className="text-[20px] font-medium text-text-dim">Withheld</p>
            {tile.withheldNote && (
              <p className="mt-2 text-[12.5px] leading-snug text-text-dim">{tile.withheldNote}</p>
            )}
          </>
        ) : (
          <>
            <p
              className={cn(
                "num text-[clamp(34px,4vw,46px)] leading-[0.9]",
                met ? "text-positive" : "text-text-bright",
              )}
            >
              {tile.value}
            </p>
            {tile.sentence && (
              <p className="mt-3 text-[12.5px] leading-snug text-text-dim">{tile.sentence}</p>
            )}
          </>
        )}
        {tile.basis && (
          <p className="mt-2 text-[11.5px] leading-snug text-text-faint">{tile.basis}</p>
        )}
      </div>

      {tile.link && (
        <p className="mt-4">
          <Link
            to={tile.link.to}
            params={{ matchId }}
            {...(tile.link.search ? { search: tile.link.search } : {})}
            className={actionLinkClass()}
          >
            {tile.link.label}
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * Tiles on one ruled sheet.
 *
 * Hairlines run between the columns as well as the rows, so a set of figures
 * reads as a single sheet rather than a scatter of cards.
 */
export function TileSheet({
  tiles,
  matchId,
  columns = 3,
  className,
}: {
  tiles: Tile[];
  matchId: string;
  /** How many across at the widest breakpoint. */
  columns?: 2 | 3;
  className?: string;
}) {
  if (tiles.length === 0) return null;
  return (
    <div
      className={cn(
        "rule-y grid border border-wire bg-surface sm:grid-cols-2",
        columns === 3 ? "xl:grid-cols-3" : "",
        "sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-wire",
        columns === 3 && "xl:[&>*]:border-r xl:[&>*]:border-wire xl:[&>*:nth-child(3n)]:border-r-0",
        className,
      )}
    >
      {tiles.map((tile) => (
        <StatTile key={tile.label} tile={tile} matchId={matchId} />
      ))}
    </div>
  );
}
