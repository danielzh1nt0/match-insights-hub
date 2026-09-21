type Props = { shirtNumber: number; team: "A" | "B"; descriptor?: string };
export function PlayerChip({ shirtNumber, team, descriptor }: Props) {
  return <span className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-wire bg-surface-2 px-[11px] text-[11.5px] font-semibold text-text-dim"><span className={team === "A" ? "h-1.5 w-1.5 rounded-full bg-team-a" : "h-1.5 w-1.5 rounded-full bg-team-b"} />#{shirtNumber}{descriptor ? ` · ${descriptor}` : ""}</span>;
}
