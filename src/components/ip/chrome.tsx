import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ChartNoAxesColumn, Film, Map, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark, Segmented } from "./primitives";
import { AccountMenu } from "./account-menu";

/* ---------------- AppHeader (3 column grid) ---------------- */

export function AppHeader({ backTo, onBack }: { backTo?: string; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-40 grid grid-cols-[44px_1fr_44px] items-center border-b border-wire-2 bg-bg/95 px-4 py-2 backdrop-blur md:px-7">
      <div className="flex items-center">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Go back"
            className="tap flex items-center justify-center rounded-[10px] text-text-dim hover:text-text"
          >
            <ArrowLeft size={18} />
          </Link>
        ) : onBack ? (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="tap flex items-center justify-center rounded-[10px] text-text-dim hover:text-text"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
      </div>
      <div className="flex justify-center">
        <Link to="/library" aria-label="Ipanema home">
          <Wordmark />
        </Link>
      </div>
      <div className="flex justify-end">
        <AccountMenu />
      </div>
    </header>
  );
}

/* ---------------- Screen shell ---------------- */

export function Screen({
  children,
  className,
  withNav = false,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1400px] px-4 md:px-7", withNav && "pb-[100px]", className)}
    >
      {children}
    </div>
  );
}

/* ---------------- MatchBar ---------------- */

export function MatchBar({
  teamA,
  teamB,
  scoreA,
  scoreB,
  periodLine,
}: {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  periodLine: string;
}) {
  return (
    <div className="rounded-[16px] border border-wire bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <TeamBadge name={teamA} color="var(--team-a)" />
        <div className="num text-center text-[32px] leading-none text-cream">
          {scoreA} : {scoreB}
        </div>
        <TeamBadge name={teamB} color="var(--team-b)" align="right" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-wire-2 pt-2.5">
        <span className="text-[11.5px] text-text-faint">{periodLine}</span>
        <button
          type="button"
          aria-label="Match settings"
          className="tap flex items-center justify-center text-text-faint hover:text-text"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

function TeamBadge({
  name,
  color,
  align = "left",
}: {
  name: string;
  color: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse")}>
      <span className="h-7 w-7 shrink-0 rounded-[8px]" style={{ background: color }} aria-hidden="true" />
      <span className="display truncate text-[13px] text-text">{name}</span>
    </div>
  );
}

/* ---------------- Selectors ---------------- */

export type TeamScope = "a" | "both" | "b";

export function TeamSelector({
  value,
  onChange,
  teamA = "Team A",
  teamB = "Team B",
}: {
  value: TeamScope;
  onChange: (v: TeamScope) => void;
  teamA?: string;
  teamB?: string;
}) {
  return (
    <Segmented
      ariaLabel="Team"
      value={value}
      onChange={onChange}
      options={[
        { value: "a", label: teamA, color: "var(--team-a)" },
        { value: "both", label: "Both" },
        { value: "b", label: teamB, color: "var(--team-b)" },
      ]}
    />
  );
}

export type Period = "1st" | "2nd" | "full";

export function PeriodSelector({
  value,
  onChange,
  periods = 1,
}: {
  value: Period;
  onChange: (v: Period) => void;
  periods?: number;
}) {
  if (periods < 2) return null;
  return (
    <Segmented
      ariaLabel="Period"
      value={value}
      onChange={onChange}
      options={[
        { value: "1st", label: "1st" },
        { value: "2nd", label: "2nd" },
        { value: "full", label: "Full" },
      ]}
    />
  );
}

/* ---------------- FloatingNav ---------------- */

const navItems = [
  { label: "Insights", suffix: "insights", icon: Sparkles },
  { label: "Match", suffix: "match", icon: Film },
  { label: "Territory", suffix: "territory", icon: Map },
  { label: "Stats", suffix: "stats", icon: ChartNoAxesColumn },
] as const;

export function FloatingNav({ matchId }: { matchId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Match sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-wire bg-bg/95 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-1">
        {navItems.map((item) => {
          const href = `/match/${matchId}/${item.suffix}`;
          const active = pathname === href;
          const Icon = item.icon;
          return (
            <a
              key={item.suffix}
              href={href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap flex flex-col items-center justify-center gap-1 rounded-[10px] text-[10px] font-semibold uppercase tracking-[0.06em]",
                active ? "text-cream" : "text-text-faint hover:text-text-dim",
              )}
            >
              <Icon size={17} />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
