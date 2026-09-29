import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactElement } from "react";
import { ArrowRight } from "lucide-react";
import { Button, StatTiles } from "@/components/ip/primitives";
import { MomentSection, type Clip } from "@/components/insights/MomentSection";
import { CounterPressStrip } from "@/components/visuals/CounterPressStrip";
import { BlockArt, PressureArt } from "@/components/visuals/PitchArt";
import { PhaseSpine, type Phase } from "@/components/visuals/PhaseSpine";
import { PlayerChip } from "@/components/visuals/PlayerChip";
import { TwoTeamBar } from "@/components/visuals/TwoTeamBar";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { Finding } from "@/lib/match-data";
import { buildInsightsModel, guardState, verdict, type PhaseKey } from "@/lib/insights-model";
import { teamRow, type StatsFile, type TeamKey, type Thresholds } from "@/lib/match-analysis";
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

/** Signed difference against the opponent, where a bigger number is better for us. */
function vsOpp(ours: number | null, theirs: number | null, higherIsBetter = true) {
  if (ours === null || theirs === null) return { text: "—", tone: "warn" as const };
  const delta = Math.round((ours - theirs) * 10) / 10;
  const good = higherIsBetter ? delta >= 0 : delta <= 0;
  return { text: `${delta > 0 ? "+" : ""}${delta}`, tone: good ? ("good" as const) : ("bad" as const) };
}

export function InsightsScreen({ matchId, match, findings, events, stats, team, thresholds }: { matchId: string; match: LibraryMatch; findings: Finding[]; summary: string[]; events: ReviewedEvent[]; stats: StatsFile | undefined; team: TeamKey | null; thresholds: Thresholds; iconColour: string; onReview: (input: { eventId: string; verdict: "confirmed" | "deleted" | "retimed"; tCorrected?: number | null; teamCorrected?: string | null }) => void }) {
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
  const otherCompletion = numeric(otherRow, "pass_completion_pct");
  const passes = numeric(row, "passes");
  const blockLength = numeric(row, "block_length_median_m");
  const passesPerSpell = numeric(row, "passes_per_sequence");
  const otherPassesPerSpell = numeric(otherRow, "passes_per_sequence");
  const pressPct = numeric(row, "pressed_within_2s_pct");
  const opponentPress = numeric(otherRow, "pressed_within_2s_pct");
  const lossEvents = events.filter((event) => event.status !== "deleted" && event.team === ownTeam && event.type === "turnover_lost");
  const shotCount = events.filter((event) => event.status !== "deleted" && event.team === ownTeam && event.type === "shot").length;
  const pressureValues = lossEvents.map((event) => event.payload?.["time_to_press"]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const pressedCount = pressureValues.filter((value) => value < 2).length;
  const moments = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);

  /** The findings decide what leads, which phase is the priority, and what Tuesday trains. */
  const model = useMemo(() => buildInsightsModel(findings), [findings]);
  const { headline, sub } = verdict(model);

  const SPINE_SLICES = 5;
  const phases = useMemo<Phase[]>(() => Array.from({ length: SPINE_SLICES }, (_, index) => {
    const start = duration / SPINE_SLICES * index;
    const end = duration / SPINE_SLICES * (index + 1);
    const phaseEvents = events.filter((event) => event.status !== "deleted" && event.t >= start && event.t < end);
    const a = phaseEvents.filter((event) => event.team === "A").length;
    const b = phaseEvents.filter((event) => event.team === "B").length;
    return { start, end, team: a === b ? "even" : a > b ? "A" : "B" };
  }), [duration, events]);
  const phaseMarkers = useMemo(() => moments.filter((event) => event.type === "goal" || event.type.includes("turnover")).map((event) => ({ t: event.t, type: event.type === "goal" ? "goal" as const : "turnover" as const, team: event.team === "B" ? "B" as const : "A" as const })), [moments]);
  const whenSegments = phases.map((phase) => ({ start: phase.start, end: phase.end, team: phase.team }));

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

  const trainTop = () => navigate({ to: "/match/$matchId/session", params: { matchId }, search: model.top ? { finding: model.top.id } : {} });
  const seek = (seconds: number) => navigate({ to: "/match/$matchId/match", params: { matchId }, search: { t: Math.round(seconds * 10) / 10 } });
  const jump = (index: number) => { setActivePhase(index); seek(phases[index]?.start ?? 0); };
  const toggle = (id: string) => setExpandedId((current) => current === id ? null : id);
  const openPhase = (key: PhaseKey) => {
    setExpandedId(`moment-${key}`);
    document.getElementById(`moment-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const completionVs = vsOpp(completion, otherCompletion);
  const spellVs = vsOpp(passesPerSpell, otherPassesPerSpell);
  const pressVs = vsOpp(pressPct, opponentPress);

  /**
   * The headline number answers the same question as the state badge — is this
   * one okay? — so they must agree. The vs-opponent delta answers a different
   * question and keeps its own tone.
   */
  const valueTone = (state: "keep" | "watch" | "fix"): "good" | "warn" | "bad" =>
    state === "fix" ? "bad" : state === "watch" ? "warn" : "good";

  const clips = [
    eventClips(moments.filter((event) => event.type.includes("pass") || event.type === "sequence_end")),
    eventClips(moments.filter((event) => event.team === otherTeam)),
    eventClips(moments.filter((event) => event.team === ownTeam && event.type === "turnover_won")),
    eventClips(lossEvents),
  ];

  /** One card per phase. Content is fixed to the phase; the state comes from the findings. */
  const CARD: Record<PhaseKey, (state: "keep" | "watch" | "fix", finding: Finding | undefined) => ReactElement> = {
    possession: (state, finding) => <MomentSection key="possession" id="moment-possession" name="In possession" state={state} timeSample={`${Math.round((possession ?? 0) / 100 * match.durationS / 60)} min`} value={shown(completion, "%")} valueColour={valueTone(state)} sample={`${shown(passes)} passes\n${shown(completion, "%")} completed`} claim={finding?.headline ?? "Our passing with the ball was reliable."} sub={finding?.interpretation ?? `${shown(completion, "%")} of our passes found a team-mate across ${shown(possession, "%")} possession.`} comparisons={{ target: finding ? `${finding.target}${finding.unit}` : "—", vsOpp: completionVs.text, vsOppTone: completionVs.tone }} visual={<TwoTeamBar label="Pass completion" valueA={completion ?? 0} valueB={otherCompletion ?? 0} unit="%" />} clips={clips[0] ?? []} onClip={seek} expanded={expandedId === "moment-possession"} onToggle={() => toggle("moment-possession")} priority={state === "fix"} {...(state === "fix" ? { onTrain: trainTop, trainLabel: finding?.headline.replace(/\.$/, "").toLowerCase() } : {})} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,

    out: (state, finding) => <MomentSection key="out" id="moment-out" name="Out of possession" state={state} timeSample={`${Math.round((100 - (possession ?? 0)) / 100 * match.durationS / 60)} min`} value={shown(blockLength, "m")} valueColour={valueTone(state)} sample={"block length · median\ntracked shape"} claim={finding?.headline ?? "Our defensive spacing set the size of the block."} sub={finding?.interpretation ?? `The tracked team was typically ${shown(blockLength, "m")} from back to front.`} comparisons={{ target: `${thresholds.blockCeilingM}m`, vsOpp: "—", vsOppTone: "warn" }} visual={<BlockArt metres={blockLength} ceiling={thresholds.blockCeilingM} caption="Block, back to front" />} clips={clips[1] ?? []} onClip={seek} expanded={expandedId === "moment-out"} onToggle={() => toggle("moment-out")} priority={state === "fix"} {...(state === "fix" ? { onTrain: trainTop, trainLabel: finding?.headline.replace(/\.$/, "").toLowerCase() } : {})} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,

    attack: (state, finding) => <MomentSection key="attack" id="moment-attack" name="Transition to attack" state={state} timeSample={`${moments.filter((event) => event.team === ownTeam && event.type === "turnover_won").length} recoveries`} value={shown(passesPerSpell)} valueColour={valueTone(state)} sample={"passes per spell\nafter winning the ball"} claim={finding?.headline ?? "What we did after regaining the ball."} sub={finding?.interpretation ?? `Our spells averaged ${shown(passesPerSpell)} passes; the opponent averaged ${shown(otherPassesPerSpell)}.`} comparisons={{ target: finding ? `${finding.target}${finding.unit}` : "—", vsOpp: spellVs.text, vsOppTone: spellVs.tone }} visual={<TwoTeamBar label="Passes per spell" valueA={passesPerSpell ?? 0} valueB={otherPassesPerSpell ?? 0} />} clips={clips[2] ?? []} onClip={seek} expanded={expandedId === "moment-attack"} onToggle={() => toggle("moment-attack")} priority={state === "fix"} {...(state === "fix" ? { onTrain: trainTop, trainLabel: finding?.headline.replace(/\.$/, "").toLowerCase() } : {})} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,

    defence: (state, finding) => <MomentSection key="defence" id="moment-defence" name="Transition to defence" state={state} timeSample={`${lossEvents.length} losses`} value={shown(pressPct, "%")} valueColour={valueTone(state)} sample={`${pressedCount} of ${lossEvents.length} losses got\npressure within 2 s`} claim={finding?.headline ?? "Our reaction after losing the ball."} sub={finding?.interpretation ?? `${shown(pressPct, "%")} of losses received pressure inside two seconds.`} comparisons={{ target: `${thresholds.pressWithin2s}%`, vsOpp: pressVs.text, vsOppTone: pressVs.tone }} visual={<CounterPressStrip losses={lossEvents.map((event) => ({ timeToPress: typeof event.payload?.["time_to_press"] === "number" ? event.payload["time_to_press"] : null }))} />} whereVisual={<PressureArt losses={lossEvents.flatMap((event) => { const x = event.payload?.["x"] ?? event.payload?.["ball_x"]; const y = event.payload?.["y"] ?? event.payload?.["ball_y"]; if (typeof x !== "number" || typeof y !== "number") return []; const press = event.payload?.["time_to_press"]; return [{ x, y, timeToPress: typeof press === "number" ? press : null }]; })} caption="Where we lost it" />} consequence={<><strong className="text-cream">{lossEvents.length}</strong> losses required an immediate defensive reaction. <strong className="text-cream">{shotCount}</strong> shots are recorded for our team.</>} cause="The spacing to the ball may have delayed the first pressure. Review the clips before treating this as fact." clips={clips[3] ?? []} allClipCount={lossEvents.length} onClip={seek} expanded={expandedId === "moment-defence"} onToggle={() => toggle("moment-defence")} priority={state === "fix"} {...(state === "fix" ? { onTrain: trainTop, trainLabel: finding?.headline.replace(/\.$/, "").toLowerCase() } : {})} whenSegments={whenSegments} whenMarkers={phaseMarkers} durationSeconds={duration} />,
  };

  const setPieceCount = moments.filter((event) => event.type === "set_piece").length;

  return <div className="insights-four-phases -mx-4 -mt-4 pb-4 md:-mx-0 md:mt-0 md:pb-0">
    <div className="grid items-start md:grid-cols-2 md:gap-8 md:px-0 md:py-1">
      <div className="md:sticky md:top-32">

        {/* 1. The one thing. Whatever the findings say is worst, in the coach's words. */}
        <section className="px-5 pb-1 pt-5 md:px-0 md:pb-2 md:pt-0" aria-labelledby="insights-verdict">
          <span className="display text-[10px] uppercase tracking-[.08em] text-text-faint">
            {model.top ? "Fix this first" : "This match"}
          </span>
          <h1 id="insights-verdict" className="display-i mt-1.5 max-w-[580px] text-[30px] leading-[1.1] text-cream md:text-[36px]">{headline}</h1>
          {sub && <p className="mt-2 max-w-[560px] text-[12.5px] leading-normal text-text-dim md:text-[13.5px]">{sub}</p>}
        </section>

        {/* 2. The numbers behind it. */}
        <section className="mt-3.5 px-4 md:mt-5 md:px-0" aria-label="Match numbers">
          <StatTiles
            className="md:grid-cols-3"
            tiles={[
              { label: "Possession", value: shown(possession, "%") },
              { label: "Shots", value: `${shotCount}` },
              { label: "Balls lost", value: `${lossEvents.length}` },
            ]}
          />
        </section>

        {model.top && (
          <Button type="button" variant="ghost" onClick={() => openPhase(model.phases[0]!.key)} className="mx-4 mt-4 flex h-auto min-h-11 w-[calc(100%-32px)] justify-start gap-2.5 rounded-[12px] border border-reaction-bad/40 bg-priority px-4 py-3 text-left hover:bg-priority md:mx-0 md:mt-6 md:w-full">
            <span className="text-[10px] font-extrabold uppercase text-reaction-bad">The evidence</span>
            <span className="flex-1 text-[13px] font-bold text-cream">{model.phases[0]!.name}</span>
            <ArrowRight size={16} className="text-reaction-bad" />
          </Button>
        )}

        <section className="px-5 pt-4 md:px-0 md:pt-6" aria-label="Match timeline">
          <div className="mb-1.5 flex justify-between text-[9.5px] font-bold uppercase text-text-faint"><span>Across the match</span><span>Tap to jump</span></div>
          <PhaseSpine phases={phases} activeIndex={activePhase} onPhaseTap={jump} />
        </section>

        {/* 3. Everything secondary, below the fold on a phone. */}
        <div className="mx-4 mt-6 hidden md:block md:mx-0">
          <TwoTeamBar label="Possession" valueA={possession ?? 0} valueB={otherPossession ?? 0} unit="%" />
          <Button onClick={trainTop} className="mt-6 w-full">Build Tuesday&apos;s session →</Button>
        </div>
        <div className="mx-4 mt-5 hidden rounded-[12px] border border-wire bg-surface p-5 md:block md:mx-0">
          <h2 className="display text-[11px] text-text-faint">Players to talk to</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">{playerTalks.length ? playerTalks.map((player) => <PlayerChip key={`${player.team}-${player.shirtNumber}`} {...player} />) : <span className="text-[11.5px] italic text-text-faint">Shirt numbers are not supplied for these moments.</span>}</div>
        </div>
        {setPieceCount < 3 && <p className="mt-3 hidden px-1 text-[11.5px] italic leading-normal text-text-faint md:block">· Not enough data yet: set pieces ({setPieceCount} detected).</p>}
      </div>

      {/* The four moments, priority first. */}
      <div className="mt-5 grid gap-3.5 px-4 md:mt-0 md:grid-cols-2 md:gap-4 md:px-0">
        {model.phases.map((phase) => {
          // Only two phases have a target the coach actually set; the backstop applies there.
          const guarded =
            phase.key === "defence" ? guardState(phase.state, pressPct, thresholds.pressWithin2s, true)
            : phase.key === "out" ? guardState(phase.state, blockLength, thresholds.blockCeilingM, false)
            : phase.state;
          return CARD[phase.key](guarded, phase.findings[0]);
        })}
      </div>
    </div>

    <section className="mt-5 md:hidden">
      <div className="flex items-center gap-2.5 px-5 pb-2"><h2 className="display whitespace-nowrap text-[14px] text-text-dim">Players to talk to</h2><span className="h-px flex-1 bg-wire" /></div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-4">{playerTalks.length ? playerTalks.map((player) => <PlayerChip key={`${player.team}-${player.shirtNumber}`} {...player} />) : <span className="text-[11.5px] italic text-text-faint">Shirt numbers are not supplied for these moments.</span>}</div>
      <div className="px-4"><TwoTeamBar label="Possession" valueA={possession ?? 0} valueB={otherPossession ?? 0} unit="%" /><Button onClick={trainTop} className="mt-5 w-full">Build Tuesday&apos;s session →</Button></div>
      {setPieceCount < 3 && <p className="px-5 pb-4 pt-2 text-[11.5px] italic leading-normal text-text-faint">· Not enough data yet: set pieces ({setPieceCount} detected).</p>}
    </section>

    <span className="sr-only">{match.teamA} versus {match.teamB}. {findings.length} detected coaching findings.</span>
  </div>;
}
