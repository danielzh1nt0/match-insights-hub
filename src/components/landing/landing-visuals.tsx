import type { ReactNode } from "react";

/**
 * The diagrams on the landing page.
 *
 * Drawn in SVG rather than shipped as screenshots so they stay in the system's
 * colours, stay sharp at any size, and cannot go stale when the product moves.
 * Every figure on them is one the pipeline really produces — a press time, a
 * block length, a count of moments — because a landing page that invents
 * numbers undercuts the one thing this product promises.
 */

/* ---------------- Frame ---------------- */

/** A diagram with a label strip above it and, where it earns one, below. */
export function Figure({
  label,
  meta,
  footLeft,
  footRight,
  tone = "accent",
  children,
}: {
  label: ReactNode;
  meta?: ReactNode;
  footLeft?: ReactNode;
  footRight?: ReactNode;
  tone?: "accent" | "positive";
  children: ReactNode;
}) {
  return (
    <div className="border border-wire bg-bg">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span
          className={`label-xs truncate ${tone === "positive" ? "text-positive" : "text-accent-sea"}`}
        >
          {label}
        </span>
        {meta && <span className="label-xs shrink-0 text-text-faint">{meta}</span>}
      </div>
      <div className="px-3">{children}</div>
      {(footLeft || footRight) && (
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="label-xs truncate text-text-faint">{footLeft}</span>
          {footRight && <span className="label-xs shrink-0 text-positive">{footRight}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------- Shared pitch furniture ---------------- */

/** Pitch markings at the real 105:68 proportions, in the viewBox 0 0 200 122. */
function PitchLines({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <g stroke="var(--text-faint)" strokeOpacity={opacity} strokeWidth="0.8" fill="none">
      <rect x="4" y="4" width="192" height="114" />
      <line x1="100" y1="4" x2="100" y2="118" />
      <circle cx="100" cy="61" r="16" />
      <rect x="4" y="29" width="26" height="64" />
      <rect x="170" y="29" width="26" height="64" />
      <rect x="4" y="46" width="10" height="30" />
      <rect x="186" y="46" width="10" height="30" />
    </g>
  );
}

/** A shirt on the pitch: our kit outlined, theirs filled. */
function Node({
  x,
  y,
  n,
  kind = "ours",
  r = 5.5,
}: {
  x: number;
  y: number;
  n?: string;
  kind?: "ours" | "theirs" | "ball";
  r?: number;
}) {
  if (kind === "ball") return <circle cx={x} cy={y} r={r * 0.45} fill="#ffffff" />;
  const fill = kind === "ours" ? "var(--bg)" : "var(--reaction-bad)";
  const stroke = kind === "ours" ? "var(--accent)" : "var(--reaction-bad)";
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="1.1" />
      {n && (
        <text
          x={x}
          y={y + 1.9}
          textAnchor="middle"
          fontSize="5"
          fontWeight="700"
          fill={kind === "ours" ? "var(--text-bright)" : "#ffffff"}
        >
          {n}
        </text>
      )}
    </g>
  );
}

/** A small caption pinned to the diagram. */
function Tag({
  x,
  y,
  children,
  tone = "accent",
}: {
  x: number;
  y: number;
  children: string;
  tone?: "accent" | "positive" | "alarm" | "faint";
}) {
  const colour =
    tone === "positive"
      ? "var(--positive)"
      : tone === "alarm"
        ? "var(--reaction-bad)"
        : tone === "faint"
          ? "var(--text-faint)"
          : "var(--accent)";
  return (
    <text
      x={x}
      y={y}
      fontSize="4.2"
      fontWeight="700"
      letterSpacing="0.3"
      fill={colour}
      style={{ textTransform: "uppercase" }}
    >
      {children}
    </text>
  );
}

/* ---------------- Hero: the turnover ---------------- */

/**
 * One turnover, drawn the way the product shows it.
 *
 * Our shape as a block, the pass that went in, the opponent's two players
 * arriving, and the pressure that came two seconds too late.
 */
export function TurnoverFigure() {
  return (
    <Figure
      label={
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
          Positions and pass vectors
        </span>
      }
      meta="Back line 46.2 m"
      footLeft="Ball lost 74 m from our goal"
      footRight="4.2s to their shot"
    >
      <svg
        viewBox="0 0 200 122"
        className="h-auto w-full py-1"
        role="img"
        aria-label="Our block, the pass that broke it, and pressure arriving after two seconds"
      >
        <rect x="4" y="4" width="192" height="114" fill="var(--surface-2)" />
        <PitchLines />

        {/* Our block, as a shape rather than a formation label. */}
        <path
          d="M52 32 L86 30 L84 96 L50 92 Z"
          fill="var(--accent)"
          fillOpacity="0.07"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <Tag x={52} y={108} tone="accent">
          46 m block
        </Tag>

        {/* The ball's last safe route through our own players. */}
        <line x1="50" y1="70" x2="84" y2="48" stroke="var(--accent)" strokeWidth="1.6" />
        <line x1="50" y1="88" x2="88" y2="88" stroke="var(--accent)" strokeWidth="1.6" />
        <line x1="84" y1="48" x2="128" y2="58" stroke="var(--positive)" strokeWidth="2" />

        {/* Where it was given away. */}
        <g stroke="var(--reaction-bad)" strokeWidth="1.8">
          <line x1="104" y1="64" x2="110" y2="70" />
          <line x1="110" y1="64" x2="104" y2="70" />
        </g>

        {/* Their counter. */}
        <path
          d="M86 50 C 104 66, 112 78, 126 92"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="1.4"
          strokeDasharray="4 3"
          markerEnd="url(#arrow-faint)"
        />

        {/* The two-second window, closing too late. */}
        <circle cx={130} cy={58} r="24" fill="var(--positive)" fillOpacity="0.1" />
        <circle
          cx={130}
          cy={58}
          r="24"
          fill="none"
          stroke="var(--positive)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <Tag x={112} y={28} tone="positive">
          pressure at 2.0s
        </Tag>

        <defs>
          <marker id="arrow-faint" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill="var(--text-faint)" />
          </marker>
        </defs>

        <Node x={50} y={70} n="4" />
        <Node x={84} y={48} n="6" />
        <Node x={88} y={88} n="8" />
        <Node x={122} y={46} kind="theirs" />
        <Node x={140} y={70} kind="theirs" />
        <Node x={130} y={58} kind="ball" r={9} />
      </svg>
    </Figure>
  );
}

/* ---------------- Hero: territory ---------------- */

export function TerritoryFigure() {
  return (
    <Figure label="Territory through the match" meta="58% middle third and up">
      <svg
        viewBox="0 0 400 96"
        preserveAspectRatio="none"
        className="h-[92px] w-full py-1"
        role="img"
        aria-label="Territory swung to the opponent before half-time and back after it"
      >
        <defs>
          <linearGradient id="tilt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d="M0 54 C 46 44, 74 42, 104 46 C 150 52, 168 24, 206 22 C 244 20, 262 52, 292 62 C 330 74, 360 56, 400 44 L400 96 L0 96 Z"
          fill="url(#tilt-fill)"
        />
        <path
          d="M0 54 C 46 44, 74 42, 104 46 C 150 52, 168 24, 206 22 C 244 20, 262 52, 292 62 C 330 74, 360 56, 400 44"
          fill="none"
          stroke="var(--cream)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="200"
          y1="0"
          x2="200"
          y2="96"
          stroke="var(--text-faint)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx="206" cy="22" r="4" fill="var(--positive)" />
        <circle cx="292" cy="62" r="4" fill="var(--accent)" />
      </svg>
      <div className="flex justify-between pb-1">
        {["0'", "20'", "45' HT", "70'", "90'"].map((t) => (
          <span key={t} className="num-flat text-[10px] text-text-faint">
            {t}
          </span>
        ))}
      </div>
    </Figure>
  );
}

/* ---------------- Card diagrams ---------------- */

/** The finding: pressure that arrived late, and the space it opened. */
export function TriggerGapFigure() {
  return (
    <Figure label="Delayed press" meta="Target 2.5s · was 4.8s">
      <svg
        viewBox="0 0 200 122"
        className="h-auto w-full py-1"
        role="img"
        aria-label="Pressure arrived 2.3 seconds late, opening the space behind"
      >
        <rect x="4" y="4" width="192" height="114" fill="var(--surface-2)" />
        <PitchLines opacity={0.35} />
        <path
          d="M104 36 L150 44 L146 92 L100 80 Z"
          fill="var(--positive)"
          fillOpacity="0.12"
          stroke="var(--positive)"
          strokeWidth="1.2"
        />
        <Tag x={104} y={110} tone="positive">
          space opened
        </Tag>
        {(
          [
            [104, 36],
            [150, 44],
            [146, 92],
            [100, 80],
          ] as const
        ).map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="4"
            fill="none"
            stroke="var(--positive)"
            strokeWidth="1.4"
          />
        ))}
        <line
          x1="48"
          y1="92"
          x2="78"
          y2="64"
          stroke="var(--reaction-bad)"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
        <Tag x={30} y={58} tone="alarm">
          late by 2.3s
        </Tag>
        <Node x={82} y={60} kind="theirs" />
        <Node x={122} y={64} />
      </svg>
    </Figure>
  );
}

/** A clip, already cued to the second it matters. */
export function ClipFigure() {
  return (
    <Figure
      label={
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-reaction-bad" aria-hidden="true" />
          34:12 · clip 2 of 3
        </span>
      }
      meta="Cued"
      footLeft="Lane open to the inside"
      footRight="18.4 m"
    >
      <svg
        viewBox="0 0 200 122"
        className="h-auto w-full py-1"
        role="img"
        aria-label="The carrier, the free team-mate and the lane between them"
      >
        <rect x="4" y="4" width="192" height="114" fill="var(--surface-2)" />
        <PitchLines opacity={0.3} />
        <path
          d="M62 90 L150 50 L150 84 Z"
          fill="var(--accent)"
          fillOpacity="0.08"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M64 88 C 96 80, 120 62, 148 50"
          fill="none"
          stroke="var(--positive)"
          strokeWidth="2"
        />
        <Tag x={22} y={74} tone="accent">
          carrier 0.9s
        </Tag>
        <Tag x={120} y={38} tone="positive">
          free inside
        </Tag>
        <Node x={64} y={88} />
        <Node x={150} y={50} kind="theirs" />
        <circle
          cx={150}
          cy={50}
          r="14"
          fill="none"
          stroke="var(--positive)"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
      </svg>
    </Figure>
  );
}

/** The same clip with a coach's marks on it. */
export function TelestrationFigure() {
  return (
    <Figure
      label="Coach markup"
      meta="Arrow · circle · line"
      footLeft="Saved as an image to share"
      tone="positive"
    >
      <svg
        viewBox="0 0 200 122"
        className="h-auto w-full py-1"
        role="img"
        aria-label="A player circled and an arrow drawn to the space behind"
      >
        <rect x="4" y="4" width="192" height="114" fill="var(--surface-2)" />
        <PitchLines opacity={0.3} />
        <ellipse
          cx="56"
          cy="82"
          rx="20"
          ry="13"
          fill="none"
          stroke="var(--positive)"
          strokeWidth="2.2"
        />
        <path
          d="M78 76 L146 44"
          stroke="var(--positive)"
          strokeWidth="2.2"
          markerEnd="url(#arrow-pos)"
          fill="none"
        />
        <defs>
          <marker id="arrow-pos" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 z" fill="var(--positive)" />
          </marker>
        </defs>
        <Tag x={116} y={34} tone="positive">
          run +8 m
        </Tag>
        <Node x={56} y={82} n="7" />
        <Node x={104} y={64} kind="theirs" />
      </svg>
    </Figure>
  );
}

/** Tuesday: the finding as a drill on a grid. */
export function DrillFigure() {
  return (
    <Figure label="Drill 2 · 4v4 +3" meta="20 × 25 m · 3 × 4 min" tone="positive">
      <svg
        viewBox="0 0 200 122"
        className="h-auto w-full py-1"
        role="img"
        aria-label="A four against four grid with three neutral players and a finishing sequence"
      >
        <rect
          x="22"
          y="16"
          width="156"
          height="90"
          fill="var(--surface-2)"
          stroke="var(--text-faint)"
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <line
          x1="100"
          y1="16"
          x2="100"
          y2="106"
          stroke="var(--text-faint)"
          strokeOpacity="0.3"
          strokeWidth="0.8"
        />

        {/* Neutral players on the sides, goals at the ends. */}
        {[34, 61, 88].map((y) => (
          <rect key={`l${y}`} x="16" y={y - 7} width="4" height="14" fill="var(--positive)" />
        ))}
        {[34, 61, 88].map((y) => (
          <rect key={`r${y}`} x="180" y={y - 7} width="4" height="14" fill="var(--positive)" />
        ))}
        {(
          [
            [24, 18],
            [174, 18],
            [24, 102],
            [174, 102],
          ] as const
        ).map(([x, y]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y - 5} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z`}
            fill="var(--reaction-bad)"
            fillOpacity="0.7"
          />
        ))}

        {/* The sequence the drill rehearses: pass, trigger, finish. */}
        <path d="M46 84 L84 56" stroke="var(--accent)" strokeWidth="1.8" strokeDasharray="4 3" />
        <path d="M84 56 L130 76" stroke="var(--positive)" strokeWidth="2" />
        <path d="M130 76 L168 58" stroke="var(--cream)" strokeWidth="1.8" />
        <Tag x={50} y={70} tone="accent">
          1 pass
        </Tag>
        <Tag x={96} y={46} tone="alarm">
          2 trigger
        </Tag>
        <Tag x={132} y={92} tone="faint">
          3 finish
        </Tag>

        <Node x={46} y={84} r={5} />
        <Node x={70} y={70} kind="theirs" r={5} />
        <Node x={84} y={56} kind="ball" r={8} />
        <Node x={110} y={62} kind="theirs" r={5} />
        <circle cx={130} cy={76} r="5" fill="var(--positive)" />
      </svg>
    </Figure>
  );
}
