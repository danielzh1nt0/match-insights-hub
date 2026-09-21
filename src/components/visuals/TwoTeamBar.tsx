type Props = { label: string; valueA: number; valueB: number; unit?: string };
export function TwoTeamBar({ label, valueA, valueB, unit = "" }: Props) {
  const total = Math.max(valueA + valueB, 1);
  const empty = valueA === 0 && valueB === 0;
  return <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2.5" role="img" aria-label={`${label}: team A ${valueA}${unit}, team B ${valueB}${unit}`}>
    <span className={valueA >= valueB && !empty ? "display-i text-[18px] text-team-a" : "display-i text-[18px] text-text-faint"}>{empty ? "—" : `${valueA}${unit}`}</span>
    <span className="flex flex-col items-center gap-1"><span className="text-[9.5px] font-bold uppercase text-text-faint">{label}</span><span className="flex h-1 w-full gap-0.5 overflow-hidden rounded-[2px]"><span className={valueA >= valueB && !empty ? "bg-team-a" : "bg-surface-3"} style={{ width: `${valueA / total * 100}%` }} /><span className={valueB > valueA && !empty ? "bg-team-b" : "bg-surface-3"} style={{ width: `${valueB / total * 100}%` }} /></span></span>
    <span className={valueB > valueA && !empty ? "display-i text-right text-[18px] text-team-b" : "display-i text-right text-[18px] text-text-faint"}>{empty ? "—" : `${valueB}${unit}`}</span>
  </div>;
}
