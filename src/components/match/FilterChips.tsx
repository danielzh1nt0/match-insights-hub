import { Chip } from "@/components/ip/primitives";
import { cn } from "@/lib/utils";

type ChipDef = {
  id: string;
  label: string;
  count?: number;
};

type Props = {
  chips: ChipDef[];
  activeId: string;
  onSelect: (id: string) => void;
  onMore?: () => void;
  moreActiveCount?: number;
};

/** Event filters. Uses the shared Chip so it tracks the design system. */
export function FilterChips({ chips, activeId, onSelect, onMore, moreActiveCount = 0 }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-0.5 pt-3">
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <Chip
            key={chip.id}
            active={active}
            onClick={() => onSelect(chip.id)}
            {...(active && chip.count !== undefined ? { count: chip.count } : {})}
          >
            {chip.label}
          </Chip>
        );
      })}

      {onMore && (
        <Chip onClick={onMore}>
          <span className="flex items-center gap-1.5">
            More
            <span aria-hidden="true">▾</span>
            {moreActiveCount > 0 && (
              <span
                className={cn(
                  " bg-cream px-1.5 text-[10px] font-extrabold text-ink",
                )}
              >
                {moreActiveCount}
              </span>
            )}
          </span>
        </Chip>
      )}
    </div>
  );
}
