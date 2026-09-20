import { Link } from "@tanstack/react-router";
import type { Period } from "./chrome";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { LineDefending, PlayerStat, StatsFile, TeamKey, Territory } from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";
import { cn } from "@/lib/utils";
import { DeepAnswer, LineBreakHero, LineTimeline } from "./line-break-cards";
import { Pitch, PortraitPitch, Visual } from "./visual";

type Props = {
  tab: string;
  players: PlayerStat[];
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  scopeBoth: boolean;
  colours: { A: string; B: string };
  matchId: string;
  period: Period;
  territory: Territory | null;
  lineDefending: LineDefending | null;
};

type Point = { x: number; y: number };
type Pass = Record<string, unknown>;
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const teamRow = (stats: StatsFile | undefined, team: TeamKey) => (stats?.teams ?? []).find((row: any) => row?.team === team) as Record<string, unknown> | undefined;
const value = (row: Record<string, unknown> | undefined, key: string) => finite(row?.[key]);
const eventPoint = (event: ReviewedEvent): Point | null => {
  const p = event.payload ?? {};
  const x = finite(p["x"] ?? p["px"] ?? p["start_x"]);
  const y = finite(p["y"] ?? p["py"] ?? p["start_y"]);
  if (x === null || y === null) return null;
  return { x: clamp(x > 105 ? x / 19.2 : x), y: clamp(y > 100 ? y / 10.8 : y) };
};
const passTeam = (pass: Pass): TeamKey | null => pass["team"] === "A" || pass["team"] === "B" ? pass["team"] : null;
const passTime = (pass: Pass) => finite(pass["t"] ?? pass["time"] ?? pass["start_t"]);
const passPlayer = (pass: Pass, side: "from" | "to") => finite(pass[side] ?? pass[`${side}_id`] ?? (side === "from" ? pass["player_id"] : pass["receiver_id"]));
const passPoint = (pass: Pass, side: "start" | "end"): Point | null => {
  const x = finite(pass[`${side}_x`] ?? pass[side === "start" ? "x" : "x2"] ?? pass[side === "start" ? "from_x" : "to_x"]);
  const y = finite(pass[`${side}_y`] ?? pass[side === "start" ? "y" : "y2"] ?? pass[side === "start" ? "from_y" : "to_y"]);
  return x === null || y === null ? null : { x: clamp(x), y: clamp(y) };
};
const passCompleted = (pass: Pass) => pass["completed"] === true || pass["success"] === true || !["bad_lost", "incomplete"].includes(String(pass["quality"] ?? pass["outcome"] ?? ""));
const periodRange = (file: MatchDataFile | undefined, period: Period) => {
  const end = Math.max(file?.frames.at(-1)?.t ?? 0, file?.events.at(-1)?.t ?? 0, 1);
  return period === "1st" ? [0, end / 2] : period === "2nd" ? [end / 2, end] : [0, end];
};
const inRange = (time: number | null, range: number[]) => time === null || (time >= (range[0] ?? 0) && time <= (range[1] ?? Infinity));
const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

function Card({ question, caption, children, honesty, footer }: { question: string; caption: string; children: React.ReactNode; honesty?: string; footer?: string }) {
  return <Visual framing="custom" question={question} caption={caption} info={{ title: question, rows: [{ label: "What it shows", value: caption, cream: true }] }} {...(honesty ? { honesty } : {})} {...(footer ? { footerNote: footer } : {})}>{children}</Visual>;
}

function EmptyTab() {
  return <div className="border border-dashed border-wire px-4 py-10 text-center text-[12.5px] text-text-faint">There is not enough reliable evidence for this view.</div>;
}

function Control({ stats, team, colours }: Props) {
  const a = value(teamRow(stats, "A"), "possession_pct");
  const b = value(teamRow(stats, "B"), "possession_pct");
  if (a === null && b === null) return null;
  const own = team === "A" ? a : b;
  return <Card question="Who controlled the ball?" caption="Share of reliable ball-control time for each team." footer="Whole selected period">
    <strong className="display-i block text-[56px] leading-none text-cream">{own === null ? "—" : `${Math.round(own)}%`}</strong>
    <div className="mt-4 flex h-3 overflow-hidden rounded-[3px] bg-surface-3" role="img" aria-label={`${a ?? 0}% Team A and ${b ?? 0}% Team B`}>
      <span style={{ width: `${a ?? 0}%`, background: colours.A }} /><span style={{ width: `${b ?? 0}%`, background: colours.B }} />
    </div>
    <div className="mt-2 flex justify-between text-[11px] font-semibold text-text-faint"><span>{Math.round(a ?? 0)}%</span><span>{Math.round(b ?? 0)}%</span></div>
  </Card>;
}

function Thirds({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const counts = [0, 0, 0];
  frames.forEach(frame => frame.players.filter(player => player.team === team && player.state !== "stale").forEach(player => { const index = Math.min(2, Math.floor(clamp(player.m[0], 0, 104.99) / 35)); counts[index] = (counts[index] ?? 0) + 1; }));
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return null;
  return <Card question="Which third did we occupy?" caption="Where our observed players spent their tracked time." honesty={`${frames.length} tracked frames`}>
    <Pitch><g>{counts.map((count, index) => <g key={index}><rect x={2 + index * 32} y="2" width="32" height="60" fill={colour} opacity={0.08 + count / Math.max(...counts) * .38} /><text x={18 + index * 32} y="35" textAnchor="middle" fill="var(--cream)" fontSize="5" fontWeight="800">{Math.round(count / total * 100)}%</text></g>)}</g></Pitch>
    <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-bold uppercase text-text-faint"><span>Own third</span><span>Middle</span><span>Final third</span></div>
  </Card>;
}

function SequenceLength({ stats, team }: Props) {
  const sequences = (stats?.sequences ?? []).filter((sequence: any) => !sequence?.team || sequence.team === team);
  const lengths = sequences.map((sequence: any) => finite(sequence?.passes ?? sequence?.pass_count ?? sequence?.length)).filter((n): n is number => n !== null);
  const rowMedian = value(teamRow(stats, team), "passes_per_sequence");
  if (!lengths.length && rowMedian === null) return null;
  const buckets = [lengths.filter(n => n <= 2).length, lengths.filter(n => n >= 3 && n <= 5).length, lengths.filter(n => n >= 6 && n <= 9).length, lengths.filter(n => n >= 10).length];
  return <Card question="How long did we keep it?" caption="Possession spells grouped by the number of passes." {...(lengths.length ? { honesty: `${lengths.length} sequences` } : {})}>
    <strong className="display-i block text-[56px] leading-none text-cream">{rowMedian === null ? "—" : Math.round(rowMedian * 10) / 10}</strong><span className="text-[11px] font-semibold text-text-faint">passes per spell</span>
    {lengths.length > 0 && <div className="mt-5 grid grid-cols-4 items-end gap-2" role="img" aria-label="Sequence length distribution">{buckets.map((count, index) => <div key={index} className="text-center"><span className="num text-[11px] text-text-dim">{count}</span><div className="mt-1 h-20 bg-surface-2 flex items-end"><span className="block w-full bg-cream/70" style={{ height: `${Math.max(3, count / Math.max(...buckets) * 100)}%` }} /></div><span className="mt-1 block text-[9px] text-text-faint">{["1–2", "3–5", "6–9", "10+"][index]}</span></div>)}</div>}
  </Card>;
}

function deriveRuns(frames: Frame[], team: TeamKey) {
  const runs: { id: number; start: Point; end: Point; speed: number; withBall: boolean }[] = [];
  const step = Math.max(1, Math.round(frames.length / 80));
  for (let i = step; i < frames.length; i += step) {
    const before = frames[i - step]; const after = frames[i]; if (!before || !after) continue;
    for (const player of after.players.filter(p => p.team === team && p.state === "observed")) {
      const previous = before.players.find(p => p.team === team && p.id === player.id && p.state === "observed");
      if (!previous) continue;
      const distance = Math.hypot(player.m[0] - previous.m[0], player.m[1] - previous.m[1]);
      const dt = Math.max(.1, after.t - before.t); const speed = distance / dt;
      if (speed < 5.5 || distance < 3) continue;
      runs.push({ id: player.id, start: { x: clamp(previous.m[0] / 105 * 100), y: clamp(previous.m[1] / 68 * 100) }, end: { x: clamp(player.m[0] / 105 * 100), y: clamp(player.m[1] / 68 * 100) }, speed, withBall: after.possession === team && after.carrier === player.id });
    }
  }
  return runs.slice(0, 40);
}

function Runs({ frames, team, colour }: { frames: Frame[]; team: TeamKey; colour: string }) {
  const runs = deriveRuns(frames, team); if (!runs.length) return null;
  return <Card question="Where did our runs go?" caption="Solid arrows had the ball. Dashed arrows were off it. Brighter means faster." honesty={`${runs.length} tracked runs`}>
    <PortraitPitch arrowLabel="attack">{runs.map((run, index) => <line key={`${run.id}-${index}`} x1={run.start.y / 100 * 64} y1={100 - run.start.x} x2={run.end.y / 100 * 64} y2={100 - run.end.x} stroke={colour} strokeWidth={run.withBall ? 1.4 : .8} strokeDasharray={run.withBall ? undefined : "2 2"} opacity={clamp(.3 + (run.speed - 5.5) / 5, .3, 1)} />)}</PortraitPitch>
  </Card>;
}

function Distance({ players, colour }: { players: PlayerStat[]; colour: string }) {
  const ranked = [...players].filter(p => p.minutes > 0 && p.distanceM > 0).sort((a,b) => b.distanceM / b.minutes - a.distanceM / a.minutes).slice(0, 10); if (!ranked.length) return null;
  const max = Math.max(...ranked.map(p => p.distanceM / p.minutes));
  return <Card question="Who covered the ground?" caption="Sorted by distance per visible minute. Bright segment marks the top-intensity share." honesty={`${ranked.length} observed players`}>
    <div className="divide-y divide-wire-2">{ranked.map(player => { const rate = player.distanceM / player.minutes; return <div key={`${player.team}-${player.id}`} className="grid grid-cols-[32px_1fr_62px] items-center gap-2 py-2"><span className="num text-center text-[14px]">{player.id}</span><div className="relative h-3 overflow-hidden rounded-[3px] bg-surface-2"><span className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${rate/max*100}%`, background: colour }} /><span className="absolute inset-y-0 left-0" style={{ width: `${rate/max*35}%`, background: colour }} /></div><span className="num text-right text-[12px]">{Math.round(rate)} <small className="text-[9px] text-text-faint">m/min</small></span></div>; })}</div>
  </Card>;
}

function PressMap({ events, team, matchId, colour }: Props & { colour: string }) {
  const press = events.filter(event => event.team === team && ["pressure", "press", "turnover_won", "high_turnover"].includes(event.type)).map(event => ({ event, point: eventPoint(event) })).filter((item): item is { event: ReviewedEvent; point: Point } => item.point !== null);
  if (!press.length) return null;
  return <Card question="Where did we press?" caption="Each dot is one pressure or regain at the ball position." honesty={`${press.filter(p => p.event.status === "confirmed").length} confirmed · ${press.length} detected`}>
    <Pitch>{press.map(({event, point}) => <Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch pressure at ${fmt(event.t)}`}><circle cx={point.x} cy={point.y/100*64} r="1.8" fill={colour} opacity=".82" /></Link>)}</Pitch>
  </Card>;
}

function CounterPress({ events, team, stats, matchId }: Props) {
  const losses = events.filter(event => event.team === team && event.type === "turnover_lost");
  const reactions = losses.map(event => ({ event, seconds: finite(event.payload?.["time_to_press"]) })).filter((item): item is {event: ReviewedEvent; seconds: number} => item.seconds !== null);
  if (!reactions.length) return null;
  const sorted = reactions.map(r=>r.seconds).sort((a,b)=>a-b); const median = sorted[Math.floor(sorted.length/2)] ?? 0; const row = teamRow(stats, team);
  return <Card question="How fast did we react?" caption="Each dot is one loss. Further right means the first pressure came later." honesty={`${losses.filter(e=>e.status==="confirmed").length} confirmed · ${losses.length} detected`}>
    <div className="relative h-[92px] border-b border-wire" role="img" aria-label="Reaction time from zero to eight seconds"><div className="absolute inset-x-0 top-10 h-px bg-wire" />{reactions.map(({event,seconds}) => <Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch ${seconds} second reaction`} className="tap absolute top-[18px] -translate-x-1/2" style={{left:`${clamp(seconds/8*100)}%`}}><span className={cn("block h-3 w-3 rounded-full border border-bg",seconds<=2?"bg-quality-good":seconds<=4?"bg-quality-risky":"bg-quality-bad")} /></Link>)}<div className="absolute bottom-1 left-0 right-0 flex justify-between text-[9px] text-text-faint"><span>0 s</span><span>2 s</span><span>4 s</span><span>6 s</span><span>8 s</span></div></div>
    <div className="grid grid-cols-3 divide-x divide-wire-2 border border-wire-2"><Metric value={`${Math.round(value(row,"pressed_within_2s_pct") ?? 0)}%`} label="within 2 s"/><Metric value={`${Math.round(value(row,"regained_within_5s_pct") ?? 0)}%`} label="back in 5 s"/><Metric value={`${Math.round(median*10)/10}s`} label="median"/></div>
  </Card>;
}

function Metric({value,label}:{value:string;label:string}) { return <div className="p-2 text-center"><strong className="display-i block text-[24px] text-cream">{value}</strong><span className="text-[9px] uppercase text-text-faint">{label}</span></div>; }

function ShapeMultiples({ territory, colour }: { territory: Territory; colour: string }) {
  const snapshots = territory.snapshots.slice(0, 6); if (!snapshots.length) return null;
  return <Card question="How did our shape change?" caption="Six observed moments show how our block expanded and contracted." honesty={`${territory.frameCount} tracked frames`}>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3" role="img" aria-label="Six team shape snapshots">{snapshots.map(snapshot => <div key={snapshot.t} className="border border-wire bg-surface-2 p-2"><svg viewBox="0 0 100 64" className="w-full"><rect x="1" y="1" width="98" height="62" fill="none" stroke="var(--wire)" />{snapshot.players.map(player=><circle key={player.id} cx={player.x} cy={player.y/100*64} r="2" fill={colour} opacity={player.predicted?.45:.9}/>)}</svg><div className="mt-1 flex justify-between text-[9px] text-text-faint"><span>{fmt(snapshot.t)}</span><span>{snapshot.lengthM} × {snapshot.widthM} m</span></div></div>)}</div>
  </Card>;
}

function ShapeOutcome({ lineDefending, colour }: { lineDefending: LineDefending; colour: string }) {
  const states = lineDefending.states; if (!states.length) return null; const worst = [...states].sort((a,b)=>b.shots-a.shots)[0]?.key;
  return <Card question="In which shape did we suffer?" caption="Defensive states compared by opponent shots and goals." honesty={`${lineDefending.timeline.length} shape samples`}>
    <div className="grid grid-cols-3 gap-2" role="img" aria-label="Defensive shape outcomes">{states.map(state=><div key={state.key} className={cn("border bg-surface-2 p-2",state.key===worst?"border-quality-bad":"border-wire")}><div className="flex justify-between"><strong className="display text-[12px] uppercase">{state.key}</strong><span className="num text-[11px] text-text-faint">{state.height}m</span></div><svg viewBox="0 0 70 46" className="my-2 w-full"><rect x="1" y="1" width="68" height="44" fill="none" stroke="var(--wire)"/><rect x={state.key==="low"?18:state.key==="mid"?14:10} y={state.key==="high"?7:12} width={state.key==="low"?34:state.key==="mid"?42:50} height={state.key==="low"?22:state.key==="mid"?28:32} fill={colour} fillOpacity=".16" stroke={colour} strokeDasharray="2 2"/></svg><div className="grid grid-cols-2 gap-1 text-center"><Metric value={`${state.shots}`} label="shots"/><Metric value={`${state.goals}`} label="goals"/></div></div>)}</div>
  </Card>;
}

function ShotMap({ stats, colours, matchId }: Props) {
  const shots = Array.isArray(stats?.metrics?.["shots"]) ? stats.metrics["shots"] as Record<string,unknown>[] : []; if (!shots.length) return null;
  return <Card question="Where did shots come from?" caption="Filled means on target. A cream ring marks a goal." honesty={`${shots.length} shots`}>
    <Pitch>{shots.map((shot,index)=>{const shotTeam:TeamKey=shot["team"]==="B"?"B":"A";const x=finite(shot["x"]??shot["px"])??(shotTeam==="A"?25:75);const y=finite(shot["y"]??shot["py"])??50;const t=finite(shot["t"])??0;const goal=shot["goal"]===true;const on=goal||shot["on_target"]===true;return <Link key={String(shot["id"]??index)} to="/match/$matchId/match" params={{matchId}} search={{t}} aria-label={`Watch ${shotTeam} shot`}><circle cx={clamp(x)} cy={clamp(y)/100*64} r={goal?2.8:2.2} fill={on?colours[shotTeam]:"var(--surface-2)"} stroke={goal?"var(--cream)":colours[shotTeam]} strokeWidth={goal?1.2:.8}/></Link>})}</Pitch>
  </Card>;
}

function ShotSummary({ stats, team }: Props) {
  const shots = (Array.isArray(stats?.metrics?.["shots"]) ? stats.metrics["shots"] : []).filter((shot:any)=>shot?.team===team); if (!shots.length) return null;
  const on = shots.filter((shot:any)=>shot?.on_target||shot?.goal).length; const goals=shots.filter((shot:any)=>shot?.goal).length; const box=shots.filter((shot:any)=>(finite(shot?.x)??50)<18||(finite(shot?.x)??50)>82).length;
  return <Card question="What did our shooting produce?" caption="The shot total, accuracy and penalty-area share without a score dial." honesty={`${shots.length} shot moments`}><div className="grid grid-cols-3 divide-x divide-wire border border-wire"><Metric value={`${shots.length}`} label="shots"/><Metric value={`${on}`} label="on target"/><Metric value={`${goals}`} label="goals"/></div><p className="mt-3 text-[12px] text-text-dim">{box} of {shots.length} attempts came from inside the penalty area.</p></Card>;
}

function EntriesConceded({ events, team, matchId }: Props) {
  const opponent=team==="A"?"B":"A"; const entries=events.filter(e=>e.team===opponent&&["final_third_entry","entry","shot","goal"].includes(e.type)).map(event=>({event,point:eventPoint(event)})).filter((x):x is {event:ReviewedEvent;point:Point}=>x.point!==null); if(!entries.length)return null;
  const lanes=[0,0,0,0,0];entries.forEach(({point})=>{const index=Math.min(4,Math.floor(point.y/20));lanes[index]=(lanes[index]??0)+1});
  return <Card question="Where did they get in?" caption="Opponent entries into our defensive third, grouped into five lanes." honesty={`${entries.length} entries and shots`}>
    <Pitch>{entries.map(({event,point})=><Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch entry at ${fmt(event.t)}`}><line x1={point.x} y1={point.y/100*64} x2={Math.max(4,point.x-10)} y2={point.y/100*64} stroke="var(--graphite)" strokeWidth="1.2"/><circle cx={Math.max(4,point.x-10)} cy={point.y/100*64} r="1.8" fill={event.type==="shot"||event.type==="goal"?"var(--quality-bad)":"var(--text-faint)"}/></Link>)}</Pitch>
    <div className="mt-3 grid h-20 grid-cols-5 items-end gap-1" role="img" aria-label="Entries by lane">{lanes.map((count,index)=><div key={index} className="text-center"><span className="num text-[10px] text-text-dim">{count}</span><span className="mt-1 block bg-cream/50" style={{height:`${Math.max(2,count/Math.max(...lanes)*48)}px`}}/><span className="mt-1 block text-[8px] uppercase text-text-faint">{["Left","Half","Centre","Half","Right"][index]}</span></div>)}</div>
  </Card>;
}

function PlayerCards({ players, stats, matchId, colours }: Props) {
  const raw = stats?.players ?? []; if (!players.length) return null;
  return <div className="grid gap-3 md:grid-cols-2">{players.map(player=>{const detail=raw.find((p:any)=>p?.team===player.team&&p?.id===player.id)??{};const completion=player.passes?Math.round(player.passesCompleted/player.passes*100):0;const risky=finite(detail?.risky_passes??detail?.passes_risky)??0;const lost=Math.max(0,player.passes-player.passesCompleted);return <Link key={`${player.team}-${player.id}`} to="/match/$matchId/player/$playerId" params={{matchId,playerId:String(player.id)}} className="block border border-wire bg-surface p-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-[8px] display-i text-[22px] text-bg" style={{background:colours[player.team]}}>{player.id}</span><div><h2 className="display text-[16px] uppercase">Player {player.id}</h2><p className="text-[11px] text-text-faint">{player.minutes} visible minutes</p></div></div><div className="mt-4 grid grid-cols-5 gap-1">{[[Math.round(player.distanceM/Math.max(player.minutes,1)),"m/min"],[player.touches,"touches"],[`${player.passesCompleted}/${player.passes}`,"passes"],[player.betterOptions,"options"],[completion,"quality"]].map(([v,l])=><div key={l} className="bg-surface-2 p-2 text-center"><strong className="num block text-[14px] text-cream">{v}</strong><span className="text-[8px] uppercase text-text-faint">{l}</span></div>)}</div><div className="mt-3 flex h-2 overflow-hidden rounded-[2px] bg-surface-3" aria-label={`${completion}% completed, ${risky} risky, ${lost} lost`}><span className="bg-quality-good" style={{width:`${completion}%`}}/><span className="bg-quality-risky" style={{width:`${Math.min(100-completion,risky)}%`}}/><span className="bg-quality-bad" style={{flex:lost}}/></div></Link>})}</div>;
}

function passSet(stats: StatsFile|undefined,team:TeamKey,range:number[]){return (stats?.passes??[]).filter((pass:any)=>passTeam(pass)===team&&inRange(passTime(pass),range)) as Pass[];}
function pairCounts(passes:Pass[]){const map=new Map<string,{from:number;to:number;total:number;complete:number;gain:number}>();passes.forEach(pass=>{const from=passPlayer(pass,"from"),to=passPlayer(pass,"to");if(from===null||to===null)return;const key=`${from}-${to}`,item=map.get(key)??{from,to,total:0,complete:0,gain:0};item.total+=1;if(passCompleted(pass))item.complete+=1;const s=passPoint(pass,"start"),e=passPoint(pass,"end");if(s&&e)item.gain+=e.x-s.x;map.set(key,item)});return [...map.values()].sort((a,b)=>b.total-a.total);}

function LaneEffectiveness({passes,colour}:{passes:Pass[];colour:string}){const pairs=pairCounts(passes).slice(0,8);if(!pairs.length)return null;return <Card question="Which lanes worked?" caption="Thicker means used more. Brighter means completed more often." honesty={`${passes.length} passes`}><PortraitPitch>{pairs.map((pair,index)=>{const angle=(index%4)*12;return <line key={`${pair.from}-${pair.to}`} x1={12+(pair.from%5)*10} y1={82-(pair.from%4)*12} x2={18+(pair.to%5)*9} y2={28+(pair.to%4)*10} stroke={colour} strokeWidth={1+pair.total/Math.max(...pairs.map(p=>p.total))*4} opacity={.2+.8*pair.complete/pair.total} />})}</PortraitPitch><div className="mt-3 divide-y divide-wire-2">{pairs.slice(0,4).map(pair=><div key={`${pair.from}-${pair.to}`} className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 text-[12px]"><span className="num">{pair.from} → {pair.to}</span><span className="text-quality-good">{pair.complete}/{pair.total}</span><span className="text-text-faint">{pair.gain>=0?"+":""}{Math.round(pair.gain)} m</span></div>)}</div></Card>}

function BetterOption({events,team,matchId,colour}:Props&{colour:string}){const moments=events.filter(e=>e.team===team&&e.type==="better_option");if(!moments.length)return null;const event=moments[0];if(!event)return null;const p=event.payload??{};const start={x:finite(p["x"]??p["start_x"])??42,y:finite(p["y"]??p["start_y"])??65};const played={x:finite(p["played_x"]??p["end_x"])??58,y:finite(p["played_y"]??p["end_y"])??65};const better={x:finite(p["better_x"]??p["target_x"])??72,y:finite(p["better_y"]??p["target_y"])??40};return <Card question="Where were we open?" caption="Solid is the pass played. Dashed cream is the better option detected." honesty={`${moments.filter(e=>e.status==="confirmed").length} confirmed · ${moments.length} detected`}><Link to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label="Watch better option"><PortraitPitch><circle cx={start.y/100*64} cy={100-start.x} r="3" fill={colour}/><line x1={start.y/100*64} y1={100-start.x} x2={played.y/100*64} y2={100-played.x} stroke={colour} strokeWidth="1.5"/><line x1={start.y/100*64} y1={100-start.x} x2={better.y/100*64} y2={100-better.x} stroke="var(--cream)" strokeDasharray="2 2" strokeWidth="1.2"/></PortraitPitch></Link></Card>}

function PassNetwork({passes,colour}:{passes:Pass[];colour:string}){const pairs=pairCounts(passes).slice(0,14);if(!pairs.length)return null;const ids=[...new Set(pairs.flatMap(p=>[p.from,p.to]))].slice(0,11);const touches=new Map<number,number>();pairs.forEach(p=>{touches.set(p.from,(touches.get(p.from)??0)+p.total);touches.set(p.to,(touches.get(p.to)??0)+p.total)});const pos=new Map(ids.map((id,index)=>[id,{x:12+(index%4)*25,y:16+Math.floor(index/4)*30}]));return <Card question="How did we build?" caption="Circle size shows involvement. Line weight shows pass volume." honesty={`${passes.length} passes`}><div className="relative aspect-[16/10] bg-surface-2" role="img" aria-label="Passing network"><svg viewBox="0 0 100 64" className="absolute inset-0 h-full w-full">{pairs.map(pair=>{const a=pos.get(pair.from),b=pos.get(pair.to);return a&&b?<line key={`${pair.from}-${pair.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--cream)" strokeOpacity={.15+.55*pair.complete/pair.total} strokeWidth={.3+pair.total/3}/>:null})}{ids.map(id=>{const p=pos.get(id);if(!p)return null;const r=3+Math.min(4,(touches.get(id)??0)/8);return <g key={id}><circle cx={p.x} cy={p.y} r={r} fill={colour}/><text x={p.x} y={p.y+1.4} textAnchor="middle" fontSize="3.6" fontWeight="800" fill="var(--bg)">{id}</text></g>})}</svg></div></Card>}

function PassMap({passes,matchId,colour}:{passes:Pass[];matchId:string;colour:string}){const mapped=passes.map(pass=>({pass,start:passPoint(pass,"start"),end:passPoint(pass,"end")})).filter((x):x is {pass:Pass;start:Point;end:Point}=>x.start!==null&&x.end!==null).slice(0,80);if(!mapped.length)return null;return <Card question="Where did our passes go?" caption="Every tracked pass is drawn from release to reception." honesty={`${mapped.length} located passes`}><Pitch>{mapped.map(({pass,start,end},index)=>{const t=passTime(pass)??0;return <Link key={index} to="/match/$matchId/match" params={{matchId}} search={{t}} aria-label={`Watch pass at ${fmt(t)}`}><line x1={start.x} y1={start.y/100*64} x2={end.x} y2={end.y/100*64} stroke={passCompleted(pass)?colour:"var(--text-faint)"} strokeWidth=".65" strokeDasharray={passCompleted(pass)?undefined:"2 1"} opacity=".55"/></Link>})}</Pitch></Card>}

function Interceptions({events,team,matchId,colour}:Props&{colour:string}){const items=events.filter(e=>e.team===team&&["interception","pass_intercepted","turnover_won"].includes(e.type)).map(event=>({event,point:eventPoint(event)})).filter((x):x is {event:ReviewedEvent;point:Point}=>x.point!==null);if(!items.length)return null;return <Card question="Where did we cut passes out?" caption="Each mark is an interception or pass-led regain." honesty={`${items.length} moments`}><Pitch>{items.map(({event,point})=><Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} aria-label={`Watch interception at ${fmt(event.t)}`}><g transform={`translate(${point.x} ${point.y/100*64})`}><path d="M-2 -2 2 2M2 -2-2 2" stroke={colour} strokeWidth="1.2"/><path d="M2 0h5" stroke="var(--cream)" strokeWidth=".7"/></g></Link>)}</Pitch></Card>}

function PassLog({passes,matchId}:{passes:Pass[];matchId:string}){if(!passes.length)return null;return <Card question="Which passes should we review?" caption="A chronological log of player, direction, quality and outcome." honesty={`${passes.length} passes in this period`}><div className="divide-y divide-wire-2">{passes.slice(0,30).map((pass,index)=>{const t=passTime(pass)??0;const from=passPlayer(pass,"from"),to=passPlayer(pass,"to");const s=passPoint(pass,"start"),e=passPoint(pass,"end");const direction=s&&e?e.x-s.x>8?"Forward":e.x-s.x<-8?"Back":"Across":"Pass";return <Link key={index} to="/match/$matchId/match" params={{matchId}} search={{t}} className="grid min-h-11 grid-cols-[44px_1fr_auto] items-center gap-2 py-1.5"><span className="num text-[11px] text-text-faint">{fmt(t)}</span><span className="text-[12px]">{from??"—"} → {to??"—"} <small className="ml-1 text-text-faint">{direction}</small></span><span className={cn("text-[10px] font-bold uppercase",passCompleted(pass)?"text-quality-good":"text-quality-bad")}>{passCompleted(pass)?"Complete":"Lost"}</span></Link>})}</div></Card>}

export function StatsVisuals(props: Props) {
  const range=periodRange(props.file,props.period);
  const frames=(props.file?.frames??[]).filter(frame=>inRange(frame.t,range));
  const events=props.events.filter(event=>inRange(event.t,range));
  const passes=passSet(props.stats,props.team,range);
  const p={...props,events}; const colour=props.colours[props.team];
  let cards: React.ReactNode[]=[];
  if(props.tab==="ball")cards=[<Control key="control" {...p}/>,<Thirds key="thirds" frames={frames} team={props.team} colour={colour}/>,<SequenceLength key="sequence" {...p}/>,<Runs key="runs" frames={frames} team={props.team} colour={colour}/>,<Distance key="distance" players={props.players.filter(x=>x.team===props.team)} colour={colour}/>];
  if(props.tab==="pressing")cards=[<PressMap key="press" {...p} colour={colour}/>,<CounterPress key="counter" {...p}/>,props.lineDefending&&props.lineDefending.lineBreakCount!==0?<LineBreakHero key="breaks" data={props.lineDefending} matchId={props.matchId}/>:null];
  if(props.tab==="shape"){const line=props.lineDefending;cards=[line&&line.medianM!==null&&line.usualM!==null?<DeepAnswer key="depth" data={line}/>:null,props.territory?<ShapeMultiples key="multiples" territory={props.territory} colour={colour}/>:null,line?<ShapeOutcome key="outcome" lineDefending={line} colour={colour}/>:null,line&&line.timeline.length?<LineTimeline key="timeline" data={line} matchId={props.matchId}/>:null];}
  if(props.tab==="shooting")cards=[<ShotMap key="map" {...p}/>,<ShotSummary key="summary" {...p}/>,<EntriesConceded key="entries" {...p}/>];
  if(props.tab==="players")cards=[<PlayerCards key="players" {...p}/>];
  if(props.tab==="passes")cards=[<LaneEffectiveness key="lanes" passes={passes} colour={colour}/>,<BetterOption key="better" {...p} colour={colour}/>,<PassNetwork key="network" passes={passes} colour={colour}/>,<PassMap key="map" passes={passes} colour={colour} matchId={props.matchId}/>,<Interceptions key="interceptions" {...p} colour={colour}/>,<PassLog key="log" passes={passes} matchId={props.matchId}/>];
  const shown=cards.filter(Boolean); return <div className="flex flex-col gap-3">{shown.length?shown:<EmptyTab/>}</div>;
}