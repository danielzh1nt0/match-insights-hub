import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

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
function initialOf(name: string) {
  const words = tokens(name);
  const main = [...words].reverse().find((w) => w.length > 2) ?? words[0] ?? name;
  return (main[0] ?? "?").toUpperCase();
}

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
      className="tap flex flex-col items-center gap-1.5 rounded-[12px]"
    >
      <span
        className="relative grid h-11 w-11 place-items-center md:h-[52px] md:w-[52px]"
        style={{ background: crestUrl ? "transparent" : colour }}
        aria-hidden="true"
      >
        {crestUrl ? (
          <img src={crestUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <>
            <span
              className="absolute inset-0 rounded-[12px]"
              style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.12)" }}
            />
            <span className="display-i text-[22px] leading-none tracking-[-0.02em] text-[#ffffff]">
              {initialOf(name)}
            </span>
          </>
        )}
      </span>
      <span className="text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-text-faint">
        {sublabel || (side === "home" ? "HOME" : "AWAY")}
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
  className?: string;
}) {
  const played = scoreA !== null && scoreB !== null;

  return (
    <section
      aria-label={`${teamA} against ${teamB}`}
      className={cn("relative overflow-hidden rounded-[16px] border border-wire", className)}
      style={{ background: "linear-gradient(180deg, #1a1e24 0%, #14171c 100%)" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, #ffffff 0 1px, transparent 1px 10px)",
        }}
      />

      {/* Row 1 — score */}
      <div className="relative flex min-h-14 items-center justify-between px-5 py-4 md:px-7 md:py-5">
        <TeamTile
          name={teamA}
          colour={colourA}
          {...(crestA ? { crestUrl: crestA } : {})}
          sublabel={abbreviate(teamA)}
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
          sublabel={abbreviate(teamB)}
          side="away"
          {...(onSelectTeamB ? { onSelect: onSelectTeamB } : {})}
        />
      </div>

      {/* Row 2 — divider */}
      <div className="relative mx-5 h-px bg-wire-2 md:mx-7" />

      {/* Row 3 — meta */}
      <div className="relative flex items-center justify-between gap-3 px-5 pb-3.5 pt-3 md:px-7">
        <p className="truncate text-[11.5px] font-medium tracking-[0.01em] text-text-dim [font-variant-numeric:tabular-nums]">
          {periodLine ?? metaLine ?? ""}
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
