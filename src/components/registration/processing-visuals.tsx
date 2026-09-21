import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
const stages=["Reading the pitch","Finding players","Following the ball","Working out possession","Writing findings"];
export function ProgressRing({progress,status}:{progress:number;status:"running"|"failed"|"complete"}){const offset=672-(progress/100)*672;return <div className="processing-ring relative flex h-[220px] w-[220px] items-center justify-center" role="img" aria-label={status==="running"?`${progress} percent complete`:status==="complete"?"Analysis complete":"Analysis failed"}>{status==="running"?<><svg className="absolute inset-0 -rotate-90" width="220" height="220" viewBox="0 0 220 220"><circle cx="110" cy="110" r="107" fill="none" stroke="var(--wire)" strokeWidth="3"/><circle cx="110" cy="110" r="107" fill="none" stroke="var(--cream)" strokeWidth="3" strokeLinecap="round" strokeDasharray="672" strokeDashoffset={offset} className="progress-stroke"/></svg><div className="text-center"><div className="display-i text-[64px] leading-none text-cream">{progress}%</div><div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">complete</div></div></>:status==="complete"?<Check size={82} strokeWidth={1.5} className="text-cream"/>:<X size={82} strokeWidth={1.5} className="text-reaction-bad"/>}</div>}
export function Pipeline({stage}:{stage:number}){return <div className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-x-5 gap-y-2" aria-label={`Current stage: ${stages[Math.min(stage,4)]}`}>{stages.map((s,i)=><span key={s} className={cn("inline-flex items-center gap-2 text-[11.5px] font-semibold",i<stage?"text-text-dim":i===stage?"text-text":"text-text-faint")}><i className={cn("h-1.5 w-1.5 rounded-full",i<stage?"bg-reaction-good":i===stage?"stage-pulse bg-cream":"bg-wire")}/>{s}</span>)}</div>}
const dots=[[18,26],[29,19],[31,40],[45,30],[56,17],[58,44],[76,25],[86,41],[98,18],[113,31],[128,20],[22,75],[36,61],[49,81],[62,67],[75,84],[88,60],[104,78],[118,63],[132,82],[141,54],[78,51]];
export function PitchTracker({stage}:{stage:number}){return <div className={cn("tracker-stage mx-auto w-40",`tracker-stage-${stage}`)}><svg role="img" aria-label={`${stages[Math.min(stage,4)]} tracker`} viewBox="0 0 160 106" className="w-full overflow-visible rounded-lg"><defs><linearGradient id="tracker-pitch" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--pitch-top)"/><stop offset="1" stopColor="var(--pitch-bottom)"/></linearGradient><radialGradient id="heat-a"><stop stopColor="var(--team-a)" stopOpacity=".55"/><stop offset="1" stopColor="var(--team-a)" stopOpacity="0"/></radialGradient><radialGradient id="heat-b"><stop stopColor="var(--team-b)" stopOpacity=".55"/><stop offset="1" stopColor="var(--team-b)" stopOpacity="0"/></radialGradient><clipPath id="pitch-clip"><rect width="160" height="106" rx="8"/></clipPath></defs><rect width="160" height="106" rx="8" fill="url(#tracker-pitch)"/><g className="tracker-heat" clipPath="url(#pitch-clip)"><circle cx="50" cy="50" r="32" fill="url(#heat-a)"/><circle cx="112" cy="57" r="32" fill="url(#heat-b)"/></g><g className="tracker-lines" fill="none" stroke="var(--cream)" strokeOpacity=".38" strokeWidth="1"><rect x="5" y="5" width="150" height="96" rx="3"/><path d="M80 5v96"/><circle cx="80" cy="53" r="15"/><path d="M5 29h18v48H5M155 29h-18v48h18"/></g><g className="tracker-players">{dots.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.6" fill={i<11?"var(--team-a)":"var(--team-b)"} style={{animationDelay:`${i*24}ms`}}/>)}</g><circle className="tracker-ball" cx="18" cy="54" r="2.7" fill="var(--cream)"/><rect className="tracker-outline" x="2" y="2" width="156" height="102" rx="8" fill="none" stroke="var(--cream)" strokeWidth="2"/><rect className="tracker-scan" x="0" y="0" width="32" height="106" fill="var(--cream)" opacity=".12"/></svg></div>}

/* ------------------------------------------------------------------
   MatchBuild — the match assembling itself on a pitch, stage by stage.
   phase: -1 uploading · 0 reading the pitch · 1 finding players · 2 following the ball · 3 possession · 4 findings
   ------------------------------------------------------------------ */
const W = 210, H = 136, PAD = 6;
const px = (x: number) => PAD + (x / 105) * (W - 2 * PAD);
const py = (y: number) => PAD + (y / 68) * (H - 2 * PAD);
// 4-3-3 attacking right (A) and a 4-4-2 attacking left (B), in pitch metres
const TEAM_A: [number, number][] = [[4, 34], [18, 10], [16, 26], [16, 42], [18, 58], [34, 20], [31, 34], [34, 48], [50, 12], [53, 34], [50, 56]];
const TEAM_B: [number, number][] = [[101, 34], [86, 12], [88, 27], [88, 41], [86, 56], [70, 12], [72, 28], [72, 40], [70, 56], [57, 26], [57, 42]];
const PASSES = [1, 5, 6, 7, 10, 9]; // indices of TEAM_A the ball visits
const LINES: string[] = [
  `M${px(0)} ${py(0)}H${px(105)}V${py(68)}H${px(0)}Z`,
  `M${px(52.5)} ${py(0)}V${py(68)}`,
  `M${px(52.5) + (9.15 / 105) * (W - 2 * PAD)} ${py(34)}a${(9.15 / 105) * (W - 2 * PAD)} ${(9.15 / 68) * (H - 2 * PAD)} 0 1 0 0 0.01`,
  `M${px(0)} ${py(13.84)}H${px(16.5)}V${py(54.16)}H${px(0)}`,
  `M${px(105)} ${py(13.84)}H${px(88.5)}V${py(54.16)}H${px(105)}`,
  `M${px(0)} ${py(24.84)}H${px(5.5)}V${py(43.16)}H${px(0)}`,
  `M${px(105)} ${py(24.84)}H${px(99.5)}V${py(43.16)}H${px(105)}`,
];

export function MatchBuild({ phase, pct, status }: { phase: number; pct: number | null; status: "running" | "failed" | "complete" }) {
  const up = phase < 0;
  const ballX = PAD + ((pct ?? 0) / 100) * (W - 2 * PAD);
  const route = PASSES.map((i) => TEAM_A[i]).filter((p): p is [number, number] => Boolean(p));
  const routePath = route.map(([x, y], i) => `${i ? "L" : "M"}${px(x)} ${py(y)}`).join(" ");
  return (
    <div className={cn("mb-root relative mx-auto w-full max-w-[440px]", `mb-phase-${Math.max(-1, Math.min(4, phase))}`, status === "complete" && "mb-done", status === "failed" && "mb-failed")}>
      <style>{`
        .mb-root svg{display:block;width:100%;height:auto;overflow:visible}
        .mb-line{fill:none;stroke:var(--cream);stroke-width:.9;stroke-opacity:.16;stroke-dasharray:1;stroke-dashoffset:0}
        .mb-player,.mb-heat,.mb-pass,.mb-lane,.mb-ball-live,.mb-scan,.mb-goal-ball,.mb-net{opacity:0}
        .mb-root:not(.mb-phase--1) .mb-line{stroke-opacity:.55}
        .mb-player{transform-box:fill-box;transform-origin:center;transition:opacity .4s ease-out}
        .mb-heat{transition:opacity 1.2s ease-out}
        .mb-root.mb-phase-1 .mb-player,.mb-root.mb-phase-2 .mb-player,.mb-root.mb-phase-3 .mb-player,.mb-root.mb-phase-4 .mb-player,.mb-root.mb-done .mb-player{opacity:1}
        .mb-root.mb-phase-2 .mb-ball-live,.mb-root.mb-phase-3 .mb-ball-live,.mb-root.mb-phase-4 .mb-ball-live{opacity:1}
        .mb-root.mb-phase-2 .mb-pass,.mb-root.mb-phase-3 .mb-pass,.mb-root.mb-phase-4 .mb-pass{opacity:.55}
        .mb-root.mb-phase-3 .mb-heat,.mb-root.mb-phase-4 .mb-heat,.mb-root.mb-done .mb-heat{opacity:1}
        .mb-root.mb-phase-4 .mb-lane{opacity:1}
        .mb-root.mb-done .mb-ball-live,.mb-root.mb-done .mb-pass{opacity:0}
        .mb-root.mb-failed svg{filter:grayscale(1);opacity:.45}
        @media (prefers-reduced-motion:no-preference){
          .mb-root.mb-phase-0 .mb-line{stroke-dasharray:1;stroke-dashoffset:1;animation:mb-draw 1.4s ease-out forwards}
          .mb-root.mb-phase-0 .mb-line:nth-child(2){animation-delay:.25s}.mb-root.mb-phase-0 .mb-line:nth-child(3){animation-delay:.5s}
          .mb-root.mb-phase-0 .mb-line:nth-child(n+4){animation-delay:.75s}
          .mb-root.mb-phase-0 .mb-scan{opacity:1;animation:mb-scan 2.6s ease-in-out infinite}
          .mb-root.mb-phase-1 .mb-player{animation:mb-pop .5s cubic-bezier(.2,1.6,.4,1) both}
          .mb-player{animation-delay:calc(var(--i) * 45ms)}
          .mb-root.mb-phase-2 .mb-player,.mb-root.mb-phase-3 .mb-player{animation:mb-breathe 3s ease-in-out infinite;animation-delay:calc(var(--i) * 120ms)}
          .mb-pass{stroke-dasharray:3 3;animation:mb-flow 1.1s linear infinite}
          .mb-lane{stroke-dasharray:1;stroke-dashoffset:1}
          .mb-root.mb-phase-4 .mb-lane{animation:mb-draw 1.2s ease-out forwards,mb-glow 2.4s ease-in-out 1.2s infinite}
          .mb-trail{transition:x2 .6s ease-out}
          .mb-up-ball{transition:cx .6s ease-out}
          .mb-root.mb-done .mb-goal-ball{animation:mb-shot 1s cubic-bezier(.3,.1,.2,1) forwards}
          .mb-root.mb-done .mb-net{animation:mb-net .7s ease-out .8s forwards}
        }
        @keyframes mb-draw{to{stroke-dashoffset:0}}
        @keyframes mb-scan{0%{transform:translateX(-40px)}50%{transform:translateX(${W}px)}100%{transform:translateX(-40px)}}
        @keyframes mb-pop{0%{opacity:0;transform:scale(.2)}100%{opacity:1;transform:scale(1)}}
        @keyframes mb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        @keyframes mb-flow{to{stroke-dashoffset:-12}}
        @keyframes mb-glow{0%,100%{stroke-opacity:.9}50%{stroke-opacity:.35}}
        @keyframes mb-shot{0%{opacity:1;transform:translate(0,0)}100%{opacity:1;transform:translate(${px(105) - px(60) + 3}px,0)}}
        @keyframes mb-net{0%{opacity:0;transform:scaleX(1)}40%{opacity:1;transform:scaleX(1.35)}100%{opacity:.8;transform:scaleX(1)}}
      `}</style>
      <svg viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={up ? `Uploading ${pct ?? 0} percent` : status === "complete" ? "Analysis ready" : "Analysis in progress"}>
        <defs>
          <linearGradient id="mb-grass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--pitch-top)" /><stop offset="1" stopColor="var(--pitch-bottom)" /></linearGradient>
          <radialGradient id="mb-heat-a"><stop stopColor="var(--team-a)" stopOpacity=".55" /><stop offset="1" stopColor="var(--team-a)" stopOpacity="0" /></radialGradient>
          <radialGradient id="mb-heat-b"><stop stopColor="var(--team-b)" stopOpacity=".5" /><stop offset="1" stopColor="var(--team-b)" stopOpacity="0" /></radialGradient>
          <linearGradient id="mb-beam" x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--cream)" stopOpacity="0" /><stop offset=".5" stopColor="var(--cream)" stopOpacity=".22" /><stop offset="1" stopColor="var(--cream)" stopOpacity="0" /></linearGradient>
          <clipPath id="mb-clip"><rect width={W} height={H} rx="7" /></clipPath>
        </defs>
        <rect width={W} height={H} rx="7" fill="url(#mb-grass)" />
        {/* mowing stripes */}
        <g clipPath="url(#mb-clip)" opacity=".06">{Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 21} width="10.5" height={H} fill="var(--cream)" />)}</g>
        <g clipPath="url(#mb-clip)"><rect className="mb-scan" x="0" y="0" width="40" height={H} fill="url(#mb-beam)" /></g>
        <g className="mb-heat" clipPath="url(#mb-clip)"><ellipse cx={px(32)} cy={py(34)} rx="48" ry="40" fill="url(#mb-heat-a)" /><ellipse cx={px(76)} cy={py(34)} rx="42" ry="36" fill="url(#mb-heat-b)" /></g>
        <g>{LINES.map((d, i) => <path key={i} d={d} pathLength={1} className="mb-line" />)}</g>
        {/* goals */}
        <g fill="none" stroke="var(--cream)" strokeOpacity=".5" strokeWidth=".8"><path d={`M${px(0)} ${py(30.34)}h-4v${py(37.66) - py(30.34)}h4`} /><path d={`M${px(105)} ${py(30.34)}h4v${py(37.66) - py(30.34)}h-4`} /></g>
        <g className="mb-net" style={{ transformOrigin: `${px(105) + 2}px ${py(34)}px` }}><path d={`M${px(105)} ${py(30.34)}h4v${py(37.66) - py(30.34)}h-4`} fill="var(--cream)" fillOpacity=".25" stroke="var(--cream)" strokeWidth=".8" /></g>
        {/* lanes (findings) */}
        <g fill="none" stroke="var(--team-a)" strokeWidth="1.4" strokeLinecap="round">
          <path className="mb-lane" pathLength={1} d={`M${px(31)} ${py(34)}Q${px(42)} ${py(20)} ${px(50)} ${py(12)}`} />
          <path className="mb-lane" pathLength={1} d={`M${px(34)} ${py(48)}Q${px(45)} ${py(44)} ${px(53)} ${py(34)}`} />
        </g>
        {/* passes behind the ball */}
        <path className="mb-pass" d={routePath} fill="none" stroke="var(--cream)" strokeWidth=".8" />
        {/* players */}
        {TEAM_A.map(([x, y], i) => <circle key={`a${i}`} className="mb-player" style={{ ["--i" as string]: i } as CSSProperties} cx={px(x)} cy={py(y)} r="2.7" fill="var(--team-a)" stroke={i === 0 ? "var(--cream)" : "none"} strokeWidth=".6" />)}
        {TEAM_B.map(([x, y], i) => <circle key={`b${i}`} className="mb-player" style={{ ["--i" as string]: i + 11 } as CSSProperties} cx={px(x)} cy={py(y)} r="2.7" fill="var(--team-b)" stroke={i === 0 ? "var(--cream)" : "none"} strokeWidth=".6" />)}
        {/* the ball following the play */}
        <circle className="mb-ball-live" r="2.1" fill="var(--cream)">
          <animateMotion dur="5.4s" repeatCount="indefinite" path={routePath} keyTimes={route.map((_, i) => (i / (route.length - 1)).toFixed(3)).join(";")} keyPoints={route.map((_, i) => (i / (route.length - 1)).toFixed(3)).join(";")} calcMode="linear" />
        </circle>
        {/* ready: the ball goes in */}
        <circle className="mb-goal-ball" cx={px(60)} cy={py(34)} r="2.3" fill="var(--cream)" />
        {/* upload: ball dribbling along the touchline */}
        {up && <g>
          <line x1={PAD} y1={H + 7} x2={W - PAD} y2={H + 7} stroke="var(--wire)" strokeWidth="1" strokeLinecap="round" />
          <line className="mb-trail" x1={PAD} y1={H + 7} x2={ballX} y2={H + 7} stroke="var(--cream)" strokeOpacity=".75" strokeWidth="1.6" strokeLinecap="round" />
          <circle className="mb-up-ball" cx={ballX} cy={H + 7} r="3.4" fill="var(--cream)" />
        </g>}
      </svg>
      {up && <div className="pointer-events-none absolute inset-x-0 top-[34%] -translate-y-1/2 text-center"><div className="display-i text-[64px] leading-none text-cream drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{pct ?? 0}%</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">uploaded</div></div>}
      {status === "complete" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><Check size={72} strokeWidth={1.5} className="text-cream drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]" /></div>}
      {status === "failed" && <div className="pointer-events-none absolute inset-0 grid place-items-center"><X size={72} strokeWidth={1.5} className="text-reaction-bad" /></div>}
    </div>
  );
}
