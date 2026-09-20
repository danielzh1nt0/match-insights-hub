import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ChartNoAxesColumn, Film, Library, Map, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark, Segmented } from "./primitives";
import { AccountMenu } from "./account-menu";

/* ---------------- AppHeader (3 column grid) ---------------- */

export function AppHeader({ backTo, onBack }: { backTo?: string; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-wire-2 bg-bg/95 backdrop-blur">
      <div className="mx-auto grid min-h-16 max-w-[1440px] grid-cols-[44px_1fr_44px] items-center px-4 md:px-7">
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
      <div className="flex items-center justify-center md:justify-start">
        <Link to="/library" aria-label="Ipanema home" className="flex items-center gap-3">
          <span className="display-i grid h-9 w-9 place-items-center rounded-[6px] border border-cream text-[21px] text-cream">I</span>
          <Wordmark size="sm" className="hidden sm:inline" />
        </Link>
        <span className="ml-5 hidden h-6 w-px bg-wire-2 md:block" aria-hidden="true" />
        <Link to="/library" className="tap ml-3 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint hover:text-text md:flex">
          <Library size={15} /> Match library
        </Link>
      </div>
      <div className="flex justify-end">
        <AccountMenu />
      </div>
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
      className={cn("mx-auto w-full max-w-[1440px] px-4 md:px-7", withNav && "pb-[100px] md:pb-8", className)}
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
  colourA = "var(--team-a)",
  colourB = "var(--team-b)",
}: {
  value: TeamScope;
  onChange: (v: TeamScope) => void;
  teamA?: string;
  teamB?: string;
  colourA?: string;
  colourB?: string;
}) {
  return (
    <Segmented
      ariaLabel="Team"
      value={value}
      onChange={onChange}
      options={[
        { value: "a", label: teamA, color: colourA },
        { value: "both", label: "Both" },
        { value: "b", label: teamB, color: colourB },
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
  { label: "Insights", to: "/match/$matchId/insights", icon: Sparkles },
  { label: "Match", to: "/match/$matchId/match", icon: Film },
  { label: "Territory", to: "/match/$matchId/territory", icon: Map },
  { label: "Stats", to: "/match/$matchId/stats", icon: ChartNoAxesColumn },
] as const;

export function FloatingNav({ matchId }: { matchId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Match sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-wire bg-bg/95 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:sticky md:top-16 md:bottom-auto md:border-b md:border-t-0 md:py-0"
    >
      <div className="mx-auto grid max-w-[620px] grid-cols-4 gap-1 md:h-12">
        {navItems.map((item) => {
          const active = pathname === item.to.replace("$matchId", matchId);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              params={{ matchId }}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap relative flex flex-col items-center justify-center gap-1 rounded-[6px] text-[10px] font-semibold uppercase tracking-[0.06em] md:flex-row md:gap-2",
                active ? "text-cream after:absolute after:inset-x-2 after:-bottom-2 after:h-0.5 after:bg-cream md:after:bottom-0" : "text-text-faint hover:text-text-dim",
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
