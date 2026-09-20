import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GhostButton, PrimaryButton } from "./primitives";

/* ---------------- stat info sheet ---------------- */

export type InfoRow = { label: string; value: string; cream?: boolean };

export type StatInfo = {
  title: string;
  rows: InfoRow[];
  /** Term id in src/lib/glossary.ts, so the glossary opens on the right entry. */
  glossaryId?: string;
  onSeeMoments?: () => void;
};

export type VisualTakeaway = {
  value: string | number;
  unit?: string;
  label?: string;
};

export type VisualComparison = {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
};


function InfoSheet({ info, onClose }: { info: StatInfo; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-label={info.title}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-[520px] rounded-t-[8px] border border-wire bg-surface p-4 pb-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="display text-[17px] uppercase text-cream">{info.title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="tap -mr-2 -mt-2 flex items-center justify-center text-text-faint hover:text-text"
          >
            <X size={17} />
          </button>
        </div>
        <dl className="mt-3">
          {info.rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-wire-2 py-2.5 last:border-0"
            >
              <dt className="text-[12.5px] text-text-dim">{row.label}</dt>
              <dd className={cn("num text-[13px]", row.cream ? "text-cream" : "text-text")}>{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex gap-2">
          {info.onSeeMoments && (
            <PrimaryButton
              className="h-12 flex-1"
              onClick={() => {
                info.onSeeMoments?.();
                onClose();
              }}
            >
              See the moments
            </PrimaryButton>
          )}
          <Link
            to="/glossary"
            {...(info.glossaryId ? { hash: info.glossaryId } : {})}
            onClick={onClose}
            className="tap inline-flex h-12 flex-1 items-center justify-center rounded-[6px] border border-cream/60 px-5 text-sm font-semibold text-cream transition-colors duration-150 ease-out hover:bg-cream/10"
          >
            Glossary
          </Link>

        </div>

      </motion.div>
    </div>
  );
}

/* ---------------- Visual wrapper ---------------- */

export function Visual({
  question,
  caption,
  info,
  children,
  className,
  action,
  takeaway,
  comparison,
  honesty,
  footerNote,
  framing = "number-led",
}: {
  question: string;
  caption: string;
  info: StatInfo;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  takeaway?: VisualTakeaway;
  comparison?: VisualComparison;
  honesty?: string;
  footerNote?: string;
  framing?: "number-led" | "custom";
}) {
  const [open, setOpen] = useState(false);
  const inferred = info.rows.find((row) => row.cream)?.value ?? "—";
  const shownTakeaway = takeaway ?? { value: inferred };
  return (
    <section className={cn("overflow-hidden rounded-[8px] border border-wire bg-surface", className)}>
      <div className="flex items-start justify-between gap-3 px-4 pb-1.5 pt-3.5">
        <h2 className="display text-[17px] uppercase leading-tight text-cream">{question}</h2>
        <button
          type="button"
          aria-label={`What does “${question}” mean?`}
          onClick={() => setOpen(true)}
          className="tap -mr-2 -mt-2 flex shrink-0 items-center justify-center text-text-faint hover:text-cream"
        >
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] border-wire">
            <Info size={12} strokeWidth={2} />
          </span>
        </button>
      </div>
      <p className="px-4 pb-3 text-[11.5px] leading-[1.5] text-text-faint">{caption}</p>
      {framing === "number-led" && (
        <div className="px-4 pb-3">
          <div className="flex min-h-[58px] items-end gap-2">
            <strong className="display-i text-[48px] leading-[.85] text-cream md:text-[56px]">
              {shownTakeaway.value}
            </strong>
            {shownTakeaway.unit && (
              <span className="pb-1 text-[12px] font-semibold text-cream-dim">{shownTakeaway.unit}</span>
            )}
          </div>
          {shownTakeaway.label && (
            <p className="mt-1 text-[11px] font-semibold text-text-faint">{shownTakeaway.label}</p>
          )}
        </div>
      )}
      <div className="px-4 pb-3">{children}</div>
      {framing === "number-led" && (
        <div className="flex items-center justify-between gap-4 border-t border-wire-2 px-4 py-2 text-[11.5px] font-semibold">
          <span className="text-text-faint">{comparison?.label ?? "vs last 5 matches"}</span>
          <span
            className={cn(
              comparison?.tone === "bad" && "text-cream",
              comparison?.tone === "good" && "text-quality-good",
              (!comparison || comparison.tone === "neutral") && "text-text-faint",
            )}
          >
            {comparison?.value ?? "—"}
          </span>
        </div>
      )}
      {honesty && (
        <div className="flex min-h-9 items-center justify-between gap-3 border-t border-wire-2 px-4 py-2 text-[10.5px] font-medium text-text-faint">
          <span className="inline-flex items-center gap-1.5 before:h-[5px] before:w-[5px] before:shrink-0 before:rounded-full before:bg-text-faint">{honesty}</span>
          {footerNote && <span className="text-right">{footerNote}</span>}
        </div>
      )}
      {action && <div className="border-t border-wire-2 px-4 py-3">{action}</div>}
      {open && <InfoSheet info={info} onClose={() => setOpen(false)} />}
    </section>
  );
}

/* ---------------- Pitch ---------------- */

export function Pitch({
  children,
  className,
  arrowLabel,
}: {
  children?: ReactNode;
  className?: string;
  arrowLabel?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[6px] bg-surface-2">
      <svg viewBox="0 0 100 64" className="block h-auto w-full" role="img" aria-label="Pitch">
        <rect x="0" y="0" width="100" height="64" fill="var(--surface-2)" />
        <g stroke="var(--wire)" strokeWidth="0.4" fill="none">
          <rect x="2" y="2" width="96" height="60" />
          <line x1="50" y1="2" x2="50" y2="62" />
          <circle cx="50" cy="32" r="9" />
          <rect x="2" y="14" width="12" height="36" />
          <rect x="86" y="14" width="12" height="36" />
          <rect x="2" y="24" width="5" height="16" />
          <rect x="93" y="24" width="5" height="16" />
        </g>
        {children}
      </svg>
      </div>
      {arrowLabel && (
        <span className="mt-1 block text-right text-[10px] uppercase tracking-[0.08em] text-text-faint">
          {arrowLabel}
        </span>
      )}
    </div>
  );
}

export function PortraitPitch({
  children,
  arrowLabel,
}: {
  children?: ReactNode;
  arrowLabel?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 64 100" className="block h-auto w-full rounded-[6px] bg-surface-2" role="img" aria-label="Pitch">
        <rect x="0" y="0" width="64" height="100" fill="var(--surface-2)" />
        <g stroke="var(--cream)" strokeOpacity=".28" strokeWidth=".45" fill="none">
          <rect x="2" y="2" width="60" height="96" />
          <line x1="2" y1="50" x2="62" y2="50" />
          <circle cx="32" cy="50" r="9" />
          <rect x="14" y="2" width="36" height="12" />
          <rect x="14" y="86" width="36" height="12" />
          <line x1="2" y1="33.3" x2="62" y2="33.3" strokeDasharray="2 2" strokeOpacity=".35" />
          <line x1="2" y1="66.6" x2="62" y2="66.6" strokeDasharray="2 2" strokeOpacity=".35" />
        </g>
        {children}
      </svg>
      {arrowLabel && <span className="mt-1.5 block text-center text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">↑ {arrowLabel}</span>}
    </div>
  );
}

export function ZoneGrid({ values, color = "var(--cream)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 0.01);
  return (
    <g>
      {values.map((v, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        return (
          <rect
            key={i}
            x={2 + col * 16}
            y={2 + row * 15}
            width={16}
            height={15}
            fill={color}
            opacity={0.06 + (v / max) * 0.5}
          />
        );
      })}
      {values.map((v, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        return (
          <text
            key={`t${i}`}
            x={2 + col * 16 + 8}
            y={2 + row * 15 + 9}
            textAnchor="middle"
            fontSize="2.8"
            fill="var(--text-dim)"
          >
            {v.toFixed(1)}
          </text>
        );
      })}
    </g>
  );
}

export function HeatBlobs({
  points,
  color = "var(--cream)",
}: {
  points: { x: number; y: number; w: number }[];
  color?: string;
}) {
  return (
    <g>
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={(p.y / 100) * 64} r={4 + p.w * 6} fill={color} opacity={0.06 + p.w * 0.16} />
      ))}
    </g>
  );
}

export function PitchDots({
  points,
  color,
  radius = 1.6,
}: {
  points: { x: number; y: number }[];
  color: string;
  radius?: number;
}) {
  return (
    <g>
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={(p.y / 100) * 64} r={radius} fill={color} opacity={0.85} />
      ))}
    </g>
  );
}

export function PitchShirts({
  players,
  color = "var(--team-a)",
}: {
  players: { x: number; y: number; shirt: number }[];
  color?: string;
}) {
  return (
    <g>
      {players.map((p) => (
        <g key={p.shirt}>
          <circle cx={p.x} cy={(p.y / 100) * 64} r={2.6} fill={color} opacity={0.9} />
          <text
            x={p.x}
            y={(p.y / 100) * 64 + 1.1}
            textAnchor="middle"
            fontSize="2.6"
            fill="#111315"
            fontWeight="700"
          >
            {p.shirt}
          </text>
        </g>
      ))}
    </g>
  );
}

/* ---------------- Momentum + possession ---------------- */

export function MomentumStrip({ values, className }: { values: number[]; className?: string }) {
  return (
    <div className={cn("flex h-12 items-center gap-[2px]", className)} aria-hidden="true">
      {values.map((v, i) => (
        <div key={i} className="relative h-full flex-1">
          <div
            className="absolute left-0 w-full rounded-[2px]"
            style={{
              background: v >= 0 ? "var(--team-a)" : "var(--team-b)",
              opacity: 0.25 + Math.abs(v) * 0.6,
              height: `${Math.abs(v) * 50}%`,
              top: v >= 0 ? `${50 - Math.abs(v) * 50}%` : "50%",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function PossessionRibbon({
  segments,
  total,
}: {
  segments: { t: number; len: number; team: "a" | "b" }[];
  total: number;
}) {
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-[8px]" aria-hidden="true">
      {segments.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${(s.len / total) * 100}%`,
            background: s.team === "a" ? "var(--team-a)" : "var(--team-b)",
            opacity: 0.75,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- Coach mark ---------------- */

export function CoachMark({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const key = `ipanema-coachmark-${id}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(window.localStorage.getItem(key) === "1");
  }, [key]);

  if (hidden) return null;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[12px] border border-cream/40 bg-cream/10 p-3",
        className,
      )}
    >
      <p className="text-[12.5px] leading-relaxed text-cream-dim">{children}</p>
      <GhostButton
        className="h-8 shrink-0 px-2 text-[11px] text-cream"
        onClick={() => {
          window.localStorage.setItem(key, "1");
          setHidden(true);
        }}
      >
        Got it
      </GhostButton>
    </div>
  );
}
