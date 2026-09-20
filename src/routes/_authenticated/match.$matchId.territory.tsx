import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import type { Period, TeamScope } from "@/components/ip/chrome";
import { MatchShell } from "@/components/ip/match-shell";
import { FormationReplay } from "@/components/territory/FormationReplay";
import { LossWinPitches } from "@/components/territory/LossWinPitches";
import { ShapeRibbon } from "@/components/territory/ShapeRibbon";
import { TeamHeatMap } from "@/components/territory/TeamHeatMap";
import { useAnalysis } from "@/hooks/use-match";
import { attacksRight, teamRow } from "@/lib/match-analysis";
import type { Frame, FramePlayer } from "@/lib/match-source";

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
  component: TerritoryScreen,
});

type TeamKey = "A" | "B";

function percentPlayer(player: FramePlayer, length: number, width: number) {
  return {
    id: `${player.team}-${player.id}`,
    num: String(player.id),
    x: Math.max(0, Math.min(1, player.m[0] / length)),
    y: Math.max(0, Math.min(1, player.m[1] / width)),
    ...(player.gk ? { isGK: true } : {}),
  };
}

function centroid(players: { x: number; y: number }[]) {
  if (players.length === 0) return { x: 0.5, y: 0.5 };
  return { x: players.reduce((sum, player) => sum + player.x, 0) / players.length, y: players.reduce((sum, player) => sum + player.y, 0) / players.length };
}

function hullPath(players: { x: number; y: number }[]) {
  if (players.length < 4) return "";
  const centre = centroid(players);
  return [...players]
    .sort((a, b) => Math.atan2(a.y - centre.y, a.x - centre.x) - Math.atan2(b.y - centre.y, b.x - centre.x))
    .map((player, index) => `${index === 0 ? "M" : "L"}${player.x * 100},${player.y * 100}`)
    .join(" ") + " Z";
}

function frameNear(frames: Frame[], time: number, team: TeamKey, phase: "with" | "without") {
  const eligible = frames.filter((frame) => phase === "with" ? frame.possession === team : frame.possession !== team);
  return eligible.reduce<Frame | null>((nearest, frame) => !nearest || Math.abs(frame.t - time) < Math.abs(nearest.t - time) ? frame : nearest, null);
}

function TerritoryScreen() {
  const { matchId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [scope, setScope] = useState<TeamScope>("a");
  const [period, setPeriod] = useState<Period>("full");
  const [heatTime, setHeatTime] = useState(1);
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [shapeTime, setShapeTime] = useState(0);
  const [phase, setPhase] = useState<"with" | "without">("with");
  const { match, row, label, file, team, colours, territory, loading, stats } = useAnalysis(matchId, scope);
  const chosenTeam: TeamKey = team ?? "A";
  const duration = row?.duration_s ?? match?.durationS ?? 1;
  const periodStart = period === "2nd" ? duration / 2 : 0;
  const periodEnd = period === "1st" ? duration / 2 : duration;
  const frames = useMemo(() => (file?.frames ?? []).filter((frame) => frame.t >= periodStart && frame.t <= periodEnd), [file?.frames, periodStart, periodEnd]);
  const visibleFrames = useMemo(() => frames.filter((frame) => frame.t <= periodStart + (periodEnd - periodStart) * heatTime), [frames, heatTime, periodStart, periodEnd]);
  const length = Math.max(file?.pitch?.length ?? 105, 1);
  const width = Math.max(file?.pitch?.width ?? 68, 1);
  const playerIds = useMemo(() => {
    const appearances = new Map<string, number>();
    for (const frame of frames) for (const player of frame.players) {
      if (player.team !== chosenTeam || player.state === "stale") continue;
      const id = String(player.id);
      appearances.set(id, (appearances.get(id) ?? 0) + 1);
    }
    return [...appearances].sort((a, b) => b[1] - a[1]).slice(0, 11).map(([id]) => id).sort((a, b) => Number(a) - Number(b));
  }, [frames, chosenTeam]);
  const blobsFor = (playerId: string | null) => {
    const counts = new Map<string, { x: number; y: number; n: number }>();
    for (const frame of visibleFrames) for (const player of frame.players) {
      if (player.team !== chosenTeam || player.state === "stale" || (playerId && String(player.id) !== playerId)) continue;
      const x = Math.max(0, Math.min(1, player.m[0] / length));
      const y = Math.max(0, Math.min(1, player.m[1] / width));
      const key = `${Math.floor(x * 7)}:${Math.floor(y * 10)}`;
      const cell = counts.get(key) ?? { x, y, n: 0 };
      cell.n += 1;
      counts.set(key, cell);
    }
    const max = Math.max(1, ...[...counts.values()].map((cell) => cell.n));
    return [...counts.values()].map((cell) => ({ x: cell.x, y: cell.y, r: 0.16, intensity: cell.n / max }));
  };
  const teamBlobs = useMemo(() => blobsFor(null), [visibleFrames, chosenTeam, length, width]);
  const playerBlobs = useMemo(() => activePlayer ? blobsFor(activePlayer) : [], [activePlayer, visibleFrames, chosenTeam, length, width]);
  const trackedPerFrame = visibleFrames.map((frame) => frame.players.filter((player) => player.team === chosenTeam && player.state !== "stale").length).sort((a, b) => a - b);
  const typicalInView = trackedPerFrame.length ? trackedPerFrame[Math.floor(trackedPerFrame.length / 2)] ?? 0 : 0;
  const rawTimeline = ((stats?.metrics?.["shape_timeline"] as Record<string, unknown[]> | undefined)?.[chosenTeam] ?? []) as Record<string, unknown>[];
  const timeline = rawTimeline.flatMap((sample) => typeof sample["t"] === "number" && typeof sample["length"] === "number" && typeof sample["width"] === "number" ? [{ t: sample["t"], length: sample["length"], width: sample["width"] }] : []);
  const teamStats = teamRow(stats, chosenTeam);
  const selectedMoment = periodStart + (periodEnd - periodStart) * shapeTime;
  const formationFrame = frameNear(frames, selectedMoment, chosenTeam, phase);
  const formationPlayers = (formationFrame?.players ?? []).filter((player) => player.team === chosenTeam && player.state !== "stale").map((player) => percentPlayer(player, length, width));
  const formationCentre = centroid(formationPlayers);
  const snapshots = (territory?.snapshots ?? []).filter((snapshot) => snapshot.t >= periodStart && snapshot.t <= periodEnd).map((snapshot) => ({ t: snapshot.t, players: snapshot.players.map((player) => ({ id: player.id, num: String(player.shirt), x: player.x / 100, y: player.y / 100, ...(player.isGK ? { isGK: true } : {}) })) }));
  const attackRight = attacksRight(row?.attack_right, label?.attack_right_override, chosenTeam) === (period !== "2nd");
  const teamName = chosenTeam === "B" ? match?.teamB : match?.teamA;
  const teamColour = chosenTeam === "B" ? colours.B : colours.A;
  const screenVars = { "--team-a": colours.A, "--team-b": colours.B } as CSSProperties;
  const seekToMatch = (t: number) => void navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t } });

  return (
    <MatchShell matchId={matchId} match={match} scope={scope} setScope={(next) => { setScope(next === "both" ? "a" : next); setActivePlayer(null); }} period={period} setPeriod={setPeriod}>
      <div style={{ ...screenVars, display: "flex", flexDirection: "column", paddingBottom: "120px" }}>
        {loading && <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2" role="status" aria-label="Loading territory"><div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-cream" /></div>}
        {territory && match && <>
          <TeamHeatMap teamColour={teamColour} attackLabel={`${teamName ?? "Team"} attack ${attackRight ? "right" : "left"}`} teamBlobs={teamBlobs} playerBlobs={playerBlobs} activePlayer={activePlayer} players={playerIds.map((id) => ({ id, num: id }))} onPlayerTap={(id) => setActivePlayer(id === "all" ? null : id)} sliderValue={heatTime} onSliderChange={setHeatTime} reliabilityLabel={`${typicalInView} of ${playerIds.length} in view`} frameCount={visibleFrames.length} />
          {timeline.length > 1 && <ShapeRibbon teamColour={teamColour} timeline={timeline} durationSeconds={duration} currentTime={selectedMoment} onSeek={(t) => { setShapeTime(t / duration); seekToMatch(t); }} medianLength={Math.round(teamStats?.block_length_median_m ?? territory.blockLengthM)} />}
          {(territory.losses.length > 0 || territory.recoveries.length > 0) && <LossWinPitches teamColour={teamColour} losses={territory.losses.map((point) => ({ ...point, x: point.x / 100, y: point.y / 100 }))} wins={territory.recoveries.map((point) => ({ ...point, x: point.x / 100, y: point.y / 100 }))} onDotTap={(point) => seekToMatch(point.t)} />}
          {formationPlayers.length > 0 && <FormationReplay teamColour={teamColour} attackLabel={`${teamName ?? "Team"} attack ${attackRight ? "right" : "left"}`} players={formationPlayers} centroid={formationCentre} hullPoints={hullPath(formationPlayers)} phase={phase} onPhaseChange={setPhase} sliderValue={shapeTime} onSliderChange={setShapeTime} snapshots={snapshots} onSnapshotTap={(t) => setShapeTime(Math.max(0, Math.min(1, (t - periodStart) / Math.max(periodEnd - periodStart, 1))))} currentTime={selectedMoment} />}
        </>}
      </div>
    </MatchShell>
  );
}