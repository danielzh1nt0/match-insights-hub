import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ip/primitives";
import { MomentSection, type Clip } from "@/components/insights/MomentSection";
import { CounterPressStrip } from "@/components/visuals/CounterPressStrip";
import { HeatMap } from "@/components/visuals/HeatMap";
import { MiniPitch } from "@/components/visuals/MiniPitch";
import { PhaseSpine, type Phase } from "@/components/visuals/PhaseSpine";
import { PlayerChip } from "@/components/visuals/PlayerChip";
import { TwoTeamBar } from "@/components/visuals/TwoTeamBar";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { teamRow, type StatsFile, type TeamKey } from "@/lib/match-analysis";
import type { LibraryMatch } from "@/lib/sample-data";

function clipLabel(seconds: number) { return `${Math.round(seconds / 60)}′`; }
function eventClips(events: ReviewedEvent[]): Clip[] {
  return events.filter((event) => event.status !== "deleted").slice(0, 3).map((event) => ({ seconds: event.t, t: clipLabel(event.t) }));
}

function numeric(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function shown(value: number | null, suffix = "") {
  return value === null ? "—" : `${Math.round(value * 10) / 10}${suffix}`;
}

export function InsightsScreen({ matchId, match, findings, events, stats, team }: { matchId: string; match: LibraryMatch; findings: Finding[]; summary: string[]; events: ReviewedEvent[]; stats: StatsFile | undefined; team: TeamKey | null; iconColour: string; onReview: (input: { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null }) => void }) {
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const duration = Math.max(match.durationS, 1);
  const ownTeam = team ?? "A";
  const otherTeam = ownTeam === "A" ? "B" : "A";
  const row = teamRow(stats, ownTeam) as Record<string, unknown> | null;
  const otherRow = teamRow(stats, otherTeam) as Record<string, unknown> | null;
  const possession = numeric(row, "possession_pct");
  const otherPossession = numeric(otherRow, "possession_pct");
  const completion = numeric(row, "pass_completion_pct");
  const passes = numeric(row, "passes");
  const blockLength = numeric(row, "block_length_median_m");
  const passesPerSpell = numeric(row, "passes_per_sequence");
  const otherPassesPerSpell = numeric(otherRow, "passes_per_sequence");
  const pressPct = numeric(row, "pressed_within_2s_pct");
  const lossEvents = events.filter((event) => event.status !== "deleted" && event.team === ownTeam && event.type === "turnover_lost");
  const shotCount = events.filter((event) => event.status !== "deleted" && event.team === ownTeam && event.type === "shot").length;
  const pressFinding = findings.find((finding) => finding.id === "slow_press");
  const pressTarget = pressFinding?.target ?? 60;
  const pressureValues = lossEvents.map((event) => event.payload?.["time_to_press"]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const pressedCount = pressureValues.filter((value) => value < 2).length;
  const opponentPress = numeric(otherRow, "pressed_within_2s_pct");
  const moments = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);
  const phases = useMemo<Phase[]>(() => {
    const names = ["Opening", "Build", "Middle", "Shift", "Finish"];
    return names.map((name, index) => {
      const start = duration / names.length * index;
      const end = duration / names.length * (index + 1);
      const phaseEvents = events.filter((event) => event.status !== "deleted" && event.t >= start && event.t < end);
      const a = phaseEvents.filter((event) => event.team === "A").length;
      const b = phaseEvents.filter((event) => event.team === "B").length;
      return { start, end, name, team: a === b ? "even" : a > b ? "A" : "B" };
    });
  }, [duration, events]);
  const phaseMarkers = useMemo(() => moments.filter((event) => event.type === "goal" || event.type.includes("turnover")).map((event) => ({ t: event.t, type: event.type === "goal" ? "goal" as const : "turnover" as const, team: event.team === "B" ? "B" as const : "A" as const })), [moments]);
  const whenSegments = phases.map((phase) => ({ start: phase.start, end: phase.end, team: phase.team }));
  const clips = [
    eventClips(moments.filter((event) => event.type.includes("pass") || event.type === "sequence_end")),
    eventClips(moments.filter((event) => event.team === otherTeam)),
    eventClips(moments.filter((event) => event.team === ownTeam && event.type === "turnover_won")),
    eventClips(lossEvents),
  ];
  const playerTalks = useMemo(() => {
    const unique = new Map<string, { shirtNumber: number; team: "A" | "B"; descriptor: string }>();
    for (const event of moments) {
      const raw = event.payload?.["shirt"] ?? event.payload?.["shirt_number"] ?? event.payload?.["player_shirt"];
      const shirtNumber = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(shirtNumber) || !event.team) continue;
      const key = `${event.team}-${shirtNumber}`;
      if (!unique.has(key)) unique.set(key, { shirtNumber, team: event.team, descriptor: event.type === "turnover_lost" ? "nearest loss" : "review moment" });
      if (unique.size === 3) break;
    }
    return [...unique.values()];
  }, [moments]);
  const session = () => navigate({ to: "/match/$matchId/session", params: { matchId }, search: { finding: "transition-defence" } });
  const seek = (seconds: number) => navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t: Math.round(seconds * 10) / 10 } });
  const jump = (index: number) => { setActivePhase(index); seek(phases[index]?.start ?? 0); };
  const toggle = (id: string) => setExpandedId((current) => current === id ? null : id);

  const cards = [
    <MomentSection key="possession" id="moment-possession" name="In possession" state="keep" timeSample={`${Math.round((possession ?? 0) / 100 * match.durationS / 60)} min`} value={shown(completion, "%")} valueColour="good" sample={`${shown(passes)} passes\n${shown(completion, "%")} completed`} claim="Our passing with the ball was reliable." sub={`${shown(completion, "%")} of our passes found a team-mate across ${shown(possession, "%")} possession.`} comparisons={{ target: "80%", vsOpp: otherPossession === null || completion === null ? "—" : shown(completion - otherPossession), vsL5: "—", vsOppTone: "good", vsL5Tone: "warn", trend: [completion ?? 0, completion ?? 0] }} visual={<MiniPitch arrows={[{ from: [20,55], to: [40,45], team: "A" }, { from: [40,45], to: [60,35], team: "A" }, { from: [60,35], to: [80,30], team: "A" }, { from: [25,58], to: [55,56], team: "A" }]} attackLabel={`${match.teamA} attacks →`} ariaLabel={`${match.teamA} pass routes`} />} clips={clips[0] ?? []} onClip={seek} expanded={expandedId === "moment-possession"} onToggle={() => toggle("moment-possession")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="out" id="moment-out" name="Out of possession" state="watch" timeSample={`${Math.round((100 - (possession ?? 0)) / 100 * match.durationS / 60)} min`} value={shown(blockLength, "m")} sample={"block length · median\ntracked shape"} claim="Our defensive spacing set the size of the block." sub={`The tracked team was typically ${shown(blockLength, "m")} from back to front.`} comparisons={{ target: "38m", vsOpp: "—", vsL5: "—", vsOppTone: "warn", vsL5Tone: "warn", trend: [blockLength ?? 0, blockLength ?? 0] }} visual={<HeatMap heat={[{ x: 18, y: 22, r: 17, team: "B", intensity: .8 }, { x: 31, y: 51, r: 14, team: "B", intensity: .7 }, { x: 21, y: 76, r: 12, team: "B", intensity: .62 }]} ariaLabel="Opponent possession heat map" />} clips={clips[1] ?? []} onClip={seek} expanded={expandedId === "moment-out"} onToggle={() => toggle("moment-out")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="attack" id="moment-attack" name="Transition to attack" state="watch" timeSample={`${moments.filter((event) => event.team === ownTeam && event.type === "turnover_won").length} recoveries`} value={shown(passesPerSpell)} valueColour="warn" sample={"passes per spell\nafter winning the ball"} claim="Our next action after regaining the ball needed more purpose." sub={`Our spells averaged ${shown(passesPerSpell)} passes; the opponent averaged ${shown(otherPassesPerSpell)}.`} comparisons={{ target: "—", vsOpp: passesPerSpell === null || otherPassesPerSpell === null ? "—" : shown(passesPerSpell - otherPassesPerSpell), vsL5: "—", vsOppTone: "warn", vsL5Tone: "warn", trend: [passesPerSpell ?? 0, passesPerSpell ?? 0] }} visual={<MiniPitch arrows={[{ from: [15,40], to: [40,35], team: "A" }, { from: [40,35], to: [70,28], team: "A", dashed: true }, { from: [25,55], to: [45,50], team: "A" }, { from: [45,50], to: [75,45], team: "A", dashed: true }]} attackLabel="Break forward →" ariaLabel="Transition passing routes" />} clips={clips[2] ?? []} onClip={seek} expanded={expandedId === "moment-attack"} onToggle={() => toggle("moment-attack")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="defence" id="moment-defence" name="Transition to defence" state="fix" timeSample={`${lossEvents.length} losses`} value={shown(pressPct, "%")} valueColour="bad" sample={`${pressedCount} of ${lossEvents.length} losses got\npressure within 2 s`} claim="Our press after losing the ball was the first thing to fix." sub={`${shown(pressPct, "%")} of losses received pressure inside two seconds.`} comparisons={{ target: shown(pressTarget, "%"), vsOpp: pressPct === null || opponentPress === null ? "—" : shown(pressPct - opponentPress), vsL5: "—", vsOppTone: "bad", vsL5Tone: "warn", trend: [pressPct ?? 0, pressPct ?? 0] }} visual={<CounterPressStrip losses={lossEvents.map((event) => ({ timeToPress: typeof event.payload?.["time_to_press"] === "number" ? event.payload["time_to_press"] : null }))} />} whereVisual={<MiniPitch dots={lossEvents.flatMap((event) => { const x = event.payload?.["x"] ?? event.payload?.["ball_x"]; const y = event.payload?.["y"] ?? event.payload?.["ball_y"]; return typeof x === "number" && typeof y === "number" ? [{ x, y, team: "B" as const, bold: true }] : []; })} ariaLabel="Locations of possession losses" />} consequence={<><strong className="text-cream">{lossEvents.length}</strong> losses required an immediate defensive reaction. <strong className="text-cream">{shotCount}</strong> shots are recorded for our team.</>} cause="The spacing to the ball may have delayed the first pressure. Review the clips before treating this as fact." clips={clips[3] ?? []} allClipCount={lossEvents.length} onTrain={session} onClip={seek} expanded={expandedId === "moment-defence"} onToggle={() => toggle("moment-defence")} priority whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
  ];

  return <div className="insights-four-phases -mx-4 -mt-4 pb-4 md:-mx-0 md:mt-0 md:pb-0">
    <div className="grid items-start md:grid-cols-2 md:gap-8 md:px-0 md:py-1">
      <div className="md:sticky md:top-32">
        <section className="px-5 pb-1 pt-5 md:px-0 md:pb-2 md:pt-0" aria-labelledby="insights-verdict"><h1 id="insights-verdict" className="display-i max-w-[580px] text-[30px] leading-[1.1] text-cream md:text-[36px]">{possession !== null && possession >= 50 ? "We held more of the ball." : "They held more of the ball."}<br />The reactions decided the moments.</h1><p className="mt-2 text-[12.5px] leading-normal text-text-dim md:text-[13.5px]">{shown(possession, "%")} possession, {shotCount} shots. The phase evidence sets Tuesday&apos;s priority.</p></section>
        <section className="px-5 pt-3.5 md:px-0 md:pt-5" aria-label="Match phase navigation"><div className="mb-1.5 flex justify-between text-[9.5px] font-bold uppercase text-text-faint"><span>Match phases</span><span>Tap to jump</span></div><PhaseSpine phases={phases} activeIndex={activePhase} onPhaseTap={jump} /></section>
        <Button type="button" variant="ghost" onClick={() => { setExpandedId("moment-defence"); document.getElementById("moment-defence")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mx-4 mt-4 flex h-auto min-h-11 w-[calc(100%-32px)] justify-start gap-2.5 rounded-[12px] border border-reaction-bad/40 bg-priority px-4 py-3 text-left hover:bg-priority md:mx-0 md:mt-6 md:w-full"><span className="text-[10px] font-extrabold uppercase text-reaction-bad">Fix first</span><span className="flex-1 text-[13px] font-bold text-cream">Transition to defence</span><ArrowRight size={16} className="text-reaction-bad" /></Button>
        <div className="mx-4 mt-5 hidden rounded-[14px] border border-wire bg-surface p-5 md:block"><h2 className="display text-[11px] text-text-faint">Players to talk to</h2><div className="mt-3 flex flex-wrap gap-1.5">{playerTalks.length ? playerTalks.map((player) => <PlayerChip key={`${player.team}-${player.shirtNumber}`} {...player} />) : <span className="text-[11.5px] italic text-text-faint">Shirt numbers are not supplied for these moments.</span>}</div></div>
        <div className="mx-4 mt-6 hidden md:block"><TwoTeamBar label="Possession" valueA={possession ?? 0} valueB={otherPossession ?? 0} unit="%" /><Button onClick={session} className="mt-6 w-full">Build Tuesday&apos;s session →</Button><p className="mt-3 text-[11.5px] italic leading-normal text-text-faint">· Not enough data yet: set pieces ({moments.filter((event) => event.type === "set_piece").length} detected).</p></div>
      </div>
      <div className="mt-5 grid gap-3.5 px-4 md:mt-0 md:grid-cols-2 md:gap-4 md:px-0">{cards}</div>
    </div>
    <section className="mt-5 md:hidden"><div className="flex items-center gap-2.5 px-5 pb-2"><h2 className="display whitespace-nowrap text-[14px] text-text-dim">Players to talk to</h2><span className="h-px flex-1 bg-wire" /></div><div className="flex flex-wrap gap-1.5 px-4 pb-4">{playerTalks.length ? playerTalks.map((player) => <PlayerChip key={`${player.team}-${player.shirtNumber}`} {...player} />) : <span className="text-[11.5px] italic text-text-faint">Shirt numbers are not supplied for these moments.</span>}</div><div className="px-4"><TwoTeamBar label="Possession" valueA={possession ?? 0} valueB={otherPossession ?? 0} unit="%" /><Button onClick={session} className="mt-5 w-full">Build Tuesday&apos;s session →</Button></div><p className="px-5 pb-4 pt-2 text-[11.5px] italic leading-normal text-text-faint">· Not enough data yet: set pieces ({moments.filter((event) => event.type === "set_piece").length} detected).</p></section>
    <span className="sr-only">{match.teamA} versus {match.teamB}. {findings.length} detected coaching findings.</span>
  </div>;
}
