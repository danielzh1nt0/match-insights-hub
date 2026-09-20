import { Link } from "@tanstack/react-router";
import type { ReviewedEvent } from "@/lib/event-reviews";
import type { PlayerStat, StatSection, StatsFile, TeamKey } from "@/lib/match-analysis";
import type { MatchDataFile } from "@/lib/match-source";
import { cn } from "@/lib/utils";

type Props = {
  section: StatSection;
  players: PlayerStat[];
  stats: StatsFile | undefined;
  file: MatchDataFile | undefined;
  events: ReviewedEvent[];
  team: TeamKey;
  colours: { A: string; B: string };
  matchId: string;
};

const n = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const pct = (value: number, max: number) => max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;

function BallShare({ section, team, colours }: Pick<Props, "section" | "team" | "colours">) {
  const a = Number.parseFloat(section.rows[0]?.a ?? "0") || 0;
  const b = Number.parseFloat(section.rows[0]?.b ?? "0") || 0;
  const own = team === "A" ? a : b;
  return <div className="grid grid-cols-[108px_1fr] items-center gap-4">
    <svg viewBox="0 0 100 100" className="h-[108px] w-[108px]" role="img" aria-label={`${own}% possession`}>
      <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-3)" strokeWidth="12" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={colours[team]} strokeWidth="12" pathLength="100" strokeDasharray={`${own} ${100-own}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="55" textAnchor="middle" fill="var(--cream)" fontFamily="var(--font-display)" fontWeight="800" fontStyle="italic" fontSize="22">{own}%</text>
    </svg>
    <dl className="divide-y divide-wire-2">
      {section.rows.slice(1,4).map(row => <div key={row.label} className="flex items-baseline justify-between gap-3 py-2"><dt className="text-[11px] text-text-faint">{row.label}</dt><dd className="num text-[14px] text-text">{team === "A" ? row.a : row.b}</dd></div>)}
    </dl>
  </div>;
}

function ReactionStrip({ events, team, matchId }: Pick<Props, "events" | "team" | "matchId">) {
  const losses = events.filter(e => e.team === team && e.type === "turnover_lost").slice(0, 18);
  const times = losses.map(e => n(e.payload?.["time_to_press"])).filter((v): v is number => v !== null);
  const max = Math.max(...times, 6);
  return <div>
    <div className="relative h-[92px]" role="img" aria-label="Reaction time after each loss">
      <div className="absolute inset-x-0 top-9 h-px bg-wire" />
      <div className="absolute bottom-4 top-4 w-px bg-cream/40" style={{ left: `${pct(2,max)}%` }} />
      {losses.map((event,index) => { const value=n(event.payload?.["time_to_press"]); if(value===null)return null; const tone=value<=2?"bg-quality-good":value<=4?"bg-quality-risky":"bg-quality-bad"; return <Link key={event.id} to="/match/$matchId/match" params={{matchId}} search={{t:event.t}} className="tap absolute top-[14px] -translate-x-1/2" style={{left:`${pct(value,max)}%`}} aria-label={`Watch reaction at ${value} seconds`}><span className={cn("absolute left-1/2 top-[16px] h-3 w-3 -translate-x-1/2 rounded-full border border-bg",tone)} /></Link>; })}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] font-semibold text-text-faint"><span>0 s</span><span>2 s target</span><span>{Math.ceil(max)} s</span></div>
    </div>
    {times.length===0 && <p className="py-4 text-center text-[12px] text-text-faint">Reaction times were not supplied.</p>}
  </div>;
}

export function ShapeRibbon({ stats, team }: Pick<Props,"stats"|"team">) {
  const raw=(stats?.metrics?.["shape_timeline"] as Record<string, unknown[]>|undefined)?.[team] ?? [];
  const samples=raw.map(v=>v as Record<string,unknown>).map(v=>({t:n(v["t"]),length:n(v["length"]),width:n(v["width"])})).filter(v=>v.t!==null&&v.length!==null);
  const maxT=Math.max(...samples.map(v=>v.t ?? 0),1), maxL=Math.max(...samples.map(v=>v.length ?? 0),1);
  const top=samples.map(v=>`${pct(v.t ?? 0,maxT)},${44-(v.length ?? 0)/maxL*24}`).join(" ");
  const bottom=[...samples].reverse().map(v=>`${pct(v.t ?? 0,maxT)},${44+(v.length ?? 0)/maxL*24}`).join(" ");
  const width=samples.map(v=>`${pct(v.t ?? 0,maxT)},${44-(v.width ?? 0)/Math.max(maxL,1)*10}`).join(" ");
  return <div role="img" aria-label="Team compactness through the match"><svg viewBox="0 0 100 88" preserveAspectRatio="none" className="h-[128px] w-full"><polygon points={`${top} ${bottom}`} fill="var(--cream)" opacity=".18"/><polyline points={width} fill="none" stroke="var(--cream)" strokeOpacity=".72" strokeWidth="1" vectorEffect="non-scaling-stroke"/><line x1="50" y1="8" x2="50" y2="78" stroke="var(--cream)" strokeOpacity=".22" strokeWidth="1" vectorEffect="non-scaling-stroke"/></svg><div className="flex justify-between text-[10px] font-semibold text-text-faint"><span>0'</span><span>45'</span><span>90'</span></div>{samples.length===0&&<p className="py-3 text-center text-[12px] text-text-faint">Shape timeline was not supplied.</p>}</div>;
}

function ShotMap({ stats, colours, matchId }: Pick<Props,"stats"|"colours"|"matchId">) {
  const shots=Array.isArray(stats?.metrics?.["shots"])?stats?.metrics?.["shots"]:[];
  return <svg viewBox="0 0 100 64" className="w-full rounded-[12px] bg-surface-2" role="img" aria-label="Shot locations for both teams"><g fill="none" stroke="var(--cream)" strokeOpacity=".25" strokeWidth=".5"><rect x="2" y="2" width="96" height="60"/><line x1="50" y1="2" x2="50" y2="62"/><circle cx="50" cy="32" r="9"/><rect x="2" y="14" width="13" height="36"/><rect x="85" y="14" width="13" height="36"/></g>{shots.map((raw:any,index:number)=>{const team:TeamKey=raw?.team==="B"?"B":"A"; const x=n(raw?.x)??n(raw?.px)??(team==="A"?24:76); const y=n(raw?.y)??n(raw?.py)??32; return <Link key={raw?.id??index} to="/match/$matchId/match" params={{matchId}} search={{t:n(raw?.t)??0}} aria-label={`Watch ${team} shot`}><circle cx={Math.max(3,Math.min(97,x))} cy={Math.max(3,Math.min(61,y))} r={raw?.goal?2.6:2} fill={raw?.on_target||raw?.goal?colours[team]:"var(--surface-2)"} stroke={raw?.goal?"var(--cream)":colours[team]} strokeWidth={raw?.goal?1.2:.8}/></Link>})}</svg>;
}

function DistanceRows({ players, colours }: Pick<Props,"players"|"colours">) {
  const ranked=[...players].sort((a,b)=>(b.minutes?b.distanceM/b.minutes:0)-(a.minutes?a.distanceM/a.minutes:0)).slice(0,8); const max=Math.max(...ranked.map(p=>p.minutes?p.distanceM/p.minutes:0),1);
  return <div className="divide-y divide-wire-2">{ranked.map(p=>{const rate=p.minutes?Math.round(p.distanceM/p.minutes):0;return <div key={`${p.team}-${p.id}`} className="grid grid-cols-[28px_1fr_62px] items-center gap-2 py-2"><span className="num text-center text-[14px] text-text">{p.id}</span><div className="h-3 overflow-hidden rounded-[3px] bg-surface-2"><div className="h-full" style={{width:`${pct(rate,max)}%`,background:colours[p.team]}}/></div><span className="num text-right text-[12px] text-text">{rate}<small className="ml-1 text-[9px] text-text-faint">m/min</small></span></div>})}{ranked.length===0&&<p className="py-6 text-center text-[12px] text-text-faint">Player distances were not supplied.</p>}</div>;
}

function ProgressionFlow({ stats, team, colours }: Pick<Props,"stats"|"team"|"colours">) {
  const passes=(stats?.passes??[]).filter((p:any)=>p?.team===team); const counts=new Map<number,number>(); for(const p of passes){for(const key of [p?.from,p?.from_id,p?.player_id,p?.to,p?.to_id]){if(typeof key==="number")counts.set(key,(counts.get(key)??0)+1)}} const nodes=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,9);
  return <div className="relative grid h-[180px] grid-cols-3 gap-4" role="img" aria-label="Player progression flow across thirds"><svg viewBox="0 0 300 180" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">{nodes.slice(0,6).map((node,i)=><path key={node[0]} d={`M${50+(i%3)*100},${32+Math.floor(i/3)*90} C${95+(i%2)*90},70 ${120+(i%2)*80},110 ${150+(i%3)*50},${52+(i%2)*72}`} fill="none" stroke={colours[team]} strokeOpacity=".28" strokeWidth={Math.max(2,Math.min(10,node[1]/3))}/>)}</svg>{[0,1,2].map(col=><div key={col} className="z-10 flex flex-col justify-around">{nodes.slice(col*3,col*3+3).map(([id,count])=><span key={id} className="num mx-auto grid rounded-full border border-wire bg-surface-2 text-center text-[14px] text-text" style={{width:`${Math.min(52,34+count)}px`,height:`${Math.min(52,34+count)}px`,placeItems:"center"}}>{id}</span>)}</div>) }{nodes.length===0&&<p className="absolute inset-0 grid place-items-center text-[12px] text-text-faint">Pass links were not supplied.</p>}</div>;
}

export function StatsVisual(props: Props) {
  if(props.section.key==="ball")return <BallShare {...props}/>;
  if(props.section.key==="pressing")return <ReactionStrip {...props}/>;
  if(props.section.key==="shape")return <ShapeRibbon {...props}/>;
  if(props.section.key==="shooting")return <ShotMap {...props}/>;
  if(props.section.key==="players")return <DistanceRows {...props}/>;
  return <ProgressionFlow {...props}/>;
}