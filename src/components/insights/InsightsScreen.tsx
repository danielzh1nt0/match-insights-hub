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
import type { LibraryMatch } from "@/lib/sample-data";

const phases: Phase[] = [
  { start: 0, end: 1200, name: "Even", team: "even" },
  { start: 1320, end: 1860, name: "Their best", team: "B" },
  { start: 2100, end: 2700, name: "Steady", team: "even" },
  { start: 3480, end: 3540, name: "Goal", team: "B" },
  { start: 4200, end: 5400, name: "Push", team: "A" },
];

const fallbackClips = [[300, 720, 1080], [480, 2040, 4020], [1380, 2460, 4680], [1320, 2640, 4260]];
function clipLabel(seconds: number) { return `${Math.round(seconds / 60)}′`; }
function eventClips(events: ReviewedEvent[], fallback: number[]): Clip[] {
  const usable = events.filter((event) => event.status !== "deleted").slice(0, 3).map((event) => ({ seconds: event.t, t: clipLabel(event.t) }));
  return usable.length === 3 ? usable : fallback.map((seconds) => ({ seconds, t: clipLabel(seconds) }));
}

export function InsightsScreen({ matchId, match, findings, events }: { matchId: string; match: LibraryMatch; findings: Finding[]; summary: string[]; events: ReviewedEvent[]; iconColour: string; onReview: (input: { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null }) => void }) {
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const duration = Math.max(match.durationS, 5400);
  const moments = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);
  const phaseMarkers = useMemo(() => moments.filter((event) => event.type === "goal" || event.type.includes("turnover")).map((event) => ({ t: event.t, type: event.type === "goal" ? "goal" as const : "turnover" as const, team: event.team === "B" ? "B" as const : "A" as const })), [moments]);
  const whenSegments = phases.map((phase) => ({ start: phase.start, end: phase.end, team: phase.team }));
  const clips = fallbackClips.map((fallback) => eventClips(moments, fallback));
  const session = () => navigate({ to: "/match/$matchId/session", params: { matchId }, search: { finding: "transition-defence" } });
  const seek = (seconds: number) => navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t: Math.round(seconds * 10) / 10 } });
  const jump = (index: number) => { setActivePhase(index); seek(phases[index]?.start ?? 0); };
  const toggle = (id: string) => setExpandedId((current) => current === id ? null : id);

  const cards = [
    <MomentSection key="possession" id="moment-possession" name="In possession" state="keep" timeSample="22 min" value="88%" valueColour="good" sample={"44 of 50 passes\ncompleted"} claim="Our passing out of the back was clean." sub="Our passing out of the back was clean all match. Three clean spells of 5+ passes came in the first 20 minutes." comparisons={{ target: "80%", vsOpp: "+14", vsL5: "+6", vsOppTone: "good", vsL5Tone: "good", trend: [79, 81, 82, 84, 88] }} visual={<MiniPitch arrows={[{ from: [20,55], to: [40,45], team: "A" }, { from: [40,45], to: [60,35], team: "A" }, { from: [60,35], to: [80,30], team: "A" }, { from: [25,58], to: [55,56], team: "A" }]} attackLabel="SFK attacks →" ariaLabel="SFK pass network" />} clips={clips[0] ?? []} onClip={seek} expanded={expandedId === "moment-possession"} onToggle={() => toggle("moment-possession")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="out" id="moment-out" name="Out of possession" state="watch" timeSample="26 min" value="26m" sample={"block length · median\ncompact shape"} claim="Our defensive block stayed compact." sub="Our defensive block stayed compact. They could not play through the middle, so everything went wide." comparisons={{ target: "32m", vsOpp: "-6", vsL5: "0", vsOppTone: "good", vsL5Tone: "warn", trend: [28, 25, 27, 26, 26] }} visual={<HeatMap heat={[{ x: 18, y: 22, r: 17, team: "B", intensity: .8 }, { x: 31, y: 51, r: 14, team: "B", intensity: .7 }, { x: 21, y: 76, r: 12, team: "B", intensity: .62 }]} ariaLabel="Opponent possession heat map" />} clips={clips[1] ?? []} onClip={seek} expanded={expandedId === "moment-out"} onToggle={() => toggle("moment-out")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="attack" id="moment-attack" name="Transition to attack" state="watch" timeSample="9 spells" value="5.2s" valueColour="warn" sample={"median time to first\nforward pass after recovery"} claim="Our first forward pass came too late." sub="When we won it, we took a beat too long to go forward. By then, they had reset their shape." comparisons={{ target: "3s", vsOpp: "+2.1", vsL5: "+0.8", vsOppTone: "bad", vsL5Tone: "warn", trend: [4.1, 4.8, 4.4, 5, 5.2] }} visual={<MiniPitch arrows={[{ from: [15,40], to: [40,35], team: "A" }, { from: [40,35], to: [70,28], team: "A", dashed: true }, { from: [25,55], to: [45,50], team: "A" }, { from: [45,50], to: [75,45], team: "A", dashed: true }]} attackLabel="Break forward →" ariaLabel="Transition passing routes" />} clips={clips[2] ?? []} onClip={seek} expanded={expandedId === "moment-attack"} onToggle={() => toggle("moment-attack")} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
    <MomentSection key="defence" id="moment-defence" name="Transition to defence" state="fix" timeSample="11 losses" value="0%" valueColour="bad" sample={"0 of 11 losses got\npressure within 2 s"} claim="Our press arrived late after we lost it." sub="When we lost it, the nearest player waited instead of stepping in. Every loss gave them a free second." comparisons={{ target: "60%", vsOpp: "-50", vsL5: "-42", vsOppTone: "bad", vsL5Tone: "bad", trend: [52, 48, 44, 35, 0] }} visual={<CounterPressStrip losses={[{ timeToPress: 4.6 }, { timeToPress: 5 }, { timeToPress: 5.4 }, { timeToPress: 5.8 }, { timeToPress: 6.1 }, { timeToPress: 6.5 }, { timeToPress: 7 }, { timeToPress: 7.4 }, { timeToPress: null }, { timeToPress: null }, { timeToPress: null }]} />} whereVisual={<MiniPitch dots={[{ x: 30, y: 40, team: "B", bold: true }, { x: 45, y: 50, team: "B", bold: true }, { x: 60, y: 55, team: "B", bold: true }, { x: 55, y: 35, team: "B", bold: true }, { x: 40, y: 65, team: "B", bold: true }]} ariaLabel="Locations of possession losses" />} consequence={<><strong className="text-cream">4 of 11</strong> became their final-third entries. <strong className="text-cream">1</strong> became a shot.</>} cause="The #6 was 12 metres away from the ball on the first three losses. When he stepped in, we won it back." clips={clips[3] ?? []} allClipCount={11} onTrain={session} onClip={seek} expanded={expandedId === "moment-defence"} onToggle={() => toggle("moment-defence")} priority whenSegments={whenSegments} whenMarkers={phaseMarkers.length ? phaseMarkers : [1320, 1800, 2640, 3480, 4260].map((t) => ({ t, type: "turnover" as const, team: "B" as const }))} durationSeconds={duration} />,
  ];

  return <div className="insights-four-phases -mx-4 -mt-4 pb-4 md:-mx-0 md:mt-0 md:pb-0">
    <div className="grid items-start md:grid-cols-2 md:gap-8 md:px-0 md:py-1">
      <div className="md:sticky md:top-32">
        <section className="px-5 pb-1 pt-5 md:px-0 md:pb-2 md:pt-0" aria-labelledby="insights-verdict"><h1 id="insights-verdict" className="display-i max-w-[580px] text-[30px] leading-[1.1] text-cream md:text-[36px]">We kept the ball.<br />They won the moments.</h1><p className="mt-2 text-[12.5px] leading-normal text-text-dim md:text-[13.5px]">61% possession, 1 shot. One clean look decided it.</p></section>
        <section className="px-5 pt-3.5 md:px-0 md:pt-5" aria-label="Match phase navigation"><div className="mb-1.5 flex justify-between text-[9.5px] font-bold uppercase text-text-faint"><span>Match phases</span><span>Tap to jump</span></div><PhaseSpine phases={phases} activeIndex={activePhase} onPhaseTap={jump} /></section>
        <Button type="button" variant="ghost" onClick={() => { setExpandedId("moment-defence"); document.getElementById("moment-defence")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mx-4 mt-4 flex h-auto min-h-11 w-[calc(100%-32px)] justify-start gap-2.5 rounded-[12px] border border-reaction-bad/40 bg-priority px-4 py-3 text-left hover:bg-priority md:mx-0 md:mt-6 md:w-full"><span className="text-[10px] font-extrabold uppercase text-reaction-bad">Fix first</span><span className="flex-1 text-[13px] font-bold text-cream">Transition to defence</span><ArrowRight size={16} className="text-reaction-bad" /></Button>
        <div className="mx-4 mt-5 hidden rounded-[14px] border border-wire bg-surface p-5 md:block"><h2 className="display text-[11px] text-text-faint">Players to talk to</h2><div className="mt-3 flex flex-wrap gap-1.5"><PlayerChip shirtNumber={6} team="A" descriptor="first to the loss" /><PlayerChip shirtNumber={10} team="A" descriptor="12 m away, 3 times" /><PlayerChip shirtNumber={7} team="B" descriptor="their best outlet" /></div></div>
        <div className="mx-4 mt-6 hidden md:block"><TwoTeamBar label="Possession" valueA={61} valueB={39} unit="%" /><Button onClick={session} className="mt-6 w-full">Build Tuesday&apos;s session →</Button><p className="mt-3 text-[11.5px] italic leading-normal text-text-faint">· Not enough data yet: set pieces (1 free kick in final third).</p></div>
      </div>
      <div className="mt-5 grid gap-3.5 px-4 md:mt-0 md:grid-cols-2 md:gap-4 md:px-0">{cards}</div>
    </div>
    <section className="mt-5 md:hidden"><div className="flex items-center gap-2.5 px-5 pb-2"><h2 className="display whitespace-nowrap text-[14px] text-text-dim">Players to talk to</h2><span className="h-px flex-1 bg-wire" /></div><div className="flex flex-wrap gap-1.5 px-4 pb-4"><PlayerChip shirtNumber={6} team="A" descriptor="first to the loss" /><PlayerChip shirtNumber={10} team="A" descriptor="12 m away, 3 times" /><PlayerChip shirtNumber={7} team="B" descriptor="their best outlet" /></div><div className="px-4"><TwoTeamBar label="Possession" valueA={61} valueB={39} unit="%" /><Button onClick={session} className="mt-5 w-full">Build Tuesday&apos;s session →</Button></div><p className="px-5 pb-4 pt-2 text-[11.5px] italic leading-normal text-text-faint">· Not enough data yet: set pieces (1 free kick in final third).</p></section>
    <span className="sr-only">{match.teamA} versus {match.teamB}. {findings.length} detected coaching findings.</span>
  </div>;
}
