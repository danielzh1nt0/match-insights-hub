import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ip/primitives";
import { countEvents, countLine, type Counted, type ReviewedEvent } from "@/lib/event-reviews";
import { teamRow, type StatsFile } from "@/lib/match-analysis";
import { crestForTeam } from "@/lib/team-crests";
import type { LibraryMatch } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  a: number;
  b: number;
  suffix?: string;
  counts?: { a: Counted; b: Counted };
  types?: string[];
  withheld?: boolean;
  note?: string;
};

function kindIs(e: ReviewedEvent, kind: string) {
  const payload = e.payload ?? {};
  const value = String(payload["kind"] ?? payload["set_piece"] ?? payload["type"] ?? "");
  return value.toLowerCase().includes(kind);
}

function counted(events: ReviewedEvent[], team: "A" | "B", match: (e: ReviewedEvent) => boolean) {
  return countEvents(events, (e) => e.team === team && match(e));
}

/** The number we show: confirmed once anything is confirmed, otherwise detected. */
function headline(c: Counted) {
  return c.confirmed > 0 ? c.confirmed : c.detected;
}

export function HeadToHead({
  match,
  events,
  stats,
  colours,
  ballReliable,
  ours,
  onFilterTypes,
}: {
  match: LibraryMatch;
  events: ReviewedEvent[];
  stats: StatsFile | undefined;
  colours: { A: string; B: string };
  ballReliable: boolean;
  ours: boolean;
  onFilterTypes?: ((types: string[]) => void) | undefined;
}) {
  const [more, setMore] = useState(false);

  const goalsA = counted(events, "A", (e) => e.type === "goal");
  const goalsB = counted(events, "B", (e) => e.type === "goal");
  const shotsA = counted(events, "A", (e) => e.type === "shot");
  const shotsB = counted(events, "B", (e) => e.type === "shot");
  const cornersA = counted(events, "A", (e) => e.type === "set_piece" && kindIs(e, "corner"));
  const cornersB = counted(events, "B", (e) => e.type === "set_piece" && kindIs(e, "corner"));
  const freeA = counted(events, "A", (e) => e.type === "set_piece" && kindIs(e, "free"));
  const freeB = counted(events, "B", (e) => e.type === "set_piece" && kindIs(e, "free"));
  const attemptsA = counted(
    events,
    "A",
    (e) => e.type === "shot" || e.type === "shot_blocked" || kindIs(e, "blocked"),
  );
  const attemptsB = counted(
    events,
    "B",
    (e) => e.type === "shot" || e.type === "shot_blocked" || kindIs(e, "blocked"),
  );
  const wonA = counted(events, "A", (e) => e.type === "turnover_won");
  const wonB = counted(events, "B", (e) => e.type === "turnover_won");
  const highA = counted(events, "A", (e) => e.type === "high_turnover");
  const highB = counted(events, "B", (e) => e.type === "high_turnover");

  const possA = Math.round(teamRow(stats, "A")?.possession_pct ?? 0);
  const possB = Math.round(teamRow(stats, "B")?.possession_pct ?? 0);

  const scoreA = headline(goalsA) || match.scoreA;
  const scoreB = headline(goalsB) || match.scoreB;

  const rows: Row[] = [
    { key: "goals", label: "Goals", a: headline(goalsA), b: headline(goalsB), counts: { a: goalsA, b: goalsB }, types: ["goal"] },
    { key: "shots", label: "Shots", a: headline(shotsA), b: headline(shotsB), counts: { a: shotsA, b: shotsB }, types: ["shot"] },
    { key: "corners", label: "Corners", a: headline(cornersA), b: headline(cornersB), counts: { a: cornersA, b: cornersB }, types: ["set_piece"] },
    { key: "free", label: "Free kicks", a: headline(freeA), b: headline(freeB), counts: { a: freeA, b: freeB }, types: ["set_piece"] },
    {
      key: "attempts",
      label: "Total attempts",
      a: headline(attemptsA),
      b: headline(attemptsB),
      counts: { a: attemptsA, b: attemptsB },
      types: ["shot", "shot_blocked"],
    },
    {
      key: "possession",
      label: "Possession",
      a: ballReliable ? possA : 0,
      b: ballReliable ? possB : 0,
      suffix: "%",
      withheld: !ballReliable,
      note: ballReliable ? "ball tracking: reliable" : "ball tracking: unreliable — withheld",
    },
  ];

  const moreRows: Row[] = ours
    ? [
        { key: "won", label: "Turnovers won", a: headline(wonA), b: headline(wonB), counts: { a: wonA, b: wonB }, types: ["turnover_won"] },
        { key: "high", label: "High turnovers", a: headline(highA), b: headline(highB), counts: { a: highA, b: highB }, types: ["high_turnover"] },
      ]
    : [];

  const crestA = crestForTeam(match.teamA);
  const crestB = crestForTeam(match.teamB);

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-wire px-4 py-3">
        <Side name={match.teamA} colour={colours.A} crest={crestA} />
        <div className="shrink-0 text-center">
          <p className="display text-[30px] leading-none text-cream">
            {scoreA}
            <span className="px-1.5 text-cream-dim">–</span>
            {scoreB}
          </p>
          <p className="num mt-1 text-[10.5px] uppercase tracking-[0.08em] text-text-faint">{match.date}</p>
        </div>
        <Side name={match.teamB} colour={colours.B} crest={crestB} align="right" />
      </div>

      <div className="px-4 py-2">
        {rows.map((r) => (
          <Bar key={r.key} row={r} colours={colours} onFilterTypes={onFilterTypes} />
        ))}
      </div>

      {moreRows.length > 0 && (
        <div className="border-t border-wire-2 px-4 pb-3">
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            aria-expanded={more}
            className="tap flex w-full items-center justify-center gap-1.5 text-[11.5px] uppercase tracking-[0.08em] text-text-faint hover:text-cream"
          >
            More
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={cn("transition-transform", more && "rotate-180")}
            />
          </button>
          {more && moreRows.map((r) => <Bar key={r.key} row={r} colours={colours} onFilterTypes={onFilterTypes} />)}
        </div>
      )}
    </Card>
  );
}

function Side({
  name,
  colour,
  crest,
  align = "left",
}: {
  name: string;
  colour: string;
  crest?: string | undefined;
  align?: "left" | "right" | undefined;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      {crest ? (
        <img src={crest} alt="" className="h-9 w-9 shrink-0 object-contain" />
      ) : (
        <span
          className="h-9 w-9 shrink-0 rounded-full border border-wire"
          style={{ background: colour }}
          aria-hidden="true"
        />
      )}
      <span className="display min-w-0 truncate text-[14px] uppercase text-text">{name}</span>
    </div>
  );
}

function Bar({
  row,
  colours,
  onFilterTypes,
}: {
  row: Row;
  colours: { A: string; B: string };
  onFilterTypes?: ((types: string[]) => void) | undefined;
}) {
  const total = Math.max(row.a + row.b, 1);
  const aShare = (row.a / total) * 100;
  const bShare = (row.b / total) * 100;
  const aWins = row.a >= row.b;
  const grey = "var(--surface-3)";
  const clickable = Boolean(row.types && onFilterTypes);

  const content = (
    <>
      <div className="flex items-end justify-between gap-3">
        <span className={cn("num text-[17px]", row.withheld ? "text-text-faint" : "text-cream")}>
          {row.withheld ? "—" : `${row.a}${row.suffix ?? ""}`}
        </span>
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-dim">{row.label}</span>
        <span className={cn("num text-[17px]", row.withheld ? "text-text-faint" : "text-cream")}>
          {row.withheld ? "—" : `${row.b}${row.suffix ?? ""}`}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-surface-2">
          <span
            className="h-full rounded-full"
            style={{
              width: `${row.withheld ? 0 : aShare}%`,
              background: aWins ? colours.A : grey,
            }}
          />
        </div>
        <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <span
            className="h-full rounded-full"
            style={{
              width: `${row.withheld ? 0 : bShare}%`,
              background: aWins ? grey : colours.B,
            }}
          />
        </div>
      </div>
      {(row.counts || row.note) && (
        <p className="mt-1 text-center text-[10.5px] text-text-faint">
          {row.note ?? `${countLine(row.counts!.a)} · ${countLine(row.counts!.b)}`}
        </p>
      )}
    </>
  );

  if (!clickable) return <div className="border-b border-wire-2 py-2.5 last:border-0">{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onFilterTypes?.(row.types!)}
      aria-label={`Show ${row.label.toLowerCase()} in the events feed`}
      className="tap block w-full border-b border-wire-2 py-2.5 text-left last:border-0 hover:bg-surface-2"
    >
      {content}
    </button>
  );
}
