import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamToken, shortTeamCode } from "@/components/team/TeamToken";

/** 3-4 letter cue under a team tile, e.g. FCK. */
function tokens(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && /\p{L}/u.test(w));
}

/** 3-4 letter cue under a team tile: "1. FC Köln" reads FCK. */
function abbreviate(name: string) {
  const words = tokens(name);
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  const head = words[0]!;
  const prefix = head.length <= 2 ? head : head[0]!;
  return (prefix + words.slice(1).map((w) => w[0]!).join("")).slice(0, 4).toUpperCase();
}

/** Glyph inside the colour tile: the club's name letter, e.g. K for 1. FC Köln. */

function TeamTile({
  name,
  colour,
  crestUrl,
  sublabel,
  onSelect,
  side,
}: {
  name: string;
  colour: string;
  crestUrl?: string;
  sublabel: string;
  onSelect?: () => void;
  side: "home" | "away";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Filter to ${name}`}
      className="tap flex max-w-[132px] flex-col items-center gap-1.5 rounded-[6px]"
    >
      <span
        className="relative grid h-11 w-11 place-items-center md:h-[52px] md:w-[52px]"
        style={{ background: crestUrl ? "transparent" : colour }}
        aria-hidden="true"
      >
        {crestUrl ? (
          <img src={crestUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <>
            <span
              className="absolute inset-0 rounded-[6px]"
              style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.12)" }}
            />
            <span className="display-i text-[18px] leading-none text-white md:text-[20px]">
              {abbreviate(name)}
            </span>
          </>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] font-semibold leading-tight text-text-dim">
        {sublabel || (side === "home" ? "Home" : "Away")}
      </span>
    </button>
  );
}

/**
 * The header on every match screen: team tiles, the scoreboard score and the
 * period line. Team colours always come from the club's kit colours.
 */
export function MatchHeader({
  teamA,
  teamB,
  scoreA,
  scoreB,
  colourA = "var(--team-a)",
  colourB = "var(--team-b)",
  crestA,
  crestB,
  periodLine,
  metaLine,
  onSelectTeamA,
  onSelectTeamB,
  onSetup,
  result,
  className,
}: {
  teamA: string;
  teamB: string;
  /** null on a match that hasn't kicked off — the score reads — : — */
  scoreA: number | null;
  scoreB: number | null;
  colourA?: string;
  colourB?: string;
  crestA?: string;
  crestB?: string;
  /** e.g. "1st half · 1. FC Köln attack right · 0:47". Omitted before kick-off. */
  periodLine?: string;
  /** Shown instead of the period line before kick-off, e.g. the date. */
  metaLine?: string;
  onSelectTeamA?: () => void;
  onSelectTeamB?: () => void;
  onSetup?: () => void;
  /** Win / Draw / Loss from the coach's own side, when the labels say which side that is. */
  result?: "W" | "D" | "L" | null;
  className?: string;
}) {
  const played = scoreA !== null && scoreB !== null;
  const resultLabel = result === "W" ? "Won" : result === "D" ? "Drew" : result === "L" ? "Lost" : null;

  return (
    <section
      aria-label={`${teamA} against ${teamB}`}
      className={cn("relative overflow-hidden rounded-[14px] border border-wire bg-surface", className)}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${colourA} 0%, ${colourA} 45%, ${colourB} 55%, ${colourB} 100%)` }}
        aria-hidden="true"
      />

      {/* Row 1 — score */}
      <div className="relative flex min-h-14 items-center justify-between px-5 py-4 md:px-7 md:py-5">
        <TeamTile
          name={teamA}
          colour={colourA}
          {...(crestA ? { crestUrl: crestA } : {})}
          sublabel={teamA}
          side="home"
          {...(onSelectTeamA ? { onSelect: onSelectTeamA } : {})}
        />
        <button
          type="button"
          onClick={onSetup}
          aria-label="Match setup"
          className="display-i text-[40px] leading-none tracking-[0.02em] text-cream md:text-[48px]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {played ? `${scoreA}\u2009:\u2009${scoreB}` : "—\u2009:\u2009—"}
        </button>
        <TeamTile
          name={teamB}
          colour={colourB}
          {...(crestB ? { crestUrl: crestB } : {})}
          sublabel={teamB}
          side="away"
          {...(onSelectTeamB ? { onSelect: onSelectTeamB } : {})}
        />
      </div>

      {/* Row 2 — divider */}
      <div className="relative mx-5 h-px bg-wire-2 md:mx-7" />

      {/* Row 3 — meta */}
      <div className="relative flex items-center justify-between gap-3 px-5 pb-3.5 pt-3 md:px-7">
        <p className="flex min-w-0 items-center gap-2 truncate text-[11.5px] font-medium tracking-[0.01em] text-text-dim [font-variant-numeric:tabular-nums]">
          <span className="truncate">{periodLine ?? metaLine ?? ""}</span>
          {resultLabel && (
            <>
              <span className="text-text-faint" aria-hidden="true">·</span>
              <span className={cn("shrink-0 font-bold uppercase", result === "W" ? "text-reaction-good" : result === "L" ? "text-reaction-bad" : "text-text-dim")}>
                {resultLabel}
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onSetup}
          aria-label="Match setup"
          className="tap flex shrink-0 items-center justify-center text-text-faint hover:text-text"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-wire">
            <Settings size={14} aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}
