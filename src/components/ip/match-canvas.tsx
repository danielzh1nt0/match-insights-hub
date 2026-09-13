import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { frameAt, pitchSize, type TeamKey } from "@/lib/match-analysis";
import type { Frame, MatchDataFile } from "@/lib/match-source";

export type LayerKey = "players" | "ball" | "carrier" | "shapes" | "lanes";

export const LAYERS: { key: LayerKey; label: string }[] = [
  { key: "players", label: "Players" },
  { key: "ball", label: "Ball" },
  { key: "carrier", label: "Ball carrier" },
  { key: "shapes", label: "Team shapes" },
  { key: "lanes", label: "Passing lanes" },
];

/** Project metres to pixels with the frame's 3x3 homography (row-major). */
function project(H: number[] | null | undefined, x: number, y: number) {
  if (!H || H.length < 9) return null;
  const u = H[0]! * x + H[1]! * y + H[2]!;
  const v = H[3]! * x + H[4]! * y + H[5]!;
  const w = H[6]! * x + H[7]! * y + H[8]!;
  if (w <= 0) return null;
  return [u / w, v / w] as [number, number];
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

/**
 * The layer canvas. In "video" mode it draws the pipeline's pixel positions on
 * top of the video; in "pitch" mode it draws the same frame in metres on a
 * plain pitch. Everything comes from the frame — nothing is invented here.
 */
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
      const frame = frameAt(data.frames ?? [], t);
      if (frame !== lastFrame) {
        lastFrame = frame;
        cfg.onFrame?.(frame);
      }
      if (!frame) return;

      const { length, width } = pitchSize(data, undefined);

      /* mapping from data space to canvas space */
      let map: (p: [number, number]) => [number, number] | null;
      let metres: (m: [number, number]) => [number, number] | null;

      if (cfg.mode === "video") {
        const video = videoRef.current;
        const vw = video?.videoWidth || data.width || 1920;
        const vh = video?.videoHeight || data.height || 1080;
        // the video is object-contain: work out the letterboxed rectangle
        const scale = Math.min(rect.width / vw, rect.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const ox = (rect.width - dw) / 2;
        const oy = (rect.height - dh) / 2;
        const sx = dw / (data.width || vw);
        const sy = dh / (data.height || vh);
        map = (p) => [ox + p[0] * sx, oy + p[1] * sy];
        metres = (m) => {
          const px = project(frame.pitch_lines, m[0], m[1]);
          return px ? map(px) : null;
        };
      } else {
        map = () => null;
        metres = (m) => [
          (Math.max(0, Math.min(length, m[0])) / length) * rect.width,
          (Math.max(0, Math.min(width, m[1])) / width) * rect.height,
        ];
        // plain pitch markings
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

      const at = (p: { m: [number, number]; px: [number, number] | null }) =>
        cfg.mode === "video" ? (p.px ? map(p.px) : null) : metres(p.m);

      const teamColour = (key: string) => (key === "B" ? cfg.colours.B : cfg.colours.A);
      const visible = frame.players.filter((p) => (cfg.team ? p.team === cfg.team : true));

      /* team shapes — the hull comes from the pipeline */
      if (cfg.layers.shapes && frame.shape) {
        for (const key of ["A", "B"] as TeamKey[]) {
          if (cfg.team && key !== cfg.team) continue;
          const hull = frame.shape[key]?.hull_m ?? [];
          if (hull.length < 3) continue;
          const points = hull.map((m) => metres(m)).filter((p): p is [number, number] => p !== null);
          if (points.length < 3) continue;
          ctx.beginPath();
          points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.fillStyle = withAlpha(teamColour(key), 0.12);
          ctx.fill();
          ctx.strokeStyle = withAlpha(teamColour(key), 0.55);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      /* passing lanes */
      const carrier = frame.players.find((p) => p.id === frame.carrier) ?? null;
      const carrierAt = carrier ? at(carrier) : null;
      if (cfg.layers.lanes && carrierAt && frame.lanes) {
        for (const lane of frame.lanes) {
          const target = frame.players.find((p) => p.id === lane.to);
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

      /* players */
      if (cfg.layers.players) {
        for (const p of visible) {
          if (p.state === "stale") continue;
          const point = at(p);
          if (!point) continue;
          const r = Math.max(4, rect.height * 0.014);
          ctx.globalAlpha = p.state === "predicted" ? 0.45 : 1;
          ctx.beginPath();
          ctx.ellipse(point[0], point[1], r, r * 0.85, 0, 0, Math.PI * 2);
          ctx.fillStyle = teamColour(p.team);
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.stroke();
          if (p.state === "predicted") {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.arc(point[0], point[1], r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.globalAlpha = 1;
          if (p.gk) {
            ctx.font = `700 ${Math.round(r * 1.3)}px Inter, sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.textAlign = "center";
            ctx.fillText("GK", point[0], point[1] - r - 4);
          }
        }
      }

      /* ball carrier ring + HUD */
      if (cfg.layers.carrier && carrierAt) {
        const r = Math.max(7, rect.height * 0.022);
        ctx.beginPath();
        ctx.arc(carrierAt[0], carrierAt[1], r, 0, Math.PI * 2);
        ctx.strokeStyle = "var(--cream)";
        ctx.strokeStyle = "#ede6d6";
        ctx.lineWidth = 2;
        ctx.stroke();
        const bits: string[] = [];
        if (typeof frame.pressure_m === "number") bits.push(`${frame.pressure_m.toFixed(1)} m pressure`);
        if (typeof frame.near_opps === "number") bits.push(`${frame.near_opps} near`);
        if (bits.length) {
          ctx.font = "600 11px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          const text = bits.join(" · ");
          const w = ctx.measureText(text).width + 10;
          ctx.fillRect(8, 8, w, 20);
          ctx.fillStyle = "#ede6d6";
          ctx.fillText(text, 13, 22);
        }
      }

      /* ball */
      if (cfg.layers.ball && frame.ball) {
        const point =
          cfg.mode === "video"
            ? frame.ball.px
              ? map(frame.ball.px as [number, number])
              : null
            : frame.ball.m
              ? metres(frame.ball.m as [number, number])
              : null;
        if (point) {
          const r = Math.max(3, rect.height * 0.009);
          ctx.beginPath();
          ctx.arc(point[0], point[1], r, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#111315";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
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
