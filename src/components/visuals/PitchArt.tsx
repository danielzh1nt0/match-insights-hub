import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TeamKey } from "@/lib/match-analysis";

/**
 * PitchArt — the tactical-diagram family.
 *
 * One visual language for chapters, findings and story slides: the same green
 * board, the same line weights, the same caption.
 *
 * Every variant here is fed by real tracked data and shows an honest empty
 * state when there is none. Nothing in this file invents a position, a pass or
 * a route. If a diagram cannot be drawn from the match file it says so on the
 * board, rather than drawing something decorative that reads as evidence.
 *
 * Coordinates are 0–100 across the pitch and 0–66 down it, attacking right.
 */

export type Loss = { x: number; y: number; timeToPress: number | null };
export type Shirt = { shirt: number; team: TeamKey; note?: string };
export type Dot = { x: number; y: number; team: TeamKey };

const TEAM = (team: TeamKey) => (team === "A" ? "var(--team-a)" : "var(--team-b)");

/**
 * Event coordinates arrive as 0–100 on both axes. The playing surface inside
 * the board runs x 4–96 and y 4–62, so both are mapped onto it and clamped.
 * Drawing a raw 0–100 y on a 66-unit board silently drops everything in the
 * bottom third of the pitch.
 */
const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
const toX = (value: number) => 4 + (clamp(value) / 100) * 92;
const toY = (value: number) => 4 + (clamp(value) / 100) * 58;

/** The board every variant is drawn on. */
function Board({
  children,
  caption,
  note,
  aspect = "3 / 2",
  label,
  className,
}: {
  children: ReactNode;
  caption?: string | undefined;
  note?: string | undefined;
  aspect?: string | undefined;
  label: string;
  className?: string | undefined;
}) {
  return (
    <figure className={cn("m-0", className)}>
      <div
        className="relative overflow-hidden rounded-[10px] border border-wire bg-pitch-insight"
        style={{ aspectRatio: aspect }}
        role="img"
        aria-label={label}
      >
        <svg
          viewBox="0 0 100 66"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="92"
            height="58"
            rx="1"
            fill="none"
            stroke="var(--cream)"
            strokeOpacity=".28"
          />
          <line x1="50" x2="50" y1="4" y2="62" stroke="var(--cream)" strokeOpacity=".28" />
          <line
            x1="33.33"
            x2="33.33"
            y1="4"
            y2="62"
            stroke="var(--cream)"
            strokeOpacity=".12"
            strokeDasharray="2 2"
          />
          <line
            x1="66.66"
            x2="66.66"
            y1="4"
            y2="62"
            stroke="var(--cream)"
            strokeOpacity=".12"
            strokeDasharray="2 2"
          />
          <circle cx="50" cy="33" r="7" fill="none" stroke="var(--cream)" strokeOpacity=".28" />
          <path d="M4 20 H14 V46 H4" fill="none" stroke="var(--cream)" strokeOpacity=".18" />
          <path d="M96 20 H86 V46 H96" fill="none" stroke="var(--cream)" strokeOpacity=".18" />
          {children}
        </svg>
        {caption && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-display text-[9px] font-bold uppercase tracking-[0.06em] text-cream/65">
            {caption}
          </span>
        )}
      </div>
      {note && (
        <figcaption className="mt-1.5 text-[10.5px] leading-snug text-text-faint">
          {note}
        </figcaption>
      )}
    </figure>
  );
}

/** Nothing tracked worth drawing. Say so on the board itself. */
function Empty({ children }: { children: string }) {
  return (
    <g>
      <rect x="18" y="28" width="64" height="10" rx="1.5" fill="var(--ink)" fillOpacity=".72" />
      <text
        x="50"
        y="33"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--cream)"
        fillOpacity=".55"
        fontSize="4.2"
        fontFamily="var(--font-body)"
      >
        {children}
      </text>
    </g>
  );
}

/**
 * Where possession was lost, and how fast the first pressure arrived.
 * Ring colour is the reaction, not the team: quick, late, or none at all.
 */
export function PressureArt({
  losses,
  caption,
  note,
  className,
}: {
  losses: Loss[];
  caption?: string | undefined;
  note?: string | undefined;
  className?: string | undefined;
}) {
  const tone = (seconds: number | null) =>
    seconds === null
      ? "var(--text-faint)"
      : seconds <= 2
        ? "var(--reaction-good)"
        : seconds <= 4
          ? "var(--reaction-warn)"
          : "var(--reaction-bad)";
  const quick = losses.filter((loss) => loss.timeToPress !== null && loss.timeToPress <= 2).length;
  return (
    <Board
      caption={caption}
      note={
        note ??
        (losses.length
          ? `${quick} of ${losses.length} losses got pressure inside two seconds`
          : undefined)
      }
      className={className}
      label={
        losses.length
          ? `Where possession was lost: ${losses.length} tracked moments`
          : "No possession losses carry coordinates"
      }
    >
      {losses.length === 0 && <Empty>No losses carry coordinates</Empty>}
      {losses.map((loss, i) => (
        <g key={`${loss.x}-${loss.y}-${i}`}>
          <circle
            cx={toX(loss.x)}
            cy={toY(loss.y)}
            r="3.6"
            fill="none"
            stroke={tone(loss.timeToPress)}
            strokeOpacity=".5"
            strokeWidth=".6"
          />
          <circle
            cx={toX(loss.x)}
            cy={toY(loss.y)}
            r="1.6"
            fill={tone(loss.timeToPress)}
            stroke="var(--ink)"
            strokeWidth=".5"
          />
        </g>
      ))}
    </Board>
  );
}

/** The defensive block: how long it was front to back, against your own ceiling. */
export function BlockArt({
  metres,
  ceiling,
  caption,
  note,
  className,
}: {
  metres: number | null;
  ceiling?: number | null | undefined;
  caption?: string | undefined;
  note?: string | undefined;
  className?: string | undefined;
}) {
  const over = metres !== null && ceiling != null && metres > ceiling;
  const stroke = over ? "var(--reaction-warn)" : "var(--cream)";
  // A 105 m pitch maps to the 92 units between the goal lines.
  const width = metres === null ? 0 : Math.max(Math.min((metres / 105) * 92, 92), 4);
  const back = 8;
  const front = back + width;
  const ceilingX = ceiling == null ? null : back + Math.min((ceiling / 105) * 92, 92);
  return (
    <Board
      caption={caption}
      note={
        note ??
        (metres === null
          ? "Block length is not in this match file"
          : `${metres} m front to back${ceiling != null ? ` · your ceiling is ${ceiling} m` : ""}`)
      }
      className={className}
      label={
        metres === null
          ? "Block length not available"
          : `Defensive block, ${metres} metres front to back`
      }
    >
      {metres === null ? (
        <Empty>Block length not tracked</Empty>
      ) : (
        <>
          <rect
            x={back}
            y="12"
            width={width}
            height="38"
            fill={stroke}
            fillOpacity=".08"
            stroke={stroke}
            strokeOpacity=".55"
            strokeWidth=".6"
            strokeDasharray="3 2"
          />
          {ceilingX !== null && (
            <>
              <line
                x1={ceilingX}
                y1="9"
                x2={ceilingX}
                y2="53"
                stroke="var(--cream)"
                strokeOpacity=".45"
                strokeWidth=".6"
              />
              <text
                x={ceilingX}
                y="8"
                textAnchor="middle"
                fill="var(--cream)"
                fillOpacity=".55"
                fontSize="3.4"
                fontFamily="var(--font-body)"
              >
                ceiling
              </text>
            </>
          )}
          <line x1={back} y1="57" x2={front} y2="57" stroke={stroke} strokeWidth=".7" />
          <text
            x={(back + front) / 2}
            y="55"
            textAnchor="middle"
            fill={stroke}
            fontSize="5.5"
            fontFamily="var(--font-display)"
            fontStyle="italic"
            fontWeight="800"
          >
            {metres} M
          </text>
        </>
      )}
    </Board>
  );
}

/** Players as shirt numbers. Never names, never a ranking. */
export function ShirtsArt({
  shirts,
  caption,
  note,
  className,
}: {
  shirts: Shirt[];
  caption?: string | undefined;
  note?: string | undefined;
  className?: string | undefined;
}) {
  const step = 100 / (shirts.length + 1);
  return (
    <Board
      caption={caption}
      note={
        note ??
        (shirts.length ? "Shirt numbers from the tracking file. No names are supplied." : undefined)
      }
      className={className}
      label={
        shirts.length
          ? `Players ${shirts.map((shirt) => `number ${shirt.shirt}`).join(", ")}`
          : "No shirt numbers in this file"
      }
    >
      {shirts.length === 0 && <Empty>No shirt numbers in this file</Empty>}
      {shirts.map((shirt, i) => (
        <g key={`${shirt.team}-${shirt.shirt}-${i}`}>
          <circle
            cx={step * (i + 1)}
            cy="28"
            r="8.5"
            fill={TEAM(shirt.team)}
            stroke="var(--ink)"
            strokeWidth=".8"
          />
          <text
            x={step * (i + 1)}
            y="28"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize="8"
            fontFamily="var(--font-body)"
            fontWeight="800"
          >
            {shirt.shirt}
          </text>
          {shirt.note && (
            <text
              x={step * (i + 1)}
              y="45"
              textAnchor="middle"
              fill="var(--cream)"
              fillOpacity=".6"
              fontSize="3.8"
              fontFamily="var(--font-body)"
            >
              {shirt.note}
            </text>
          )}
        </g>
      ))}
    </Board>
  );
}

/** A real tracked frame: where everyone actually stood at one timestamp. */
export function PositionsArt({
  dots,
  carrier,
  target,
  caption,
  note,
  className,
}: {
  dots: Dot[];
  carrier?: { x: number; y: number } | null | undefined;
  target?: { x: number; y: number } | null | undefined;
  caption?: string | undefined;
  note?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <Board
      caption={caption}
      note={note}
      className={className}
      label={
        dots.length
          ? `Tracked player positions, ${dots.length} players on the pitch`
          : "No tracked frame for this moment"
      }
    >
      {dots.length === 0 && <Empty>No tracked frame for this moment</Empty>}
      {carrier && target && (
        <line
          x1={toX(carrier.x)}
          y1={toY(carrier.y)}
          x2={toX(target.x)}
          y2={toY(target.y)}
          stroke="var(--cream)"
          strokeWidth=".9"
          strokeDasharray="3 2"
          strokeLinecap="round"
        />
      )}
      {dots.map((dot, i) => (
        <circle
          key={`${dot.x}-${dot.y}-${i}`}
          cx={toX(dot.x)}
          cy={toY(dot.y)}
          r="1.9"
          fill={TEAM(dot.team)}
          stroke="var(--ink)"
          strokeWidth=".4"
        />
      ))}
    </Board>
  );
}
