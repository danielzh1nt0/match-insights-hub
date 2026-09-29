import { Check, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  time: string;
  label: string;
  confirmed?: boolean;
  checked: boolean;
  onCheck: () => void;
  onPlay: () => void;
  onConfirm?: () => void;
  onDelete?: () => void;
};

export function MomentRow({ time, label, confirmed, checked, onCheck, onPlay, onConfirm, onDelete }: Props) {
  return (
    <div className="mb-1.5 grid grid-cols-[20px_60px_1fr_28px_28px] items-center gap-2.5 rounded-[10px] border border-wire bg-surface px-2.5 py-2">
      <button
        type="button"
        aria-label={checked ? `Remove ${time} from reel` : `Add ${time} to reel`}
        aria-pressed={checked}
        onClick={onCheck}
        className={cn(
          "grid h-5 w-5 place-items-center rounded-[6px] border-[1.5px] text-ink",
          checked ? "border-cream bg-cream" : "border-wire bg-surface-2",
        )}
      >
        {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
      </button>

      <button
        type="button"
        onClick={onPlay}
        className="display num flex min-h-11 items-center gap-1.5 text-[15px] text-cream"
      >
        <Play size={10} className="fill-cream text-cream" aria-hidden="true" />
        {time}
      </button>

      <div className={cn("text-[11.5px]", confirmed ? "text-reaction-good" : "text-text-faint")}>{label}</div>

      {onConfirm ? (
        <button
          type="button"
          aria-label={`Confirm ${time}`}
          onClick={onConfirm}
          className="grid h-11 w-7 place-items-center rounded-[6px] border border-wire bg-surface-2 text-text-faint transition-colors hover:text-cream"
        >
          <Check size={12} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}

      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete ${time}`}
          onClick={onDelete}
          className="grid h-11 w-7 place-items-center rounded-[6px] border border-wire bg-surface-2 text-text-faint transition-colors hover:text-cream"
        >
          <X size={12} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
