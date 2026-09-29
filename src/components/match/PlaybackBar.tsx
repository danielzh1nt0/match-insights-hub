import React from "react";
import { Maximize2, Pause, Play } from "lucide-react";

type Props = {
  playing: boolean;
  currentTime: number;
  duration: number;
  markers: { t: number; team: "A" | "B"; kind: "goal" | "event" }[];
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onFullscreen: () => void;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlaybackBar({ playing, currentTime, duration, markers, onPlayPause, onSeek, onFullscreen }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekFromEvent = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-[14px] border border-wire bg-surface px-3.5 py-2.5">
      <button
        type="button"
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-wire bg-surface-2 text-cream transition-colors hover:border-cream/40"
      >
        {playing ? <Pause size={12} className="fill-cream" aria-hidden="true" /> : <Play size={12} className="fill-cream" aria-hidden="true" />}
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        onClick={seekFromEvent}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 5));
          if (event.key === "ArrowRight") onSeek(Math.min(duration, currentTime + 5));
        }}
        className="relative h-11 flex-1 cursor-pointer"
      >
        <div className="absolute inset-x-0 top-[19px] h-1.5 rounded-full bg-wire" />
        <div className="absolute left-0 top-[19px] h-1.5 rounded-full bg-cream" style={{ width: `${pct}%` }} />
        {markers.map((marker, i) => (
          <span
            key={`${marker.t}-${i}`}
            className={
              marker.kind === "goal"
                ? "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-cream"
                : `absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-ink ${marker.team === "A" ? "bg-team-a" : "bg-team-b"}`
            }
            style={{ left: `${duration > 0 ? (marker.t / duration) * 100 : 0}%` }}
            aria-hidden="true"
          />
        ))}
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          style={{ left: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="display num shrink-0 text-[15px] text-cream">{fmt(currentTime)}</div>

      <button
        type="button"
        onClick={onFullscreen}
        aria-label="Fullscreen"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-wire bg-surface-2 text-text-dim transition-colors hover:text-cream"
      >
        <Maximize2 size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
