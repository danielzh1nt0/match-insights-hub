import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  ChartNoAxesColumn,
  ChevronDown,
  Film,
  Map,
  Scissors,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Crest } from "./touchline";
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
 * The wordmark is on it at every width — it used to be hidden below the medium
 * breakpoint, which took the logo off the product entirely on a phone — and the
 * way back to the match library is always a visible, labelled control rather
 * than an unlabelled arrow or a logo you have to guess is a link.
 *
 * On a desktop everything sits in one row. On a phone the fixture takes a
 * second row, because a scoreline squeezed between a back control and an avatar
 * is unreadable at 390px.
 */
export function AppHeader({
  backTo,
  onBack,
  match,
  matchId,
  /** Set on the library itself, where a link back to it would be a loop. */
  atLibrary = false,
}: {
  backTo?: string;
  onBack?: () => void;
  match?: HeaderMatch | undefined;
  /** Given on a match screen, the sections appear in the bar on a desktop. */
  matchId?: string | undefined;
  atLibrary?: boolean;
}) {
  const backClass =
    "tap label-sm flex shrink-0 items-center gap-1.5 pr-1 text-text-dim transition-colors hover:text-text";

  const back = onBack ? (
    <button type="button" aria-label="Go back" onClick={onBack} className={backClass}>
      <ArrowLeft size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Back</span>
    </button>
  ) : atLibrary ? null : (
    <Link to={backTo ?? "/library"} className={backClass}>
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Matches</span>
    </Link>
  );

  const wordmark = (
    <Link
      to="/library"
      aria-label="Ipanema match library"
      className="flex shrink-0 items-center gap-2.5"
    >
      <Wordmark size="sm" />
      <span className="label-xs hidden border border-wire px-1.5 py-1 text-text-faint sm:block">
        Tactical
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-wire bg-bg">
      <div className="mx-auto max-w-[1440px] px-4 md:px-7">
        <div className="flex min-h-[56px] items-center gap-3 md:min-h-[64px] md:gap-5">
          {wordmark}

          {/* On a desktop the way back sits beside the wordmark; on a phone it
              moves down to the fixture row so the logo keeps the corner. */}
          <span className="hidden items-center md:flex">{back}</span>

          {match && <FixtureBlock match={match} className="hidden md:flex" />}

          {matchId && (
            <SectionNav matchId={matchId} className="hidden shrink-0 min-[1400px]:flex" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        {/* The fixture, and the way out of it, on a phone. */}
        {match && (
          <div className="-mx-4 flex items-center gap-3 border-t border-wire px-4 py-2 md:hidden">
            {back}
            <FixtureBlock match={match} className="min-w-0 flex-1" />
          </div>
        )}

        {/* With no fixture to show, a phone still needs the way back. */}
        {!match && !atLibrary && (
          <div className="-mx-4 flex items-center border-t border-wire px-4 py-2 md:hidden">
            {back}
          </div>
        )}

        {/* Under 1280px the sections no longer fit beside the fixture, so they
            take their own scrollable row rather than being cut off. */}
        {matchId && (
          <SectionNav
            matchId={matchId}
            className="-mx-4 hidden border-t border-wire px-4 md:flex min-[1400px]:hidden"
          />
        )}
      </div>
    </header>
  );
}

/**
 * Which match is under review.
 *
 * Both crests, the result and the date in one block, because a coach with a
 * season on file needs to know at a glance which match he is reading — and it
 * is the way back to the library.
 */
function FixtureBlock({ match, className }: { match: HeaderMatch; className?: string }) {
  const played = match.scoreA !== null && match.scoreB !== null;
  const score = played ? `${match.scoreA}-${match.scoreB}` : null;
  return (
    <Link
      to="/library"
      title="Switch match"
      className={cn(
        "group flex min-w-0 items-center gap-2.5 border border-wire px-2.5 py-1.5 transition-colors hover:border-cream/50 md:gap-3 md:px-3",
        className,
      )}
    >
      <HeaderCrest
        name={match.teamA}
        crest={match.crestA}
        colour={match.colourA}
        code={match.codeA}
      />

      {/* The competition and date sit above the fixture rather than beside it.
          A static "Active fixture" label would be competing for width with the
          one thing here worth reading. */}
      <span className="flex min-w-0 flex-col">
        <span className="num-flat hidden truncate text-[11px] text-text-faint md:block">
          {match.meta}
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="hidden min-w-0 truncate text-[13px] font-semibold text-text-bright lg:block">
            {match.teamA} vs {match.teamB}
          </span>
          {score && (
            <span className="num-flat hidden shrink-0 text-[13px] text-text-dim lg:block">
              ({score})
            </span>
          )}
          {/* Where the names will not fit, the codes carry the scoreline. */}
          <span className="display-i shrink-0 text-[18px] leading-none text-text-bright lg:hidden">
            {match.codeA} {score ?? "v"} {match.codeB}
          </span>
        </span>
      </span>

      <HeaderCrest
        name={match.teamB}
        crest={match.crestB}
        colour={match.colourB}
        code={match.codeB}
      />

      {match.onSetup && (
        <button
          type="button"
          aria-label="Match setup"
          onClick={(event) => {
            event.preventDefault();
            match.onSetup?.();
          }}
          className="hidden shrink-0 text-text-faint hover:text-text md:block"
        >
          <Settings size={14} aria-hidden="true" />
        </button>
      )}
      <ChevronDown
        size={15}
        aria-hidden="true"
        className="shrink-0 text-text-faint group-hover:text-text"
      />
    </Link>
  );
}

function HeaderCrest({
  name,
  crest,
  colour,
  code,
}: {
  name: string;
  crest?: string | undefined;
  colour: string;
  code: string;
}) {
  return (
    <Crest
      team={{ name, shortCode: code, kitColour: colour, ...(crest ? { crestUrl: crest } : {}) }}
      size={28}
    />
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
    <div className=" border border-wire bg-surface p-4">
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
      <span className="h-7 w-7 shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="display truncate text-[13px] text-text">{name}</span>
    </div>
  );
}

/* ---------------- FloatingNav ---------------- */

/**
 * The sections of a match.
 *
 * Six on a desktop, where the header has the width for them. The last two are
 * destinations a coach reaches from a finding more often than from a menu, so
 * on a phone the bar carries only the four he navigates to directly.
 */
const navItems = [
  { label: "Insights", short: "Insights", to: "/match/$matchId/insights", icon: Sparkles },
  { label: "Match workspace", short: "Match", to: "/match/$matchId/match", icon: Film },
  { label: "Stats", short: "Stats", to: "/match/$matchId/stats", icon: ChartNoAxesColumn },
  { label: "Phases", short: "Phases", to: "/match/$matchId/territory", icon: Map },
  {
    label: "Tuesday session",
    short: "Session",
    to: "/match/$matchId/session",
    icon: CalendarCheck,
  },
  { label: "Reels & clips", short: "Clips", to: "/match/$matchId/reel", icon: Scissors },
] as const;

const PHONE_NAV = 4;

/** The sections as a row of underline tabs, for the header. */
export function SectionNav({ matchId, className }: { matchId: string; className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Match sections"
      className={cn(
        "items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {navItems.map((item) => {
        const active = pathname === item.to.replace("$matchId", matchId);
        return (
          <Link
            key={item.to}
            to={item.to}
            params={{ matchId }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "label-sm relative flex h-11 shrink-0 items-center whitespace-nowrap transition-colors",
              active
                ? "text-text-bright after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-cream"
                : "text-text-faint hover:text-text",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The same sections as a bar at the bottom of a phone. */
export function FloatingNav({ matchId }: { matchId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Match sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-wire bg-bg px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 md:hidden"
    >
      <div className="mx-auto grid max-w-[620px] grid-cols-4">
        {navItems.slice(0, PHONE_NAV).map((item) => {
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
                "tap label-xs relative flex flex-col items-center justify-center gap-1 py-1",
                active
                  ? "text-text-bright after:absolute after:inset-x-3 after:top-0 after:h-[2px] after:bg-cream"
                  : "text-text-faint hover:text-text-dim",
              )}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {item.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
