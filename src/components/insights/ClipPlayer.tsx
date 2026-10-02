import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Pause, Play, RotateCcw, X } from "lucide-react";
import { actionLinkClass } from "@/components/ip/touchline";
import { cn } from "@/lib/utils";

/**
 * How much of the match a clip is.
 *
 * The run-up matters as much as the moment: a coach judging whether anyone
 * stepped in needs to see the ball being lost, then what the next few seconds
 * did about it. Four seconds before, eight after.
 */
export const CLIP_PRE_S = 4;
export const CLIP_POST_S = 8;

function clock(seconds: number) {
  const m = Math.floor(Math.max(seconds, 0) / 60);
  const s = Math.floor(Math.max(seconds, 0) % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ControlButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center border border-wire text-text-dim transition-colors hover:border-accent-sea hover:text-accent-sea disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-wire disabled:hover:text-text-dim"
    >
      {children}
    </button>
  );
}

/**
 * The clip, playing where it was clicked.
 *
 * There is one video file per match, so a clip is a window into it rather than
 * a separate asset: seek to the moment's run-up, play, stop at the end of the
 * window. That is the whole mechanism, and it is why this works without any
 * clipping pipeline — the evidence a finding rests on is twelve seconds of the
 * match the coach already uploaded.
 *
 * Playing it here rather than linking away is the point. A coach checking
 * whether he believes a finding should not lose the finding to do it.
 */
export function ClipPlayer({
  videoUrl,
  timestamps,
  index,
  onIndex,
  onClose,
  matchId,
  label,
}: {
  videoUrl: string;
  /** Every moment behind the finding, in match order. */
  timestamps: number[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
  matchId: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);

  const moment = timestamps[index] ?? 0;
  const start = Math.max(0, moment - CLIP_PRE_S);
  const end = moment + CLIP_POST_S;
  const span = Math.max(end - start, 0.1);

  const seekToStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const go = () => {
      video.currentTime = start;
      video.playbackRate = slow ? 0.5 : 1;
      void video.play().catch(() => undefined);
    };
    if (video.readyState >= 1) go();
    else video.addEventListener("loadedmetadata", go, { once: true });
  }, [start, slow]);

  // A new moment is a new clip: seek and play, every time the index changes.
  useEffect(() => {
    setElapsed(0);
    seekToStart();
  }, [seekToStart, index]);

  // Stop at the end of the window rather than running on into the next phase
  // of play, and keep the window bar honest while it runs.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const within = video.currentTime - start;
        setElapsed(within < 0 ? 0 : within > span ? span : within);
        if (video.currentTime >= end && !video.paused) video.pause();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, end, span]);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime >= end - 0.15) video.currentTime = start;
      void video.play().catch(() => undefined);
    } else video.pause();
  }, [start, end]);

  const setSpeed = useCallback((next: boolean) => {
    setSlow(next);
    const video = videoRef.current;
    if (video) video.playbackRate = next ? 0.5 : 1;
  }, []);

  const fullscreen = useCallback(() => {
    const node = frameRef.current;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen?.().catch(() => undefined);
  }, []);

  const atFirst = index <= 0;
  const atLast = index >= timestamps.length - 1;

  return (
    <div className="border-b border-wire bg-bg">
      <div
        ref={frameRef}
        className="relative aspect-[16/9] w-full overflow-hidden border-b border-wire bg-black"
      >
        {/* Metadata only: a clip is a seek into a long file, so there is no
            reason to pull the opening minutes nobody asked for. */}
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={() => setReady(true)}
          onError={() => setFailed(true)}
          aria-label={`${label}, moment ${index + 1} of ${timestamps.length} at ${clock(moment)}`}
          className="h-full w-full bg-black object-contain"
        />

        {/* The clock is the match clock, not the clip's, so what is on screen
            can be matched against the feed and the timeline. */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
          <span className="num bg-black/60 px-2 py-0.5 text-[14px] font-bold text-white">
            {clock(start + elapsed)}
          </span>
          <span className="label-xs bg-black/60 px-2 py-0.5 text-white/85">
            Clip {index + 1} of {timestamps.length}
          </span>
          {slow && <span className="label-xs bg-accent-sea px-2 py-0.5 text-ink">Half speed</span>}
        </div>

        {/* Where we are inside the window, with the moment itself marked. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
          <div className="h-full bg-accent-sea" style={{ width: `${(elapsed / span) * 100}%` }} />
          <span
            className="absolute top-0 h-full w-[2px] bg-white"
            style={{ left: `${(CLIP_PRE_S / span) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        {!ready && !failed && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-[12.5px] text-white/70">
            Opening the match at {clock(moment)}…
          </p>
        )}
        {failed && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] leading-relaxed text-white/80">
            The video for this match could not be loaded. The moment is still at {clock(moment)} —{" "}
            <Link
              to="/match/$matchId/match"
              params={{ matchId }}
              search={{ t: Math.round(moment * 10) / 10 }}
              className="underline"
            >
              open it in the workspace
            </Link>
            .
          </p>
        )}

        {!playing && ready && !failed && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Play this clip"
            className="absolute inset-0 grid place-items-center bg-black/25 transition-colors hover:bg-black/15"
          >
            <span className="grid h-14 w-14 place-items-center border border-white/70 bg-black/45 text-white">
              <Play size={22} aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1.5">
          <ControlButton
            onClick={() => onIndex(index - 1)}
            label="Previous moment"
            disabled={atFirst}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </ControlButton>
          <ControlButton onClick={toggle} label={playing ? "Pause" : "Play"}>
            {playing ? (
              <Pause size={15} aria-hidden="true" />
            ) : (
              <Play size={15} aria-hidden="true" />
            )}
          </ControlButton>
          <ControlButton onClick={() => onIndex(index + 1)} label="Next moment" disabled={atLast}>
            <ChevronRight size={16} aria-hidden="true" />
          </ControlButton>
          <ControlButton onClick={seekToStart} label="Replay this clip">
            <RotateCcw size={14} aria-hidden="true" />
          </ControlButton>
          <button
            type="button"
            onClick={() => setSpeed(!slow)}
            aria-pressed={slow}
            className={cn(
              "num-flat h-8 border px-2 text-[12px] transition-colors",
              slow
                ? "border-accent-sea text-accent-sea"
                : "border-wire text-text-dim hover:border-accent-sea hover:text-accent-sea",
            )}
          >
            0.5×
          </button>
          <ControlButton onClick={fullscreen} label="Fullscreen">
            <Expand size={14} aria-hidden="true" />
          </ControlButton>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/match/$matchId/match"
            params={{ matchId }}
            search={{ t: Math.round(moment * 10) / 10 }}
            className={actionLinkClass()}
          >
            Open in the workspace
          </Link>
          <ControlButton onClick={onClose} label="Close the player">
            <X size={15} aria-hidden="true" />
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
