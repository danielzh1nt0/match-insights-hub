import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { pitchSize, type TeamKey } from "@/lib/match-analysis";
import type { Frame, FramePlayer, Lane, MatchDataFile } from "@/lib/match-source";

export type LayerKey = "players" | "ball" | "carrier" | "shapes" | "lanes";

export const LAYERS: { key: LayerKey; label: string }[] = [
  { key: "players", label: "Players" },
  { key: "ball", label: "Ball" },
  { key: "carrier", label: "Ball carrier" },
  { key: "shapes", label: "Team shapes" },
  { key: "lanes", label: "Passing lanes" },
];

const PLAYER_HOLD_S = 0.4;
const BALL_HOLD_S = 0.3;
const CARRIER_HOLD_S = 0.1;
const LANE_STABLE_S = 0.3;
const SMOOTHING_ALPHA = 0.5;
const SEEK_RESET_S = 0.75;

type Point = [number, number];

type DrawnPlayer = {
  id: number;
  team: TeamKey;
  gk: boolean;
  m: Point;
  px: Point | null;
  lastSeen: number;
  sourcePredicted: boolean;
  gapPredicted: boolean;
};

type DrawnBall = {
  m: Point | null;
  px: Point | null;
  lastSeen: number;
  gapPredicted: boolean;
};

type CarrierMemory = {
  id: number | null;
  stableSince: number;
  lastSeen: number;
  lanes: Lane[];
};

type FrameBracket = {
  before: Frame;
  after: Frame;
  mix: number;
};

function frameBracket(frames: Frame[], t: number): FrameBracket | null {
  if (frames.length === 0) return null;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const frame = frames[mid];
    if (frame && frame.t <= t) lo = mid;
    else hi = mid - 1;
  }
  const before = frames[lo];
  const after = frames[Math.min(lo + 1, frames.length - 1)];
  if (!before || !after) return null;
  const span = after.t - before.t;
  return {
    before,
    after,
    mix: span > 0 ? Math.max(0, Math.min(1, (t - before.t) / span)) : 0,
  };
}

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount];
}

function smoothPoint(previous: Point | null, target: Point | null): Point | null {
  if (!target) return previous;
  return previous ? lerpPoint(previous, target, SMOOTHING_ALPHA) : target;
}

function validPlayer(player: FramePlayer | undefined): player is FramePlayer {
  return Boolean(player && player.state !== "stale");
}

function interpolatePlayers(
  bracket: FrameBracket,
  t: number,
  memory: Map<number, DrawnPlayer>,
): DrawnPlayer[] {
  const afterById = new Map(bracket.after.players.map((player) => [player.id, player]));
  const seen = new Set<number>();

  for (const beforePlayer of bracket.before.players) {
    if (!validPlayer(beforePlayer)) continue;
    const afterPlayer = afterById.get(beforePlayer.id);
    const hasPair = validPlayer(afterPlayer);
    const existing = memory.get(beforePlayer.id);

    // A marker must survive into the next data frame before it first appears.
    if (!existing && !hasPair) continue;

    const targetM = hasPair ? lerpPoint(beforePlayer.m, afterPlayer.m, bracket.mix) : beforePlayer.m;
    const targetPx =
      hasPair && beforePlayer.px && afterPlayer.px
        ? lerpPoint(beforePlayer.px, afterPlayer.px, bracket.mix)
        : beforePlayer.px;
    const seenAt = hasPair ? t : beforePlayer.t ?? bracket.before.t;
    const smoothedM = smoothPoint(existing?.m ?? null, targetM);
    if (!smoothedM) continue;

    memory.set(beforePlayer.id, {
      id: beforePlayer.id,
      team: beforePlayer.team,
      gk: beforePlayer.gk || (hasPair && afterPlayer.gk),
      m: smoothedM,
      px: smoothPoint(existing?.px ?? null, targetPx),
      lastSeen: seenAt,
      sourcePredicted:
        beforePlayer.state === "predicted" || (hasPair && afterPlayer.state === "predicted"),
      gapPredicted: !hasPair,
    });
    seen.add(beforePlayer.id);
  }

  for (const [id, player] of memory) {
    if (!seen.has(id)) player.gapPredicted = true;
    if (t - player.lastSeen > PLAYER_HOLD_S) memory.delete(id);
  }

  return Array.from(memory.values());
}

function interpolateBall(
  bracket: FrameBracket,
  t: number,
  previous: DrawnBall | null,
): DrawnBall | null {
  const before = bracket.before.ball;
  const after = bracket.after.ball;
  const beforeM = before?.m ?? null;
  const afterM = after?.m ?? null;
  const beforePx = before?.px ?? null;
  const afterPx = after?.px ?? null;
  const pairedM = Boolean(beforeM && afterM);
  const pairedPx = Boolean(beforePx && afterPx);
  const hasBefore = Boolean(beforeM || beforePx);
  const hasPair = pairedM || pairedPx;

  if (hasBefore && (previous || hasPair)) {
    const targetM = pairedM && beforeM && afterM ? lerpPoint(beforeM, afterM, bracket.mix) : beforeM;
    const targetPx = pairedPx && beforePx && afterPx ? lerpPoint(beforePx, afterPx, bracket.mix) : beforePx;
    return {
      m: smoothPoint(previous?.m ?? null, targetM),
      px: smoothPoint(previous?.px ?? null, targetPx),
      lastSeen: hasPair ? t : bracket.before.t,
      gapPredicted: !hasPair,
    };
  }

  if (previous && t - previous.lastSeen <= BALL_HOLD_S) {
    return { ...previous, gapPredicted: true };
  }
  return null;
}

function updateCarrier(
  bracket: FrameBracket,
  t: number,
  previous: CarrierMemory,
): CarrierMemory {
  const candidate = bracket.before.carrier ?? null;
  if (candidate === previous.id && candidate !== null) {
    return {
      id: candidate,
      stableSince: previous.stableSince,
      lastSeen: t,
      lanes: bracket.before.lanes ?? previous.lanes,
    };
  }
  if (candidate !== null) {
    return {
      id: candidate,
      stableSince: t,
      lastSeen: t,
      lanes: bracket.before.lanes ?? [],
    };
  }
  if (previous.id !== null && t - previous.lastSeen <= CARRIER_HOLD_S) return previous;
  return { id: null, stableSince: t, lastSeen: t, lanes: [] };
}

function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (origin: Point, a: Point, b: Point) =>
    (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2) {
      const a = lower[lower.length - 2];
      const b = lower[lower.length - 1];
      if (!a || !b || cross(a, b, point) > 0) break;
      lower.pop();
    }
    lower.push(point);
  }
  const upper: Point[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    if (!point) continue;
    while (upper.length >= 2) {
      const a = upper[upper.length - 2];
      const b = upper[upper.length - 1];
      if (!a || !b || cross(a, b, point) > 0) break;
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Project metres to pixels with the frame's 3x3 homography (row-major). */
function project(H: number[] | null | undefined, x: number, y: number) {
  if (!H || H.length < 9) return null;
  const h0 = H[0] ?? 0;
  const h1 = H[1] ?? 0;
  const h2 = H[2] ?? 0;
  const h3 = H[3] ?? 0;
  const h4 = H[4] ?? 0;
  const h5 = H[5] ?? 0;
  const h6 = H[6] ?? 0;
  const h7 = H[7] ?? 0;
  const h8 = H[8] ?? 0;
  const u = h0 * x + h1 * y + h2;
  const v = h3 * x + h4 * y + h5;
  const w = h6 * x + h7 * y + h8;
  if (w <= 0) return null;
  return [u / w, v / w] as Point;
}

function withAlpha(colour: string, alpha: number) {
  const hex = colour.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return colour;
}

/** Draws interpolated match data with short renderer-only dropout protection. */
export function MatchCanvas({
  file,
  videoRef,
  team,
  colours,
  layers,
  mode,
  onFrame,
}: {
  file: MatchDataFile | undefined;
  videoRef: RefObject<HTMLVideoElement | null>;
  team: TeamKey | null;
  colours: { A: string; B: string };
  layers: Record<LayerKey, boolean>;
  mode: "video" | "pitch";
  onFrame?: (frame: Frame | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ file, team, colours, layers, mode, onFrame });
  state.current = { file, team, colours, layers, mode, onFrame };

  useEffect(() => {
    let raf = 0;
    let lastFrame: Frame | null = null;
    let lastTime: number | null = null;
    let lastFile: MatchDataFile | undefined;
    const players = new Map<number, DrawnPlayer>();
    let ball: DrawnBall | null = null;
    let carrier: CarrierMemory = { id: null, stableSince: 0, lastSeen: 0, lanes: [] };

    const resetTemporalState = (time: number, data: MatchDataFile | undefined) => {
      players.clear();
      ball = null;
      carrier = { id: null, stableSince: time, lastSeen: time, lanes: [] };
      lastTime = time;
      lastFile = data;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const cfg = state.current;
      const data = cfg.file;
      if (!canvas || !data) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(rect.width * dpr)) canvas.width = Math.round(rect.width * dpr);
      if (canvas.height !== Math.round(rect.height * dpr)) canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const t = videoRef.current?.currentTime ?? 0;
      if (
        lastFile !== data ||
        lastTime === null ||
        t < lastTime - 0.05 ||
        Math.abs(t - lastTime) > SEEK_RESET_S
      ) {
        resetTemporalState(t, data);
      }
      lastTime = t;

      const bracket = frameBracket(data.frames ?? [], t);
      if (!bracket) return;
      if (bracket.before !== lastFrame) {
        lastFrame = bracket.before;
        cfg.onFrame?.(bracket.before);
      }

      const drawnPlayers = interpolatePlayers(bracket, t, players);
      ball = interpolateBall(bracket, t, ball);
      carrier = updateCarrier(bracket, t, carrier);
      const { length, width } = pitchSize(data, undefined);

      let map: (point: Point) => Point;
      let metres: (point: Point) => Point | null;

      if (cfg.mode === "video") {
        const video = videoRef.current;
        const vw = video?.videoWidth || data.width || 1920;
        const vh = video?.videoHeight || data.height || 1080;
        const scale = Math.min(rect.width / vw, rect.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const ox = (rect.width - dw) / 2;
        const oy = (rect.height - dh) / 2;
        const sx = dw / (data.width || vw);
        const sy = dh / (data.height || vh);
        map = (point) => [ox + point[0] * sx, oy + point[1] * sy];
        metres = (point) => {
          const px = project(bracket.before.pitch_lines, point[0], point[1]);
          return px ? map(px) : null;
        };
      } else {
        map = (point) => point;
        metres = (point) => [
          (Math.max(0, Math.min(length, point[0])) / length) * rect.width,
          (Math.max(0, Math.min(width, point[1])) / width) * rect.height,
        ];
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);
        ctx.beginPath();
        ctx.moveTo(rect.width / 2, 0);
        ctx.lineTo(rect.width / 2, rect.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rect.width / 2, rect.height / 2, rect.height * 0.13, 0, Math.PI * 2);
        ctx.stroke();
      }

      const at = (player: DrawnPlayer) =>
        cfg.mode === "video" ? (player.px ? map(player.px) : null) : metres(player.m);
      const teamColour = (key: TeamKey) => (key === "B" ? cfg.colours.B : cfg.colours.A);
      const visible = drawnPlayers.filter((player) => (cfg.team ? player.team === cfg.team : true));

      if (cfg.layers.shapes) {
        for (const key of ["A", "B"] as TeamKey[]) {
          if (cfg.team && key !== cfg.team) continue;
          const teamPlayers = visible.filter((player) => player.team === key);
          if (teamPlayers.length < 4) continue;
          const hull = convexHull(teamPlayers.map((player) => player.m));
          const points = hull.map(metres).filter((point): point is Point => point !== null);
          if (points.length < 3) continue;
          ctx.beginPath();
          points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = withAlpha(teamColour(key), 0.12);
          ctx.fill();
          ctx.strokeStyle = withAlpha(teamColour(key), 0.55);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      const carrierPlayer = carrier.id === null ? null : players.get(carrier.id) ?? null;
      const carrierAt = carrierPlayer ? at(carrierPlayer) : null;
      const carrierStable = carrier.id !== null && t - carrier.stableSince >= LANE_STABLE_S;
      if (cfg.layers.lanes && carrierStable && carrierAt) {
        for (const lane of carrier.lanes) {
          const target = players.get(lane.to);
          if (!target) continue;
          const to = at(target);
          if (!to) continue;
          ctx.beginPath();
          ctx.moveTo(carrierAt[0], carrierAt[1]);
          ctx.lineTo(to[0], to[1]);
          ctx.strokeStyle = lane.open ? "rgba(52,211,153,0.85)" : "rgba(239,68,68,0.75)";
          ctx.lineWidth = lane.forward ? 3 : 1.5;
          ctx.stroke();
        }
      }

      if (cfg.layers.players) {
        for (const player of visible) {
          const point = at(player);
          if (!point) continue;
          const predicted = player.sourcePredicted || player.gapPredicted;
          const radius = Math.max(4, rect.height * 0.014);
          ctx.globalAlpha = player.gapPredicted ? 0.6 : player.sourcePredicted ? 0.45 : 1;
          ctx.beginPath();
          ctx.ellipse(point[0], point[1], radius, radius * 0.85, 0, 0, Math.PI * 2);
          ctx.fillStyle = teamColour(player.team);
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.stroke();
          if (predicted) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.arc(point[0], point[1], radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.globalAlpha = 1;
          if (player.gk) {
            ctx.font = `700 ${Math.round(radius * 1.3)}px Inter, sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.textAlign = "center";
            ctx.fillText("GK", point[0], point[1] - radius - 4);
          }
        }
      }

      if (cfg.layers.carrier && carrierAt) {
        const radius = Math.max(7, rect.height * 0.022);
        ctx.beginPath();
        ctx.arc(carrierAt[0], carrierAt[1], radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#ede6d6";
        ctx.lineWidth = 2;
        ctx.stroke();
        const bits: string[] = [];
        if (typeof bracket.before.pressure_m === "number") {
          bits.push(`${bracket.before.pressure_m.toFixed(1)} m pressure`);
        }
        if (typeof bracket.before.near_opps === "number") bits.push(`${bracket.before.near_opps} near`);
        if (bits.length) {
          ctx.font = "600 11px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          const text = bits.join(" · ");
          const boxWidth = ctx.measureText(text).width + 10;
          ctx.fillRect(8, 8, boxWidth, 20);
          ctx.fillStyle = "#ede6d6";
          ctx.fillText(text, 13, 22);
        }
      }

      if (cfg.layers.ball && ball) {
        const point = cfg.mode === "video" ? (ball.px ? map(ball.px) : null) : ball.m ? metres(ball.m) : null;
        if (point) {
          const radius = Math.max(3, rect.height * 0.009);
          ctx.globalAlpha = ball.gapPredicted ? 0.6 : 1;
          ctx.beginPath();
          ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#111315";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      players.clear();
    };
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Player, ball and team shape layers drawn from the match data"
      role="img"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
