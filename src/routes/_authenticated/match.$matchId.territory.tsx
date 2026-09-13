import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Card, Chip, Segmented } from "@/components/ip/primitives";
import { HeatBlobs, Pitch, PitchDots, PitchShirts, Visual } from "@/components/ip/visual";
import { useMatch } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/match/$matchId/territory")({
  head: () => ({
    meta: [
      { title: "Territory — Ipanema" },
      { name: "description", content: "Where the team lived, where it lost the ball and where it won it back." },
      { property: "og:title", content: "Territory — Ipanema" },
      { property: "og:description", content: "Heat maps, losses, recoveries and a shape replay." },
    ],
  }),
  component: Territory,
});

type Window = "now" | "15" | "30" | "60";
type BallState = "with" | "without" | "both";

function Territory() {
  const { matchId } = Route.useParams();
  const { match, data } = useMatch(matchId);
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [window, setWindow] = useState<Window>("now");
  const [ball, setBall] = useState<BallState>("both");
  const [snapIndex, setSnapIndex] = useState(0);

  const total = match?.durationS ?? 1;
  const teamColor = scope === "b" ? "var(--team-b)" : "var(--team-a)";
  const heat = data
    ? data.heat.slice(0, window === "now" ? data.heat.length : window === "15" ? 8 : window === "30" ? 14 : 20)
    : [];
  const snapshot = data?.snapshots[Math.min(snapIndex, data.snapshots.length - 1)];

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {data && match && (
        <>
          <Visual
            question="Where did the team live?"
            caption="Brighter areas are where players spent more time."
            info={{
              title: "Where did the team live?",
              rows: [
                { label: "What it counts", value: "Player time per area" },
                { label: "Window", value: window === "now" ? "Whole half" : `Last ${window}s` },
                { label: "Ball state", value: ball === "both" ? "With and without" : ball === "with" ? "With ball" : "Without ball" },
                { label: "Your average height", value: "41 m", cream: true },
                { label: "Target", value: "No target", cream: true },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              <HeatBlobs points={heat} color={teamColor} />
            </Pitch>
            <div className="mt-3 flex flex-col gap-2">
              <Segmented
                ariaLabel="Time window"
                value={window}
                onChange={setWindow}
                options={[
                  { value: "now", label: "Up to now" },
                  { value: "15", label: "15 s" },
                  { value: "30", label: "30 s" },
                  { value: "60", label: "60 s" },
                ]}
              />
              <Segmented
                ariaLabel="Ball state"
                value={ball}
                onChange={setBall}
                options={[
                  { value: "with", label: "With ball" },
                  { value: "without", label: "Without ball" },
                  { value: "both", label: "Both" },
                ]}
              />
            </div>
          </Visual>

          <Card className="flex items-center justify-between gap-4">
            <div>
              <h2 className="display text-[17px] uppercase text-cream">How compact?</h2>
              <p className="mt-1 text-[11.5px] text-text-faint">
                Distance from the deepest to the highest player, on average.
              </p>
            </div>
            <span className="num text-[30px] leading-none text-cream">
              {data.compactBandM}
              <span className="text-[14px] text-cream-dim"> m</span>
            </span>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Visual
              question="Where was the ball lost?"
              caption="Each dot is one giveaway by your team."
              info={{
                title: "Where was the ball lost?",
                rows: [
                  { label: "What it counts", value: "Giveaways by your team" },
                  { label: "Total", value: `${data.losses.length}`, cream: true },
                  { label: "In your own half", value: "5" },
                  { label: "In the middle", value: "6" },
                  { label: "Target", value: "No target", cream: true },
                ],
              }}
            >
              <Pitch>
                <PitchDots points={data.losses} color="var(--quality-bad)" />
              </Pitch>
            </Visual>

            <Visual
              question="Where was the ball won back?"
              caption="Each dot is one ball your team recovered."
              info={{
                title: "Where was the ball won back?",
                rows: [
                  { label: "What it counts", value: "Recoveries by your team" },
                  { label: "Total", value: `${data.recoveries.length}`, cream: true },
                  { label: "High up the pitch", value: "4" },
                  { label: "Inside 5 s of losing it", value: "41%" },
                  { label: "Target", value: "60%", cream: true },
                ],
              }}
            >
              <Pitch>
                <PitchDots points={data.recoveries} color="var(--quality-good)" />
              </Pitch>
            </Visual>
          </div>

          <Visual
            question="How did the shape move?"
            caption="A snapshot of positions every thirty seconds."
            info={{
              title: "How did the shape move?",
              rows: [
                { label: "What it shows", value: "Player positions" },
                { label: "Snapshot every", value: "30 s" },
                { label: "Snapshots", value: `${data.snapshots.length}`, cream: true },
                { label: "Length back to front", value: `${data.blockLengthM} m`, cream: true },
                { label: "Target", value: "38 m", cream: true },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              {snapshot && <PitchShirts players={snapshot.players} color={teamColor} />}
            </Pitch>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.snapshots.map((s, i) => (
                <Chip key={s.t} active={i === snapIndex} onClick={() => setSnapIndex(i)}>
                  {formatClock(Math.min(s.t, total))}
                </Chip>
              ))}
            </div>
          </Visual>
        </>
      )}
    </MatchShell>
  );
}
