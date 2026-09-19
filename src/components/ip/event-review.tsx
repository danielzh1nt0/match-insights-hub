import { useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { GhostButton, PrimaryButton, Segmented } from "@/components/ip/primitives";
import { formatClock } from "@/lib/sample-data";
import type { ReviewedEvent } from "@/lib/event-reviews";
import { cn } from "@/lib/utils";

export type ReviewAction = (input: {
  eventId: string;
  verdict: "confirmed" | "deleted" | "retimed";
  tCorrected?: number | null;
  teamCorrected?: string | null;
}) => void;

/** ✓ Confirm and ✕ Not an event. One tap, no dialog. */
export function EventReviewControls({
  event,
  onReview,
  onFix,
  names,
}: {
  event: ReviewedEvent;
  onReview: ReviewAction;
  onFix?: () => void;
  names?: { A: string; B: string };
}) {
  const confirmed = event.status === "confirmed";
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        aria-label={
          confirmed ? `Fix the time or team for ${event.title}` : `Confirm ${event.title}`
        }
        aria-pressed={confirmed}
        onClick={(ev) => {
          ev.stopPropagation();
          if (confirmed && onFix) onFix();
          else onReview({ eventId: event.id, verdict: "confirmed" });
        }}
        className={cn(
          "tap grid h-9 w-9 place-items-center rounded-[10px] border text-[13px]",
          confirmed
            ? "border-transparent text-[#111315]"
            : "border-wire text-text-faint hover:border-cream/60 hover:text-cream",
        )}
        style={confirmed ? { background: "var(--cream)" } : undefined}
        title={confirmed ? "Confirmed — tap to fix time or team" : "Confirm"}
      >
        {confirmed && onFix ? (
          <Clock size={14} aria-hidden="true" />
        ) : (
          <Check size={14} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        aria-label={`Not an event: ${event.title}`}
        onClick={(ev) => {
          ev.stopPropagation();
          onReview({ eventId: event.id, verdict: "deleted" });
        }}
        className="tap grid h-9 w-9 place-items-center rounded-[10px] border border-wire text-text-faint hover:border-quality-bad/70 hover:text-quality-bad"
        title="Not an event"
      >
        <X size={14} aria-hidden="true" />
      </button>
      {names ? <span className="sr-only">{`${names.A} or ${names.B}`}</span> : null}
    </span>
  );
}

/** Small sheet to nudge the time by ±5 s or change the team. */
export function EventFixSheet({
  event,
  names,
  onReview,
  onClose,
}: {
  event: ReviewedEvent;
  names: { A: string; B: string };
  onReview: ReviewAction;
  onClose: () => void;
}) {
  const [t, setT] = useState(event.t);
  const [team, setTeam] = useState<"A" | "B">(event.team === "B" ? "B" : "A");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-label="Fix this moment"
        className="relative w-full rounded-t-[16px] border border-wire bg-surface p-5 sm:max-w-[420px] sm:rounded-[16px]"
      >
        <h2 className="display text-[18px] uppercase text-cream">Fix this moment</h2>
        <p className="mt-1 text-[12px] text-text-dim">{event.title}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <GhostButton className="h-11 w-24" onClick={() => setT((v) => Math.max(0, v - 5))}>
            −5 s
          </GhostButton>
          <span className="num text-[26px] text-cream">{formatClock(t)}</span>
          <GhostButton className="h-11 w-24" onClick={() => setT((v) => v + 5)}>
            +5 s
          </GhostButton>
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-faint">
            Team
          </span>
          <Segmented
            ariaLabel="Team for this moment"
            value={team}
            onChange={(v) => setTeam(v as "A" | "B")}
            options={[
              { value: "A", label: names.A },
              { value: "B", label: names.B },
            ]}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <PrimaryButton
            className="h-12 sm:flex-1"
            onClick={() => {
              onReview({
                eventId: event.id,
                verdict: "retimed",
                tCorrected: Math.round(t * 10) / 10,
                teamCorrected: team,
              });
              onClose();
            }}
          >
            Save correction
          </PrimaryButton>
          <GhostButton className="h-12 sm:flex-1" onClick={onClose}>
            Cancel
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
