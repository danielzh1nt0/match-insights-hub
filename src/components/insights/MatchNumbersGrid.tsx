import { TileSheet, type Tile } from "@/components/insights/StatTile";

export type NumberCell = Tile;

/**
 * The match in numbers.
 *
 * Six figures on one ruled sheet, each the same shape as every other figure on
 * the page. A cell with nothing behind it says "Withheld" and why — the
 * certainty sits on the same tile as the number, which is the only way a coach
 * can tell a measurement from a guess.
 */
export function MatchNumbersGrid({ cells, matchId }: { cells: NumberCell[]; matchId: string }) {
  return (
    <section aria-label="The match in numbers">
      <TileSheet tiles={cells} matchId={matchId} />
    </section>
  );
}
