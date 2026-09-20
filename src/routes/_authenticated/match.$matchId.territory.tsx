import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { Chip } from "@/components/ip/primitives";
import { ShapeRibbon } from "@/components/ip/stats-visuals";
import { Pitch, PitchDots, PitchShirts, PortraitPitch, Visual } from "@/components/ip/visual";
import { useAnalysis } from "@/hooks/use-match";
import { formatClock } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/match/$matchId/territory")({
  head: () => ({
    meta: [
      { title: "Territory — Ipanema" },
      { name: "description", content: "Where the team lived, where it lost the ball and where it won it back." },
      { property: "og:title", content: "Territory — Ipanema" },
      { property: "og:description", content: "Heat maps, losses, recoveries and a shape replay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Territory,
});

function Territory() {
  const { matchId } = Route.useParams();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const { match, team, colours, territory, loading, events, stats } = useAnalysis(matchId, scope);
  const [snapIndex, setSnapIndex] = useState(0);

  const teamName = team === "B" ? match?.teamB : team === "A" ? match?.teamA : "Both teams";
  const teamColour = team === "B" ? colours.B : colours.A;
  const snapshot = territory?.snapshots[Math.min(snapIndex, territory.snapshots.length - 1)];
  const selectedEvents = events.filter((event) => !team || event.team === team);
  const evidenceFor = (type: string) => {
    const found = selectedEvents.filter((event) => event.type === type);
    return `${found.filter((event) => event.status === "confirmed").length} confirmed · ${found.length} detected`;
  };

  return (
    <MatchShell
      matchId={matchId}
      match={match}
      scope={scope}
      setScope={setScope}
      period={period}
      setPeriod={setPeriod}
    >
      {loading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading">
          <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" />
        </div>
      )}

      {territory && match && (
        <>
          <Visual
            question="Where did we play?"
            caption="Brighter areas show where we spent more time."
            takeaway={{ value: territory.playerCount, unit: "players", label: "typically visible in each frame" }}
            comparison={{ label: "vs season average", value: "—", tone: "neutral" }}
            honesty={`${territory.playerCount} players · ${territory.frameCount.toLocaleString()} frames`}
            footerNote="Whole match"
            info={{
              title: "Where did we play?",
              glossaryId: "heat-map",
              rows: [
                { label: "What it counts", value: "Player time per area" },
                { label: "Team", value: teamName ?? "Both teams", cream: true },
                { label: "Players tracked", value: `${territory.playerCount}` },
                { label: "Frames used", value: territory.frameCount.toLocaleString() },
                { label: "Height of the last line", value: `${territory.lineHeightM} m`, cream: true },
              ],
            }}
          >
            <PortraitPitch arrowLabel={`${teamName} attack`}>
              {territory.heat.map((point, index) => <circle key={index} cx={(point.y / 100) * 64} cy={100 - point.x} r={3 + point.w * 8} fill={teamColour} opacity={.06 + point.w * .18} />)}
            </PortraitPitch>
            <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-text-faint"><span>0:00</span><span>1st half</span><span>2nd half</span><span>Full</span></div>
            <p className="num mt-2 text-[11.5px] text-text-faint">
              n = {territory.playerCount} players · {territory.frameCount.toLocaleString()} frames
            </p>
          </Visual>

          <Visual
            question="How compact were we?"
            caption="Thicker ribbon means we were stretched further front-to-back. The thin line is width."
            takeaway={{ value: territory.blockLengthM, unit: "m", label: "our typical length" }}
            comparison={{ label: "vs our target", value: "—", tone: "neutral" }}
            honesty={`${territory.frameCount.toLocaleString()} detected frames`}
            info={{ title: "Team compactness", glossaryId: "compactness", rows: [{ label: "Typical width", value: `${territory.compactBandM} m`, cream: true }, { label: "Length back to front", value: `${territory.blockLengthM} m` }, { label: "Frames used", value: territory.frameCount.toLocaleString() }] }}
          >
            <ShapeRibbon stats={stats} team={team ?? "A"} />
          </Visual>

          <Visual
            question="Where did we lose it — and where did we win it?"
            caption="Every loss and recovery, shown separately so the pattern is clear."
            takeaway={{ value: territory.losses.length, unit: "lost", label: `${territory.recoveries.length} won back` }}
            comparison={{ label: "won minus lost", value: `${territory.recoveries.length - territory.losses.length > 0 ? "+" : ""}${territory.recoveries.length - territory.losses.length}`, tone: territory.recoveries.length >= territory.losses.length ? "good" : "bad" }}
            honesty={`${evidenceFor("turnover_lost")} · ${evidenceFor("turnover_won")}`}
            footerNote={`${territory.losses.length} lost · ${territory.recoveries.length} won`}
            info={{ title: "Turnover locations", glossaryId: "turnover", rows: [{ label: "Lost", value: `${territory.losses.length}` }, { label: "Won", value: `${territory.recoveries.length}`, cream: true }, { label: "Team", value: teamName ?? "Both teams" }] }}
          >
            <div className="grid grid-cols-2 gap-2"><div><p className="display mb-1.5 text-center text-[12px] uppercase text-text-faint">Lost</p><Pitch><PitchDots points={territory.losses} color="var(--quality-bad)" /></Pitch></div><div><p className="display mb-1.5 text-center text-[12px] uppercase text-text-faint">Won</p><Pitch><PitchDots points={territory.recoveries} color="var(--quality-good)" /></Pitch></div></div>
          </Visual>

          <Visual
            question="How did our shape change?"
            caption="One team shape every thirty seconds. Tap a time to move through the match."
            takeaway={{ value: snapshot?.lengthM ?? "—", unit: "m", label: "long from back to front" }}
            comparison={{ label: "vs our target", value: "—", tone: "neutral" }}
            honesty={`${snapshot?.players.length ?? 0} players · ${territory.snapshots.length} snapshots`}
            info={{
              title: "How did the shape move?",
              glossaryId: "shape-snapshot",
              rows: [
                { label: "What it shows", value: "Player positions" },
                { label: "Team", value: teamName ?? "Both teams", cream: true },
                { label: "Snapshots", value: `${territory.snapshots.length}` },
                { label: "Length back to front", value: `${snapshot?.lengthM ?? 0} m`, cream: true },
                { label: "Width side to side", value: `${snapshot?.widthM ?? 0} m` },
              ],
            }}
          >
            <Pitch arrowLabel={`${match.teamA} attack →`}>
              {snapshot && <PitchShirts players={snapshot.players} color={teamColour} />}
            </Pitch>
            <p className="num mt-2 text-[11.5px] text-text-faint">
              {snapshot?.players.length ?? 0} players on the pitch · {snapshot?.lengthM ?? 0} m long
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {territory.snapshots.map((s, i) => (
                <Chip key={s.t} active={i === snapIndex} onClick={() => setSnapIndex(i)}>
                  {formatClock(s.t)}
                </Chip>
              ))}
            </div>
          </Visual>
        </>
      )}
    </MatchShell>
  );
}
