import {
  Layers,
  Maximize2,
  Pause,
  Play,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "video" | "2d" | "both";

/**
 * The transport row under the video, in the prototype's shape.
 *
 * Everything a coach reaches for while watching sits on one line: step through
 * the moments, nudge five seconds, change speed, switch between the video and
 * the 2D board, open the overlays. On a phone the row scrolls sideways rather
 * than wrapping into three rows of buttons.
 */
export function ControlBar({
  playing,
  onPlayPause,
  onStep,
  onEvent,
  speed,
  onSpeed,
  mode,
  onMode,
  onOverlays,
  onFullscreen,
  hasEvents,
}: {
  playing: boolean;
  onPlayPause: () => void;
  onStep: (seconds: number) => void;
  onEvent: (direction: -1 | 1) => void;
  speed: number;
  onSpeed: () => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  onOverlays: () => void;
  onFullscreen: () => void;
  hasEvents: boolean;
}) {
  return (
    <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <IconButton label="Previous moment" onClick={() => onEvent(-1)} disabled={!hasEvents}>
        <SkipBack size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label="Back 5 seconds" onClick={() => onStep(-5)}>
        <Rewind size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label={playing ? "Pause" : "Play"} onClick={onPlayPause} primary>
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </IconButton>
      <IconButton label="Forward 5 seconds" onClick={() => onStep(5)}>
        <FastForward size={18} aria-hidden="true" />
      </IconButton>
      <IconButton label="Next moment" onClick={() => onEvent(1)} disabled={!hasEvents}>
        <SkipForward size={18} aria-hidden="true" />
      </IconButton>

      <span className="hidden flex-1 md:block" />

      <TextButton label="Playback speed" onClick={onSpeed}>
        {speed}×
      </TextButton>

      <div
        className="flex shrink-0 items-center gap-[2px] rounded-[10px] border border-wire bg-surface p-[3px]"
        role="group"
        aria-label="View"
      >
        {(["video", "2d", "both"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            onClick={() => onMode(key)}
            className={cn(
              "h-[38px] rounded-[7px] px-3 text-[12px] font-bold transition-colors",
              mode === key ? "bg-surface-3 text-text" : "text-text-faint hover:text-text",
            )}
          >
            {key === "video" ? "Video" : key === "2d" ? "2D" : "Both"}
          </button>
        ))}
      </div>

      <TextButton label="Choose overlays" onClick={onOverlays}>
        <Layers size={14} aria-hidden="true" />
        Overlays
      </TextButton>
      <IconButton label="Fullscreen" onClick={onFullscreen}>
        <Maximize2 size={16} aria-hidden="true" />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-11 min-w-11 shrink-0 place-items-center rounded-[10px] border transition-colors disabled:opacity-35",
        primary
          ? "border-cream bg-cream text-ink"
          : "border-wire bg-surface text-text hover:border-cream/40",
      )}
    >
      {children}
    </button>
  );
}

function TextButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-wire bg-surface px-3 text-[12px] font-bold text-text transition-colors hover:border-cream/40"
    >
      {children}
    </button>
  );
}
