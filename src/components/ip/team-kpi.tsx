import { useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiGroup, TeamKpi as TeamKpiValue } from "@/lib/kpi";

/**
 * The coach's targets, scored.
 *
 * Three numbers at the top of the page, because the first thing a coach wants
 * is not what happened but whether the team did what he asked. The detail is
 * one tap away rather than on the page: a scorecard that needs reading is a
 * report, and he already has one of those below.
 */

const band = (score: number | null) =>
  score === null
    ? { ring: "var(--text-faint)", text: "text-text-faint" }
    : score >= 80
      ? { ring: "var(--reaction-good)", text: "text-reaction-good" }
      : score >= 50
        ? { ring: "var(--reaction-warn)", text: "text-reaction-warn" }
        : { ring: "var(--reaction-bad)", text: "text-reaction-bad" };

/** A score as a ring. Small enough for three across a phone. */
function Dial({ group, lead = false }: { group: KpiGroup; lead?: boolean }) {
  const tone = band(group.score);
  const r = 15.5;
  const circumference = 2 * Math.PI * r;
  const filled = ((group.score ?? 0) / 100) * circumference;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div className="relative">
        <svg
          viewBox="0 0 40 40"
          className="block h-[58px] w-[58px]"
          role="img"
          aria-label={
            group.score === null
              ? `${group.label}: not measured`
              : `${group.label}: ${group.score} out of 100, ${group.met} of ${group.measured} targets met`
          }
        >
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="var(--wire)"
            strokeWidth={lead ? 4.2 : 3}
          />
          {group.score !== null && (
            <circle
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke={tone.ring}
              strokeWidth={lead ? 4.2 : 3}
              strokeLinecap="butt"
              strokeDasharray={`${filled} ${circumference}`}
              transform="rotate(-90 20 20)"
            />
          )}
        </svg>
        <span
          className={cn(
            "num absolute inset-0 grid place-items-center leading-none",
            lead ? "text-[18px] font-semibold" : "text-[15px]",
            tone.text,
          )}
        >
          {group.score === null ? "—" : group.score}
        </span>
      </div>
      <span className={cn("label-xs text-center", lead ? "text-text-dim" : "text-text-faint")}>
        {group.label}
      </span>
      <span className="num-flat text-[11px] leading-none text-text-faint">
        {group.measured === 0 ? "no data" : `${group.met}/${group.measured}`}
      </span>
    </div>
  );
}

function Rows({ group }: { group: KpiGroup }) {
  return (
    <div>
      <p className="label-xs mb-1.5 text-text-faint">{group.label}</p>
      <ul className="rule-y border-y border-wire">
        {group.measures.map((m) => (
          <li key={m.key} className="flex items-baseline gap-3 py-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 self-center rounded-full",
                m.met === null ? "bg-text-faint" : m.met ? "bg-reaction-good" : "bg-reaction-bad",
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-dim">{m.label}</span>
            <span className="num-flat shrink-0 text-[12.5px] text-text-bright">
              {m.value === null ? "—" : `${m.value}${m.unit}`}
            </span>
            <span className="num-flat shrink-0 text-[11.5px] text-text-faint">
              {m.goodWhen === "up" ? "≥" : "≤"}
              {m.target}
              {m.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeamKpiCard({
  kpi,
  teamName,
  onEditTargets,
}: {
  kpi: TeamKpiValue;
  teamName: string;
  onEditTargets?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const unmeasured = kpi.overall.total - kpi.overall.measured;

  return (
    <section className="border border-wire bg-surface" aria-labelledby="team-kpi">
      <div className="flex items-center gap-3 p-4 sm:px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-wire text-accent-sea">
          <Target size={17} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="team-kpi" className="text-[15px] font-semibold text-text-bright">
            Did we hit our targets?
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-snug text-text-faint">
            {kpi.overall.measured === 0
              ? "This match file cannot answer any of your targets yet."
              : `${kpi.overall.met} of ${kpi.overall.measured} met${
                  unmeasured > 0 ? ` · ${unmeasured} not measured` : ""
                } · ${teamName}`}
          </p>
        </div>
        {onEditTargets && (
          <button
            type="button"
            onClick={onEditTargets}
            className="num-flat shrink-0 self-start text-[11.5px] text-accent-sea hover:underline"
          >
            Targets
          </button>
        )}
      </div>

      <div className="flex items-start justify-around gap-2 px-4 pb-4 sm:px-5">
        <Dial group={kpi.attack} />
        <Dial group={kpi.overall} lead />
        <Dial group={kpi.defence} />
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-center gap-1.5 border-t border-wire text-[12px] text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
      >
        {open ? "Hide the targets" : "Target by target"}
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-wire p-4 sm:grid-cols-2 sm:px-5">
          <Rows group={kpi.attack} />
          <Rows group={kpi.defence} />
          <p className="text-[11.5px] leading-snug text-text-faint sm:col-span-2">
            Scored out of the targets this file can answer; a target it cannot measure counts
            neither way. Built only from goals, shots, possession, entries and pass completion — the
            figures the stats audit cleared.
          </p>
        </div>
      )}
    </section>
  );
}
