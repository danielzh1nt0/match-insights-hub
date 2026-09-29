import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ChartNoAxesColumn, Film, Library, Map, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark, Segmented } from "./primitives";
import { AccountMenu } from "./account-menu";

/* ---------------- AppHeader (3 column grid) ---------------- */

export type HeaderMatch = {
  teamA: string;
  teamB: string;
  codeA: string;
  codeB: string;
  crestA?: string | undefined;
  crestB?: string | undefined;
  colourA: string;
  colourB: string;
  scoreA: number | null;
  scoreB: number | null;
  /** "P15 Div 1 · Sun 14 Sep · Full time" — one line, no more. */
  meta: string;
  result?: "W" | "D" | "L" | null;
  onSetup?: () => void;
};

/**
 * The bar at the top of every screen.
 *
 * On a match screen it carries the scoreline itself, as the prototype does,
 * instead of a separate header card taking a third of a phone screen below it.
 */
export function AppHeader({
  backTo,
  onBack,
  match,
}: {
  backTo?: string;
  onBack?: () => void;
  match?: HeaderMatch | undefined;
}) {
  const back = backTo ? (
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
  ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-wire-2 bg-bg/95 backdrop-blur">
      <div className="mx-auto max-w-[1440px] px-4 md:px-7">
        <div className="grid min-h-14 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex items-center">{back}</div>

          {match ? (
            <MatchScoreline match={match} />
          ) : (
            <div className="flex items-center justify-center md:justify-start">
              <Link to="/library" aria-label="Ipanema home" className="flex items-center gap-3">
                <span className="display-i grid h-9 w-9 place-items-center rounded-[6px] border border-cream text-[21px] text-cream">
                  I
                </span>
                <Wordmark size="sm" className="hidden sm:inline" />
              </Link>
              <span className="ml-5 hidden h-6 w-px bg-wire-2 md:block" aria-hidden="true" />
              <Link
                to="/library"
                className="tap ml-3 hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint hover:text-text md:flex"
              >
                <Library size={15} /> Match library
              </Link>
            </div>
          )}

          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        {match && (
          <div className="flex items-center justify-center gap-2 border-t border-wire-2 py-1.5 text-[11.5px] text-text-faint">
            <span className="truncate">{match.meta}</span>
            {match.result && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={cn(
                    "shrink-0 font-bold uppercase",
                    match.result === "W"
                      ? "text-reaction-good"
                      : match.result === "L"
                        ? "text-reaction-bad"
                        : "text-text-dim",
                  )}
                >
                  {match.result === "W" ? "Won" : match.result === "L" ? "Lost" : "Drew"}
                </span>
              </>
            )}
            {match.onSetup && (
              <button
                type="button"
                onClick={match.onSetup}
                aria-label="Match setup"
                className="ml-1 shrink-0 text-text-faint hover:text-text"
              >
                <Settings size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/** Crest, code, score, code, crest — the prototype's scoreline, one line high. */
function MatchScoreline({ match }: { match: HeaderMatch }) {
  const played = match.scoreA !== null && match.scoreB !== null;
  return (
    <div className="flex min-w-0 items-center justify-center gap-3">
      <HeaderTeam
        name={match.teamA}
        code={match.codeA}
        crest={match.crestA}
        colour={match.colourA}
      />
      <span className="display-i shrink-0 text-[26px] leading-none text-cream [font-variant-numeric:tabular-nums] md:text-[30px]">
        {played ? `${match.scoreA}\u2009–\u2009${match.scoreB}` : "—\u2009–\u2009—"}
      </span>
      <HeaderTeam
        name={match.teamB}
        code={match.codeB}
        crest={match.crestB}
        colour={match.colourB}
        reverse
      />
    </div>
  );
}

function HeaderTeam({
  name,
  code,
  crest,
  colour,
  reverse,
}: {
  name: string;
  code: string;
  crest?: string | undefined;
  colour: string;
  reverse?: boolean;
}) {
  return (
    <span
      className={cn("flex min-w-0 items-center gap-1.5", reverse && "flex-row-reverse")}
      title={name}
    >
      {crest ? (
        <img src={crest} alt="" className="h-7 w-7 shrink-0 object-contain md:h-8 md:w-8" />
      ) : (
        <span
          className="h-7 w-7 shrink-0 rounded-[6px] md:h-8 md:w-8"
          style={{ background: colour }}
          aria-hidden="true"
        />
      )}
      <span className="display text-[13px] text-text md:text-[15px]">{code}</span>
    </span>
  );
}

/* ---------------- Scope types ---------------- */

/** Which team a match screen is showing. */
export type TeamScope = "a" | "both" | "b";

/** Which part of the match a screen is showing. */
export type Period = "1st" | "2nd" | "full";

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
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 md:px-7",
        withNav && "pb-[100px] md:pb-8",
        className,
      )}
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
    <div className="rounded-[18px] border border-wire bg-surface p-4">
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
      <span
        className="h-7 w-7 shrink-0 rounded-[14px]"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="display truncate text-[13px] text-text">{name}</span>
    </div>
  );
}

/* ---------------- FloatingNav ---------------- */

const navItems = [
  { label: "Insights", to: "/match/$matchId/insights", icon: Sparkles },
  { label: "Match", to: "/match/$matchId/match", icon: Film },
  { label: "Phases", to: "/match/$matchId/territory", icon: Map },
  { label: "Stats", to: "/match/$matchId/stats", icon: ChartNoAxesColumn },
] as const;

export function FloatingNav({ matchId }: { matchId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Match sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-wire bg-bg/95 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:sticky md:top-16 md:bottom-auto md:border-b md:border-t-0 md:py-0"
    >
      <div className="mx-auto grid max-w-[620px] grid-cols-4 gap-1 md:mx-0 md:flex md:max-w-none md:h-12 md:gap-7">
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
                "tap relative flex flex-col items-center justify-center gap-1 rounded-[6px] text-[10px] font-semibold uppercase tracking-[0.06em] md:flex-row md:justify-start md:gap-2 md:text-[12px]",
                active
                  ? "text-cream after:absolute after:inset-x-2 after:-bottom-2 after:h-0.5 after:bg-cream md:after:bottom-0"
                  : "text-text-faint hover:text-text-dim",
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
