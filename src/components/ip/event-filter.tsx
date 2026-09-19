import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReviewedEvent } from "@/lib/event-reviews";
import { EVENT_TONE, type EventKind } from "@/lib/match-data";
import { EVENT_GROUPS, groupTypes, type Frame } from "@/lib/match-source";
import { cn } from "@/lib/utils";

export type EventFilterValue = {
  type: string;
  zone: "own" | "middle" | "final" | null;
  player: string | null;
  quality: "good" | "risky" | "bad" | null;
};

export const DEFAULT_EVENT_FILTER: EventFilterValue = {
  type: "all",
  zone: null,
  player: null,
  quality: null,
};

const TYPE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "goals", label: "Goals & shots" },
  ...EVENT_GROUPS.filter((group) => group.key !== "all"),
];

const ZONE_OPTIONS = [
  { key: "own", label: "Own third" },
  { key: "middle", label: "Middle third" },
  { key: "final", label: "Final third" },
] as const;

const QUALITY_OPTIONS = [
  { key: "good", label: "Good" },
  { key: "risky", label: "Risky" },
  { key: "bad", label: "Bad" },
] as const;

const GOAL_TYPES = ["goal", "shot", "shot_blocked"];

function eventTypeKey(key: string) {
  if (key === "goals") return GOAL_TYPES;
  return groupTypes(key);
}

function payloadText(event: ReviewedEvent, keys: string[]) {
  const payload = event.payload ?? {};
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return null;
}

function eventPlayer(event: ReviewedEvent) {
  return payloadText(event, ["shirt", "shirt_number", "player", "player_id", "carrier", "carrier_id"]);
}

function eventX(event: ReviewedEvent) {
  const payload = event.payload ?? {};
  const direct = [payload["x"], payload["x_pct"], payload["start_x"], payload["ball_x"]]
    .find((value) => typeof value === "number");
  if (typeof direct === "number") return direct <= 1 ? direct * 100 : direct <= 105 ? (direct / 105) * 100 : direct;
  const location = payload["location"] ?? payload["start"] ?? payload["position"];
  if (Array.isArray(location) && typeof location[0] === "number") {
    const x = location[0];
    return x <= 1 ? x * 100 : x <= 105 ? (x / 105) * 100 : x;
  }
  return null;
}

function eventQuality(event: ReviewedEvent) {
  const payloadQuality = payloadText(event, ["quality", "tone"]);
  if (payloadQuality?.includes("risky")) return "risky";
  if (payloadQuality?.includes("bad") || payloadQuality?.includes("lost")) return "bad";
  if (payloadQuality?.includes("good") || payloadQuality?.includes("complete")) return "good";
  return EVENT_TONE[event.type as EventKind] ?? "neutral";
}

export function eventMatchesFilter(event: ReviewedEvent, value: EventFilterValue) {
  const types = eventTypeKey(value.type);
  if (types && !types.includes(event.type)) return false;
  if (value.player && `${event.team ?? "?"}:${eventPlayer(event) ?? ""}` !== value.player) return false;
  if (value.quality && eventQuality(event) !== value.quality) return false;
  if (value.zone) {
    const x = eventX(event);
    if (x == null) return false;
    const teamX = event.team === "B" ? 100 - x : x;
    const zone = teamX < 100 / 3 ? "own" : teamX < 200 / 3 ? "middle" : "final";
    if (zone !== value.zone) return false;
  }
  return true;
}

function FilterChip({ label, active, onClick, expanded, badge }: {
  label: string;
  active: boolean;
  onClick: () => void;
  expanded?: boolean | undefined;
  badge?: number | undefined;
}) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={active}
      {...(expanded !== undefined ? { "aria-expanded": expanded } : {})}
      onClick={onClick}
      className={cn("fchip", active && "fchip-active")}
    >
      <span>{label}</span>
      {badge ? <span className="fchip-badge" aria-label={`${badge} extra filters`}>· {badge}</span> : null}
    </button>
  );
}

function PlayerSection({ events, frames, value, onChange, teamNames }: {
  events: ReviewedEvent[];
  frames: Frame[];
  value: string | null;
  onChange: (value: string | null) => void;
  teamNames: { A: string; B: string };
}) {
  const players = useMemo(() => {
    const result: Record<"A" | "B", string[]> = { A: [], B: [] };
    for (const event of events) {
      if (!event.team) continue;
      const player = eventPlayer(event);
      if (player && !result[event.team].includes(player)) result[event.team].push(player);
    }
    for (const frame of frames) {
      for (const player of frame.players) {
        const shirt = String(player.id);
        if (!result[player.team].includes(shirt)) result[player.team].push(shirt);
      }
    }
    result.A.sort((a, b) => Number(a) - Number(b));
    result.B.sort((a, b) => Number(a) - Number(b));
    return result;
  }, [events, frames]);

  return (
    <div className="space-y-3">
      {(["A", "B"] as const).map((team) => (
        <div key={team} className="grid grid-cols-[88px_1fr] items-start gap-3">
          <p className="truncate pt-2 text-[11.5px] font-semibold text-text-dim">{teamNames[team]}</p>
          <div className="flex flex-wrap gap-1.5">
            {players[team].length > 0 ? players[team].map((shirt) => {
              const key = `${team}:${shirt}`;
              return <FilterChip key={key} label={shirt} active={value === key} onClick={() => onChange(value === key ? null : key)} />;
            }) : <span className="py-2 text-[11.5px] text-text-faint">No shirt numbers detected</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventFilter({ value, onChange, events, frames, teamNames }: {
  value: EventFilterValue;
  onChange: (value: EventFilterValue) => void;
  events: ReviewedEvent[];
  frames: Frame[];
  teamNames: { A: string; B: string };
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const extraCount = Number(Boolean(value.zone)) + Number(Boolean(value.player)) + Number(Boolean(value.quality));

  const openSheet = () => {
    setDraft(value);
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5" aria-label="Event type filters">
        {EVENT_GROUPS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={value.type === option.key}
            onClick={() => onChange({ ...value, type: option.key })}
          />
        ))}
        <FilterChip label="More ▾" active={false} expanded={open} badge={extraCount || undefined} onClick={openSheet} />
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[16px] border border-b-0 border-wire bg-surface p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[420px] md:rounded-none md:border-y-0 md:border-r-0 md:p-7 md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right"
          >
            <header className="flex items-center justify-between gap-4 border-b border-wire-2 pb-4">
              <Dialog.Title className="display text-[20px] uppercase text-text">Filters</Dialog.Title>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDraft(DEFAULT_EVENT_FILTER)} className="tap px-2 text-[12px] font-semibold text-text-dim hover:text-cream">Reset</button>
                <Dialog.Close className="tap grid place-items-center text-text-faint hover:text-text" aria-label="Close filters">
                  <X size={18} aria-hidden="true" />
                </Dialog.Close>
              </div>
            </header>

            <div className="space-y-6 py-5">
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">Type</h3>
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} active={draft.type === option.key} onClick={() => setDraft({ ...draft, type: option.key })} />)}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">Zone</h3>
                <div className="flex flex-wrap gap-1.5">
                  {ZONE_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} active={draft.zone === option.key} onClick={() => setDraft({ ...draft, zone: draft.zone === option.key ? null : option.key })} />)}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">Player</h3>
                <PlayerSection events={events} frames={frames} value={draft.player} onChange={(player) => setDraft({ ...draft, player })} teamNames={teamNames} />
              </section>

              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">Quality</h3>
                <div className="flex flex-wrap gap-1.5">
                  {QUALITY_OPTIONS.map((option) => <FilterChip key={option.key} label={option.label} active={draft.quality === option.key} onClick={() => setDraft({ ...draft, quality: draft.quality === option.key ? null : option.key })} />)}
                </div>
              </section>
            </div>

            <button type="button" onClick={() => { onChange(draft); setOpen(false); }} className="tap mt-auto w-full rounded-[12px] bg-cream px-5 text-sm font-bold text-primary-foreground hover:bg-cream-dim">Apply</button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}