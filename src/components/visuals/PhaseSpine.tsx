import { Button } from "@/components/ip/primitives";
import { cn } from "@/lib/utils";

export type Phase = { start: number; end: number; name?: string | undefined; team: "A" | "B" | "even" };
type Props = { phases: Phase[]; activeIndex: number; onPhaseTap: (i: number) => void };

function phaseTime(phase: Phase) {
  const start = Math.round(phase.start / 60);
  const end = Math.round(phase.end / 60);
  return start === end ? `${start}′` : `${start}–${end}′`;
}

export function PhaseSpine({ phases, activeIndex, onPhaseTap }: Props) {
  return <div>
    <div className="flex h-[34px] gap-0.5 overflow-hidden rounded-[14px] bg-wire md:h-11" role="group" aria-label="Match phases">
      {phases.map((phase, index) => <Button key={`${phase.start}-${phase.name}`} variant="ghost" aria-label={phase.name ? `${phase.name}, ${phaseTime(phase)}` : phaseTime(phase)} aria-pressed={activeIndex === index} onClick={() => onPhaseTap(index)} className={cn("min-w-0 flex-1 flex-col gap-0 rounded-none px-1 py-1 font-display text-[10px] font-bold uppercase text-ink transition-none hover:text-ink md:text-[12px]", phase.team === "A" ? "bg-team-a hover:bg-team-a" : phase.team === "B" ? "bg-team-b hover:bg-team-b" : "bg-graphite text-cream hover:bg-graphite hover:text-cream", activeIndex === index ? "opacity-100" : "opacity-55")}>
        {phase.name && <span className="max-w-full truncate">{phase.name}</span>}<span className="text-[10px] font-semibold opacity-90 md:text-[11px]">{phaseTime(phase)}</span>
      </Button>)}
    </div>
    <p className="mt-1.5 text-[10px] font-semibold text-text-faint">Colour shows which team had more tracked moments in that stretch.</p>
  </div>;
}
