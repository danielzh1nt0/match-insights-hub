import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { pitchSize, type TeamKey } from "@/lib/match-analysis";
import type { Frame, FramePlayer, Lane, MatchDataFile } from "@/lib/match-source";

export type LayerKey =
  | "players"
  | "ball"
  | "carrier"
  | "shapes"
  | "lanes"
  | "line"
  | "units"
  | "block"
  | "trails"
  | "space";

/** needs: which ball reliability the layer depends on (null = positions only). */
export const LAYERS: { key: LayerKey; label: string; needs: null | "possession" | "events" }[] = [
  { key: "players", label: "Players", needs: null },
  { key: "line", label: "Defensive line", needs: null },
  { key: "units", label: "Unit lines", needs: null },
  { key: "block", label: "Block box", needs: null },
  { key: "shapes", label: "Team shapes", needs: null },
  { key: "trails", label: "Sprint trails", needs: null },
  { key: "space", label: "Space control", needs: null },
  { key: "ball", label: "Ball", needs: "possession" },
  { key: "carrier", label: "Ball carrier", needs: "possession" },
  { key: "lanes", label: "Passing lanes", needs: "events" },
];

export const NO_LAYERS: Record<LayerKey, boolean> = {
  players: false, ball: false, carrier: false, shapes: false, lanes: false,
  line: false, units: false, block: false, trails: false, space: false,
};

export type PresetKey = "clean" | "defending" | "building" | "transitions";

export const PRESETS: { key: PresetKey; label: string; layers: LayerKey[] }[] = [
  { key: "clean", label: "Clean", layers: ["players"] },
  { key: "defending", label: "Defending", layers: ["players", "line", "units"] },
  { key: "building", label: "Building up", layers: ["players", "carrier", "lanes"] },
  { key: "transitions", label: "Transitions", layers: ["players", "trails", "carrier"] },
];

export function presetLayers(key: PresetKey): Record<LayerKey, boolean> {
  const preset = PRESETS.find((p) => p.key === key);
  const next = { ...NO_LAYERS };
  for (const layer of preset?.layers ?? ["players"]) next[layer] = true;
  return next;
}

const TRAIL_S = 1.0;
const SPRINT_MS = 5.5;
const SPACE_CELL_M = 3;

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
  // no frame within a second of the video's time (e.g. that part of a full match is still loading): draw nothing
  if (t < before.t - 1 || t > after.t + 1 || (t - before.t > 1 && after.t - t > 1)) return null;
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
    const seenAt = hasPair ? t : bracket.before.t;
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

/** 1-D k-means with k=3 on attack-relative x; returns groups sorted from own goal outward. */
function threeUnits(xs: number[]): number[][] {
  const sorted = [...xs].sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(f * (sorted.length - 1))))] ?? 0;
  let c = [q(0.2), q(0.5), q(0.8)];
  let groups: number[][] = [[], [], []];
  for (let it = 0; it < 12; it++) {
    groups = [[], [], []];
    for (const x of sorted) {
      let best = 0;
      for (let k = 1; k < 3; k++) if (Math.abs(x - (c[k] ?? 0)) < Math.abs(x - (c[best] ?? 0))) best = k;
      groups[best]?.push(x);
    }
    c = groups.map((g, k) => (g.length ? g.reduce((a, b) => a + b, 0) / g.length : c[k] ?? 0));
  }
  return groups.filter((g) => g.length > 0);
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

/* Canvas can't read CSS variables (e.g. "var(--club-bvb)"): an unreadable colour is silently ignored and the previous
   fill is reused, which painted whole areas opaque cream. Colours are resolved to real rgb values before drawing. */
let colourProbe: CanvasRenderingContext2D | null = null;
const rgbCache = new Map<string, [number, number, number]>();
function cssColour(colour: string): string {
  let c = colour.trim();
  for (let i = 0; i < 3; i++) {
    const m = c.match(/^var\(\s*(--[^,\s)]+)\s*(?:,\s*([^)]+))?\)$/);
    if (!m || typeof document === "undefined") break;
    const v = getComputedStyle(document.documentElement).getPropertyValue(m[1] ?? "").trim();
    c = v || (m[2] ?? "").trim() || "#ede6d6";
  }
  return c;
}
function rgbOf(colour: string): [number, number, number] {
  const hit = rgbCache.get(colour);
  if (hit) return hit;
  const c = cssColour(colour);
  let rgb: [number, number, number] = [237, 230, 214];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const h = hex[1] ?? "";
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    rgb = [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  } else if (typeof document !== "undefined") {
    colourProbe ??= document.createElement("canvas").getContext("2d");
    if (colourProbe) {
      colourProbe.fillStyle = "#010203";
      colourProbe.fillStyle = c;
      const out = String(colourProbe.fillStyle);
      const h6 = /^#([0-9a-f]{6})$/i.exec(out);
      const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(out);
      if (h6 && out !== "#010203") rgb = [parseInt(out.slice(1, 3), 16), parseInt(out.slice(3, 5), 16), parseInt(out.slice(5, 7), 16)];
      else if (rgba) rgb = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
    }
  }
  rgbCache.set(colour, rgb);
  return rgb;
}
function solidColour(colour: string) {
  const [r, g, b] = rgbOf(colour);
  return `rgb(${r},${g},${b})`;
}
function withAlpha(colour: string, alpha: number) {
  const [r, g, b] = rgbOf(colour);
  return `rgba(${r},${g},${b},${alpha})`;
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
    const trails = new Map<number, { t: number; m: Point }[]>();
    // eased per-team overlay geometry, so lines glide instead of jumping when players enter or leave the shot
    const eased = new Map<string, number>();
    const ease = (key: string, target: number, t: number, rate = 3.0) => {
      const prev = eased.get(key);
      const lastT = eased.get(`${key}@t`) ?? t;
      const dt = Math.max(0, Math.min(0.25, t - lastT));
      const value = prev === undefined ? target : prev + (target - prev) * (1 - Math.exp(-rate * dt));
      eased.set(key, value);
      eased.set(`${key}@t`, t);
      return value;
    };
    let spaceCache: { t: number; cells: { x: number; y: number; team: TeamKey }[] } | null = null;

    const resetTemporalState = (time: number, data: MatchDataFile | undefined) => {
      players.clear();
      trails.clear();
      eased.clear();
      spaceCache = null;
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
      const teamColour = (key: TeamKey) => solidColour(key === "B" ? cfg.colours.B : cfg.colours.A);
      const visible = drawnPlayers.filter((player) => (cfg.team ? player.team === cfg.team : true));

      const stroke = Math.max(1.5, rect.height / 400);
      const label = (text: string, x: number, y: number, colour = "#ede6d6") => {
        ctx.font = `600 ${Math.max(11, Math.round(rect.height / 55))}px Inter, sans-serif`;
        ctx.textAlign = "center";
        const w = ctx.measureText(text).width + 10;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x - w / 2, y - 14, w, 18);
        ctx.fillStyle = colour;
        ctx.fillText(text, x, y);
      };
      const segment = (a: Point, b: Point, colour: string, width: number, dash: number[] = []) => {
        const pa = metres(a);
        const pb = metres(b);
        if (!pa || !pb) return null;
        ctx.beginPath();
        ctx.setLineDash(dash);
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.setLineDash([]);
        return [pa, pb] as [Point, Point];
      };
      const teamsShown: TeamKey[] = cfg.team ? [cfg.team] : ["A", "B"];
      const attacksRight = (key: TeamKey) => data.attack_right?.[key] ?? key === "A";
      const outfield = (key: TeamKey) => drawnPlayers.filter((p) => p.team === key && !p.gk);

      // trails: remember the last second of each player's position
      if (cfg.layers.trails) {
        for (const p of drawnPlayers) {
          const list = trails.get(p.id) ?? [];
          list.push({ t, m: p.m });
          while (list.length && (list[0]?.t ?? t) < t - TRAIL_S) list.shift();
          trails.set(p.id, list);
        }
      }

      if (cfg.layers.space) {
        if (!spaceCache || Math.abs(t - spaceCache.t) > 0.1) {
          const pts = drawnPlayers.filter((p) => !p.gk);
          const cells: { x: number; y: number; team: TeamKey }[] = [];
          if (pts.length >= 6) {
            for (let x = 0; x < length; x += SPACE_CELL_M) {
              for (let y = 0; y < width; y += SPACE_CELL_M) {
                const cx = x + SPACE_CELL_M / 2;
                const cy = y + SPACE_CELL_M / 2;
                let best: DrawnPlayer | null = null;
                let bd = Infinity;
                for (const p of pts) {
                  const d = (p.m[0] - cx) ** 2 + (p.m[1] - cy) ** 2;
                  if (d < bd) { bd = d; best = p; }
                }
                if (best) cells.push({ x, y, team: best.team });
              }
            }
          }
          spaceCache = { t, cells };
        }
        for (const cell of spaceCache.cells) {
          if (cfg.team && cell.team !== cfg.team) continue;
          const corners: Point[] = [
            [cell.x, cell.y],
            [Math.min(length, cell.x + SPACE_CELL_M), cell.y],
            [Math.min(length, cell.x + SPACE_CELL_M), Math.min(width, cell.y + SPACE_CELL_M)],
            [cell.x, Math.min(width, cell.y + SPACE_CELL_M)],
          ];
          const pts = corners.map(metres);
          if (pts.some((q) => !q)) continue;
          ctx.beginPath();
          (pts as Point[]).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = withAlpha(teamColour(cell.team), 0.18);
          ctx.fill();
        }
        label("Approximate space control", rect.width / 2, rect.height - 10);
      }

      if (cfg.layers.block) {
        for (const key of teamsShown) {
          const ps = outfield(key);
          if (ps.length < 5) continue;
          const xs = ps.map((p) => p.m[0]);
          const ys = ps.map((p) => p.m[1]);
          const x0 = ease(`box${key}x0`, Math.min(...xs), t), x1 = ease(`box${key}x1`, Math.max(...xs), t);
          const y0 = ease(`box${key}y0`, Math.min(...ys), t), y1 = ease(`box${key}y1`, Math.max(...ys), t);
          const corners = ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as Point[]).map(metres);
          if (corners.some((q) => !q)) continue;
          ctx.beginPath();
          (corners as Point[]).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = withAlpha(teamColour(key), 0.1);
          ctx.fill();
          ctx.strokeStyle = withAlpha(teamColour(key), 0.8);
          ctx.lineWidth = stroke;
          ctx.stroke();
          const top = metres([(x0 + x1) / 2, y0]);
          if (top) label(`Length ${Math.round(x1 - x0)} m · Width ${Math.round(y1 - y0)} m`, top[0], top[1] - 6);
        }
      }

      if (cfg.layers.units) {
        for (const key of teamsShown) {
          const ps = outfield(key);
          if (ps.length < 6) {
            if (cfg.team) label("Not enough players in view for unit lines", rect.width / 2, 26);
            continue;
          }
          const right = attacksRight(key);
          const rel = (x: number) => (right ? x : length - x);
          const groups = threeUnits(ps.map((p) => rel(p.m[0])));
          if (groups.length < 3) continue;
          const means: number[] = [];
          groups.forEach((g, gi) => {
            const meanRel = ease(`unit${key}${gi}`, g.reduce((a, b) => a + b, 0) / g.length, t, 2.0);
            means.push(meanRel);
            const members = ps.filter((p) => g.includes(rel(p.m[0])));
            const ys = members.map((p) => p.m[1]);
            const yA = ease(`unit${key}${gi}ya`, Math.min(...ys) - 1.5, t, 2.0);
            const yB = ease(`unit${key}${gi}yb`, Math.max(...ys) + 1.5, t, 2.0);
            const x = right ? meanRel : length - meanRel;
            segment([x, yA], [x, yB], withAlpha(teamColour(key), 0.9), stroke * 1.5);
          });
          for (let i = 1; i < means.length; i++) {
            const a = means[i - 1] ?? 0, b = means[i] ?? 0;
            const mid = (a + b) / 2;
            const pos = metres([right ? mid : length - mid, width * 0.08]);
            if (pos) label(`gap ${Math.round(b - a)} m`, pos[0], pos[1]);
          }
        }
      }

      if (cfg.layers.line) {
        for (const key of teamsShown) {
          const ps = outfield(key);
          if (ps.length < 3) continue;
          const right = attacksRight(key);
          const xs = ps.map((p) => p.m[0]);
          const lineX = ease(`line${key}`, right ? Math.min(...xs) : Math.max(...xs), t, 2.5);
          const opp: TeamKey = key === "A" ? "B" : "A";
          // "in behind" only counts with a 1 m margin, and only when the team shown is the one defending
          const beyond = cfg.team
            ? drawnPlayers.filter((p) => p.team === opp && !p.gk && (right ? p.m[0] < lineX - 1 : p.m[0] > lineX + 1))
            : [];
          segment([lineX, 0], [lineX, width], withAlpha(teamColour(key), 0.95), stroke * 2);
          const height = right ? lineX : length - lineX;
          const near = metres([lineX, width * 0.94]);
          if (near) label(`Line ${Math.round(height)} m${beyond.length ? ` · ${beyond.length} in behind` : ""}`, near[0], near[1]);
          for (const p of beyond) {
            const q = at(p);
            if (!q) continue;
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.arc(q[0], q[1], Math.max(7, rect.height * 0.02), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(237,230,214,0.85)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      if (cfg.layers.trails) {
        for (const p of visible) {
          const list = trails.get(p.id);
          if (!list || list.length < 3) continue;
          const first = list[0];
          const last = list[list.length - 1];
          if (!first || !last) continue;
          const dt = last.t - first.t;
          if (dt <= 0.2) continue;
          const speed = Math.hypot(last.m[0] - first.m[0], last.m[1] - first.m[1]) / dt;
          if (speed < 1.0) continue;
          const sprint = speed >= SPRINT_MS;
          const pts = list.map((e) => metres(e.m));
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.strokeStyle = sprint ? withAlpha(teamColour(p.team), (0.7 * i) / pts.length) : `rgba(237,230,214,${(0.45 * i) / pts.length})`;
            ctx.lineWidth = sprint ? stroke * 2 : stroke;
            ctx.stroke();
          }
        }
      }

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

      const carrierFound = carrier.id === null ? null : players.get(carrier.id) ?? null;
      const carrierPlayer = carrierFound && (!cfg.team || carrierFound.team === cfg.team) ? carrierFound : null;
      const carrierAt = carrierPlayer ? at(carrierPlayer) : null;
      const carrierStable = carrier.id !== null && t - carrier.stableSince >= LANE_STABLE_S;
      if (cfg.layers.lanes && carrierStable && carrierAt) {
        for (const lane of carrier.lanes) {
          const target = players.get(lane.to);
          if (!target) continue;
          const to = at(target);
          if (!to) continue;
          ctx.beginPath();
          ctx.setLineDash(lane.open ? [] : [4, 4]);
          ctx.moveTo(carrierAt[0], carrierAt[1]);
          ctx.lineTo(to[0], to[1]);
          // open lanes in the semantic green; closed lanes dashed cream, never red (red can be a team colour)
          ctx.strokeStyle = lane.open ? "rgba(29,158,117,0.9)" : "rgba(237,230,214,0.35)";
          ctx.lineWidth = lane.forward ? 3 : 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
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
