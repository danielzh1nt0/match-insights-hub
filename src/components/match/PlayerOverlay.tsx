import React from "react";
import {
  FastForward,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "video" | "2d" | "both";

export type SeekMarker = { t: number; team: "A" | "B"; kind: "goal" | "event" };

const MODES: ViewMode[] = ["video", "2d", "both"];
const MODE_LABEL: Record<ViewMode, string> = { video: "Video", "2d": "2D", both: "Both" };

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * The player controls, over the picture.
 *
 * They used to sit under the video as a row of bordered buttons, with the
 * scrubber in a second box below that — two blocks of chrome for something
 * that belongs on the video. Now it is one slim bar over the bottom of the
 * frame, and it is the same bar in fullscreen, where it is the only way to
 * reach the overlays or get back out.
 */
export function PlayerOverlay({
  playing,
  currentTime,
  duration,
  markers,
  onPlayPause,
  onSeek,
  onStep,
  onEvent,
  speed,
  onSpeed,
  mode,
  onMode,
  onOverlays,
  overlaysOpen,
  fullscreen,
  onFullscreen,
  hasEvents,
  visible,
}: {
  playing: boolean;
  currentTime: number;
  duration: number;
  markers: SeekMarker[];
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onStep: (seconds: number) => void;
  onEvent: (direction: -1 | 1) => void;
  speed: number;
  onSpeed: () => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  onOverlays: () => void;
  overlaysOpen: boolean;
  fullscreen: boolean;
  onFullscreen: () => void;
  hasEvents: boolean;
  /** The bar fades out while the video plays and nobody is touching it. */
  visible: boolean;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekFrom = (clientX: number) => {
    const node = trackRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration);
  };

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent pb-2 pt-8 transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      // Taps on the bar must not reach the show/hide handler on the frame.
      onPointerDown={(event) => event.stopPropagation()}
    >
      {/* Scrub line */}
      <div className="px-3">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${clock(currentTime)} of ${clock(duration)}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") onSeek(currentTime + 5);
            if (event.key === "ArrowLeft") onSeek(currentTime - 5);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            seekFrom(event.clientX);
          }}
          className="relative h-6 cursor-pointer touch-none"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/25" />
          <span
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-cream"
            style={{ width: `${pct}%` }}
          />
          {markers.map((marker, i) => (
            <span
              key={`${marker.t}-${i}`}
              aria-hidden="true"
              className={cn(
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                marker.kind === "goal" ? "h-2.5 w-2.5" : "h-1.5 w-1.5",
              )}
              style={{
                left: `${duration > 0 ? (marker.t / duration) * 100 : 0}%`,
                background:
                  marker.kind === "goal"
                    ? "var(--cream)"
                    : marker.team === "A"
                      ? "var(--team-a)"
                      : "var(--team-b)",
              }}
            />
          ))}
          <span
            aria-hidden="true"
            // The one place a shadow earns its keep: this sits on live video,
            // where a flat chalk dot can land on a white shirt and vanish.
            className="cast-shadow absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream shadow"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-0.5 px-2 sm:gap-1 sm:px-3">
        <Ctrl label="Previous moment" onClick={() => onEvent(-1)} disabled={!hasEvents}>
          <SkipBack size={17} aria-hidden="true" />
        </Ctrl>
        <Ctrl label="Back 5 seconds" onClick={() => onStep(-5)} className="hidden sm:grid">
          <Rewind size={17} aria-hidden="true" />
        </Ctrl>
        <Ctrl label={playing ? "Pause" : "Play"} onClick={onPlayPause}>
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </Ctrl>
        <Ctrl label="Forward 5 seconds" onClick={() => onStep(5)} className="hidden sm:grid">
          <FastForward size={17} aria-hidden="true" />
        </Ctrl>
        <Ctrl label="Next moment" onClick={() => onEvent(1)} disabled={!hasEvents}>
          <SkipForward size={17} aria-hidden="true" />
        </Ctrl>

        <span className="num ml-1 shrink-0 text-[11.5px] text-white/85 [font-variant-numeric:tabular-nums]">
          {clock(currentTime)} <span className="text-white/45">/ {clock(duration)}</span>
        </span>

        <span className="flex-1" />

        <button
          type="button"
          aria-label="Playback speed"
          onClick={onSpeed}
          className="hidden h-9 shrink-0 items-center px-2 text-[12px] font-bold text-white/85 hover:bg-white/10 sm:inline-flex"
        >
          {speed}×
        </button>

        {/* Three chips where there is room, one cycling button where there is not. */}
        <div
          className="hidden shrink-0 items-center gap-[2px] bg-white/10 p-[2px] sm:flex"
          role="group"
          aria-label="View"
        >
          {MODES.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => onMode(key)}
              className={cn(
                "h-8 px-2.5 text-[12px] font-bold transition-colors",
                mode === key ? "bg-white text-black" : "text-white/80 hover:text-white",
              )}
            >
              {MODE_LABEL[key]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]!)}
          aria-label={`View: ${MODE_LABEL[mode]}. Tap to change.`}
          className="h-9 shrink-0 px-2 text-[12px] font-bold text-white/85 hover:bg-white/10 sm:hidden"
        >
          {MODE_LABEL[mode]}
        </button>

        <Ctrl label="Overlays" onClick={onOverlays} pressed={overlaysOpen}>
          <Layers size={17} aria-hidden="true" />
        </Ctrl>
        <Ctrl label={fullscreen ? "Leave fullscreen" : "Fullscreen"} onClick={onFullscreen}>
          {fullscreen ? (
            <Minimize2 size={17} aria-hidden="true" />
          ) : (
            <Maximize2 size={17} aria-hidden="true" />
          )}
        </Ctrl>
      </div>
    </div>
  );
}

function Ctrl({
  label,
  onClick,
  children,
  disabled,
  className,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-35",
        pressed && "bg-white/20",
        className,
      )}
    >
      {children}
    </button>
  );
}
