import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Card, Pill } from "./primitives";
import { Visual } from "./visual";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { PlayerStat } from "@/lib/match-analysis";
import { formatClock } from "@/lib/sample-data";

/**
 * One player's own numbers, taken from the tracking file.
 *
 * The file supplies shirt numbers, not names, so this page never shows a name.
 * Anything the file does not carry — a position, a personal heat map — is left
 * out rather than filled in. These numbers may be sent to the player or their
 * family, which is exactly why nothing here may be inferred.
 */
export function PlayerReport({
  player,
  events,
  matchId,
}: {
  player: PlayerStat;
  events: ReviewedEvent[];
  matchId?: string;
}) {
  const shirtOf = (event: ReviewedEvent) => {
    const raw = event.payload?.["shirt"] ?? event.payload?.["shirt_number"] ?? event.payload?.["player_shirt"];
    const shirt = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(shirt) ? shirt : null;
  };

  const own = events.filter((event) => event.status !== "deleted" && shirtOf(event) === player.id);
  const losses = own.filter((event) => event.type === "turnover_lost").length;
  const regains = own.filter((event) => event.type === "turnover_won" || event.type === "high_turnover").length;
  const completion = player.passes > 0 ? Math.round((player.passesCompleted / player.passes) * 100) : null;
  const distanceKm = Math.round((player.distanceM / 1000) * 100) / 100;

  const stats: { label: string; value: string }[] = [
    { label: "Touches", value: `${player.touches}` },
    { label: "Passes", value: `${player.passes}` },
    { label: "Passes found a team-mate", value: completion === null ? "—" : `${completion}%` },
    { label: "Balls given away", value: `${losses}` },
    { label: "Balls won", value: `${regains}` },
    { label: "Better pass was open", value: `${player.betterOptions}` },
    { label: "Distance covered", value: `${distanceKm} km` },
    { label: "Moments in the match", value: `${own.length}` },
  ];

  return (
    <>
      <Card className="flex items-center gap-4">
        <span className="num flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-surface-3 text-[24px] text-cream">
          {player.id}
        </span>
        <div className="min-w-0">
          <h1 className="display truncate text-[22px] text-text">Shirt {player.id}</h1>
          <p className="text-[12px] text-text-faint">
            {player.minutes} {player.minutes === 1 ? "minute" : "minutes"} tracked · {own.length}{" "}
            {own.length === 1 ? "moment" : "moments"}
          </p>
        </div>
      </Card>

      <p className="px-1 text-[11.5px] leading-relaxed text-text-faint">
        The tracking file records shirt numbers, not names. Match this number to your own team sheet before sharing
        these numbers with anyone.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} small className="flex flex-col gap-1">
            <span className="num text-[24px] leading-none text-cream">{stat.value}</span>
            <span className="text-[11.5px] leading-snug text-text-faint">{stat.label}</span>
          </Card>
        ))}
      </div>

      <Visual
        framing="custom"
        question="What did this player do, and when?"
        caption="Only this player's own moments, in match order."
        info={{
          title: "This player's moments",
          glossaryId: "finding",
          rows: [
            { label: "What it counts", value: "Tracked moments naming this shirt number" },
            { label: "Moments", value: `${own.length}`, cream: true },
            { label: "Balls given away", value: `${losses}` },
            { label: "Balls won", value: `${regains}`, cream: true },
            { label: "Target", value: "No target" },
          ],
        }}
      >
        {own.length === 0 ? (
          <p className="py-2 text-[13px] text-text-dim">
            No tracked moment in this match names shirt {player.id}. Their totals above still come from the tracking
            file.
          </p>
        ) : (
          <ul>
            {own.map((event) => {
              const row = (
                <>
                  <span className="num w-12 shrink-0 text-[12.5px] text-cream">{formatClock(event.t)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text">{event.title}</span>
                  <Pill tone={event.type === "turnover_lost" ? "bad" : event.type === "turnover_won" ? "good" : "neutral"}>
                    {event.status === "confirmed" ? "Confirmed" : "Detected"}
                  </Pill>
                </>
              );
              return (
                <li key={event.id} className="border-b border-wire-2 last:border-0">
                  {matchId ? (
                    <Link
                      to="/match/$matchId/match"
                      params={{ matchId }}
                      search={{ t: event.t }}
                      aria-label={`Watch ${event.title} at ${formatClock(event.t)}`}
                      className="tap flex items-center gap-3 py-2.5 hover:bg-surface-2"
                    >
                      {row}
                      <Play size={14} className="shrink-0 text-text-faint" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Visual>
    </>
  );
}
