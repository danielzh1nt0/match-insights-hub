import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Card, Pill } from "./primitives";
import { HeatBlobs, Pitch, Visual } from "./visual";
import { EVENT_LABEL, EVENT_TONE, type MatchEvent, type PlayerRow } from "@/lib/match-data";
import { formatClock } from "@/lib/sample-data";

/**
 * One player's own numbers, drawn from their events and their own heat map.
 * `matchId` is only passed inside the app; on a public share page the moments
 * are listed without links.
 */
export function PlayerReport({
  player,
  events,
  teamA,
  matchId,
}: {
  player: PlayerRow;
  events: MatchEvent[];
  teamA: string;
  matchId?: string;
}) {
  const own = events.filter((e) => e.playerId === player.id);

  return (
    <>
      <Card className="flex items-center gap-4">
        <span className="num flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-surface-3 text-[24px] text-cream">
          {player.shirt}
        </span>
        <div className="min-w-0">
          <h1 className="display truncate text-[22px] text-text">{player.name}</h1>
          <p className="text-[12px] text-text-faint">
            {player.position} · {player.minutes} {player.minutes === 1 ? "minute" : "minutes"} played ·{" "}
            {own.length} {own.length === 1 ? "moment" : "moments"}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Touches", value: `${player.touches}` },
          { label: "Passes", value: `${player.passes}` },
          { label: "Passes found a team-mate", value: `${player.passAccuracy}%` },
          { label: "Balls given away", value: `${player.losses}` },
          { label: "Balls won", value: `${player.regains}` },
          { label: "Better pass was open", value: `${player.betterOptions}` },
          { label: "Distance covered", value: `${player.distanceKm} km` },
          { label: "Moments in the match", value: `${own.length}` },
        ].map((s) => (
          <Card key={s.label} small className="flex flex-col gap-1">
            <span className="num text-[24px] leading-none text-cream">{s.value}</span>
            <span className="text-[11.5px] leading-snug text-text-faint">{s.label}</span>
          </Card>
        ))}
      </div>

      <Visual
        question="Where did this player play?"
        caption="Brighter areas are where they spent more time."
        info={{
          title: "Where did this player play?",
          glossaryId: "heat-map",
          rows: [
            { label: "What it counts", value: "Time in each area" },
            { label: "Player", value: `${player.shirt} ${player.name}`, cream: true },
            { label: "Minutes", value: `${player.minutes}` },
            { label: "Touches", value: `${player.touches}`, cream: true },
            { label: "Target", value: "No target" },
          ],
        }}
      >
        <Pitch arrowLabel={`${teamA} attack →`}>
          <HeatBlobs points={player.heat} color="var(--team-a)" />
        </Pitch>
      </Visual>

      <Visual
        question="What did this player do, and when?"
        caption="Only this player's own moments, in match order."
        info={{
          title: "This player's moments",
          glossaryId: "finding",
          rows: [
            { label: "What it counts", value: "Events this player was on the ball for" },
            { label: "Moments", value: `${own.length}`, cream: true },
            { label: "Balls given away", value: `${player.losses}` },
            { label: "Balls won", value: `${player.regains}`, cream: true },
            { label: "Target", value: "No target" },
          ],
        }}
      >
        {own.length === 0 ? (
          <p className="py-2 text-[13px] text-text-dim">No moments on the ball in this clip.</p>
        ) : (
          <ul>
            {own.map((e) => {
              const row = (
                <>
                  <span className="num w-12 shrink-0 text-[12.5px] text-cream">{formatClock(e.t)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-text">
                    {EVENT_LABEL[e.kind]}
                    {e.note ? ` — ${e.note}` : ""}
                  </span>
                  <Pill tone={EVENT_TONE[e.kind]}>{EVENT_LABEL[e.kind]}</Pill>
                </>
              );
              return (
                <li key={e.id} className="border-b border-wire-2 last:border-0">
                  {matchId ? (
                    <Link
                      to="/match/$matchId/match"
                      params={{ matchId }}
                      search={{ t: e.t }}
                      aria-label={`Watch ${EVENT_LABEL[e.kind]} at ${formatClock(e.t)}`}
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
