import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Info, Pause, Play, RotateCcw, X } from "lucide-react";
import type { DrillTemplateId } from "@/lib/session-plan";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Player = { number: number; team: "a" | "b" | "gk"; from: Point; to: Point; delay?: number };
type Template = { label: string; players: Player[]; ball: Point[]; zones?: boolean; goals?: boolean };

const templates: Record<DrillTemplateId, Template> = {
  passing: {
    label: "Passing warm-up with four players moving around a pressing defender",
    players: [
      { number: 2, team: "a", from: { x: 19, y: 19 }, to: { x: 27, y: 25 } },
      { number: 4, team: "a", from: { x: 80, y: 18 }, to: { x: 72, y: 26 }, delay: 0.2 },
      { number: 6, team: "a", from: { x: 80, y: 47 }, to: { x: 72, y: 40 }, delay: 0.4 },
      { number: 8, team: "a", from: { x: 19, y: 47 }, to: { x: 28, y: 39 }, delay: 0.6 },
      { number: 5, team: "b", from: { x: 50, y: 31 }, to: { x: 62, y: 22 }, delay: 0.5 },
    ],
    ball: [{ x: 21, y: 20 }, { x: 76, y: 20 }, { x: 76, y: 45 }, { x: 23, y: 44 }, { x: 21, y: 20 }],
  },
  rondo: {
    label: "Small-sided possession game with a neutral player and two mini-goals",
    players: [
      { number: 2, team: "a", from: { x: 20, y: 18 }, to: { x: 30, y: 23 } },
      { number: 4, team: "a", from: { x: 24, y: 46 }, to: { x: 35, y: 41 }, delay: 0.3 },
      { number: 7, team: "a", from: { x: 48, y: 13 }, to: { x: 57, y: 20 }, delay: 0.5 },
      { number: 8, team: "a", from: { x: 48, y: 50 }, to: { x: 58, y: 43 }, delay: 0.7 },
      { number: 9, team: "a", from: { x: 78, y: 31 }, to: { x: 68, y: 31 }, delay: 0.4 },
      { number: 3, team: "b", from: { x: 38, y: 30 }, to: { x: 29, y: 22 }, delay: 0.4 },
      { number: 5, team: "b", from: { x: 61, y: 29 }, to: { x: 51, y: 20 }, delay: 0.6 },
      { number: 6, team: "b", from: { x: 50, y: 41 }, to: { x: 62, y: 39 }, delay: 0.8 },
    ],
    ball: [{ x: 22, y: 18 }, { x: 49, y: 14 }, { x: 76, y: 31 }, { x: 49, y: 49 }, { x: 22, y: 18 }],
    goals: true,
  },
  positional: {
    label: "Positional game showing two connected units moving through three zones",
    players: [
      { number: 3, team: "a", from: { x: 18, y: 18 }, to: { x: 29, y: 20 } },
      { number: 4, team: "a", from: { x: 18, y: 47 }, to: { x: 29, y: 44 }, delay: 0.2 },
      { number: 6, team: "a", from: { x: 43, y: 24 }, to: { x: 53, y: 24 }, delay: 0.4 },
      { number: 8, team: "a", from: { x: 43, y: 40 }, to: { x: 53, y: 40 }, delay: 0.5 },
      { number: 9, team: "a", from: { x: 73, y: 31 }, to: { x: 82, y: 31 }, delay: 0.7 },
      { number: 5, team: "b", from: { x: 55, y: 18 }, to: { x: 64, y: 23 }, delay: 0.5 },
      { number: 7, team: "b", from: { x: 62, y: 46 }, to: { x: 70, y: 40 }, delay: 0.7 },
    ],
    ball: [{ x: 19, y: 18 }, { x: 45, y: 24 }, { x: 74, y: 31 }, { x: 45, y: 40 }, { x: 19, y: 18 }],
    zones: true,
  },
  match: {
    label: "Match game with two teams attacking full-size goals",
    players: [
      { number: 1, team: "gk", from: { x: 9, y: 32 }, to: { x: 10, y: 32 } },
      { number: 3, team: "a", from: { x: 26, y: 18 }, to: { x: 36, y: 20 }, delay: 0.2 },
      { number: 5, team: "a", from: { x: 26, y: 46 }, to: { x: 38, y: 42 }, delay: 0.3 },
      { number: 8, team: "a", from: { x: 45, y: 32 }, to: { x: 58, y: 30 }, delay: 0.4 },
      { number: 9, team: "a", from: { x: 62, y: 18 }, to: { x: 76, y: 22 }, delay: 0.6 },
      { number: 2, team: "b", from: { x: 73, y: 43 }, to: { x: 62, y: 39 }, delay: 0.3 },
      { number: 4, team: "b", from: { x: 60, y: 31 }, to: { x: 50, y: 32 }, delay: 0.5 },
      { number: 6, team: "b", from: { x: 79, y: 18 }, to: { x: 68, y: 23 }, delay: 0.4 },
      { number: 1, team: "gk", from: { x: 91, y: 32 }, to: { x: 90, y: 32 } },
    ],
    ball: [{ x: 28, y: 45 }, { x: 46, y: 32 }, { x: 63, y: 18 }, { x: 84, y: 31 }],
    goals: true,
  },
};

function DrillInfo({ name, onClose }: { name: string; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close drill glossary" onClick={onClose} className="absolute inset-0 bg-pitch-control backdrop-blur-sm" />
      <motion.section role="dialog" aria-modal="true" aria-label={`${name} drill glossary`} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative w-full max-w-[520px] rounded-t-[16px] border border-wire bg-surface p-5 pb-7">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">Drill glossary</p><h3 className="display-i mt-1 text-[20px] text-cream">{name}</h3></div>
          <button type="button" aria-label="Close drill glossary" onClick={onClose} className="tap -mr-2 -mt-2 flex items-center justify-center text-text-faint hover:text-text"><X size={18} /></button>
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-text-dim">The pitch shows the intended player movement, ball route and working area. Pause it whenever you need to explain a coaching point.</p>
      </motion.section>
    </div>
  );
}

export function DrillPitch({ templateId, drillName }: { templateId: DrillTemplateId; drillName: string }) {
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const template = templates[templateId];
  const shouldAnimate = playing && !reducedMotion;
  const showPause = playing && !reducedMotion;
  const duration = 6;
  const finalBall = template.ball[template.ball.length - 1] ?? { x: 50, y: 31 };

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] border border-wire bg-gradient-to-b from-pitch-top to-pitch-bottom">
      <svg viewBox="0 0 100 62.5" className="h-full w-full" role="img" aria-label={template.label}>
        <defs>
          <marker id={`arrow-${templateId}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="var(--cream)" /></marker>
        </defs>
        {template.zones && <g fill="var(--cream)" opacity="0.07"><rect x="2" y="2" width="32" height="58.5" /><rect x="66" y="2" width="32" height="58.5" /></g>}
        <g fill="none" stroke="var(--pitch-line)" strokeWidth="0.55">
          <rect x="2" y="2" width="96" height="58.5" /><line x1="50" y1="2" x2="50" y2="60.5" /><circle cx="50" cy="31.25" r="8" />
          {(templateId === "match" || template.goals) && <><rect x="2" y="17" width="14" height="28" /><rect x="84" y="17" width="14" height="28" /></>}
          {template.goals && <><rect x="0.5" y="25" width="2" height="12" /><rect x="97.5" y="25" width="2" height="12" /></>}
        </g>
        <motion.path key={`path-${replay}`} d="M21 20 Q49 8 76 20 Q88 32 76 44" fill="none" stroke="var(--cream)" strokeWidth="0.7" strokeDasharray="2.2 2.2" markerEnd={`url(#arrow-${templateId})`} initial={{ pathLength: reducedMotion ? 1 : 0, opacity: 0 }} animate={{ pathLength: shouldAnimate ? [0, 1, 1] : 1, opacity: shouldAnimate ? [0, 0.65, 0.25] : 0.45 }} transition={{ duration, repeat: shouldAnimate ? Infinity : 0, ease: "easeInOut", times: [0, 0.35, 1] }} />
        {template.players.map((player, index) => {
          const fill = player.team === "a" ? "var(--team-a)" : player.team === "b" ? "var(--team-b)" : "var(--team-gk)";
          return (
            <motion.g key={`${player.team}-${player.number}-${index}-${replay}`} initial={{ x: player.from.x, y: player.from.y }} animate={{ x: shouldAnimate ? [player.from.x, player.to.x, player.from.x] : player.to.x, y: shouldAnimate ? [player.from.y, player.to.y, player.from.y] : player.to.y }} transition={{ duration, delay: player.delay ?? 0, repeat: shouldAnimate ? Infinity : 0, ease: "easeInOut" }}>
              <circle r="3.45" fill={fill} stroke="var(--pitch-line)" strokeWidth="0.5" />
              <text y="1.25" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontSize="3.2" fontWeight="800" fontStyle="italic">{player.number}</text>
            </motion.g>
          );
        })}
        <motion.g key={`ball-${replay}`} initial={{ x: template.ball[0]?.x ?? 50, y: template.ball[0]?.y ?? 31 }} animate={{ x: shouldAnimate ? template.ball.map((p) => p.x) : finalBall.x, y: shouldAnimate ? template.ball.map((p, i) => p.y - (i % 2 ? 2 : 0)) : finalBall.y }} transition={{ duration, repeat: shouldAnimate ? Infinity : 0, ease: "easeInOut" }}>
          <circle r="1.65" fill="var(--text)" /><path d="M0 -0.8 .8 -.2 .5 .8 -.5 .8 -.8 -.2Z" fill="var(--ball-detail)" />
        </motion.g>
      </svg>
      <button type="button" aria-label={`Open ${drillName} glossary entry`} onClick={() => setInfoOpen(true)} className="tap absolute right-1 top-1 flex items-center justify-center text-text hover:text-cream"><span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-pitch-control backdrop-blur-md"><Info size={13} /></span></button>
      <div className="absolute bottom-2 right-2 flex gap-1.5">
        <button type="button" aria-label={showPause ? `Pause ${drillName} animation` : `Play ${drillName} animation`} onClick={() => setPlaying((value) => !value)} className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch-control text-text backdrop-blur-md hover:text-cream">{showPause ? <Pause size={14} /> : <Play size={14} />}</button>
        <button type="button" aria-label={`Replay ${drillName} animation`} onClick={() => { setReplay((value) => value + 1); setPlaying(true); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch-control text-text backdrop-blur-md hover:text-cream"><RotateCcw size={14} /></button>
      </div>
      <AnimatePresence>{infoOpen && <DrillInfo name={drillName} onClose={() => setInfoOpen(false)} />}</AnimatePresence>
    </div>
  );
}