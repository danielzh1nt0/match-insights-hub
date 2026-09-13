import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DrillPitch } from "@/components/ip/drill-pitch";
import type { DrillPlan } from "@/lib/session-plan";
import { cn } from "@/lib/utils";

function BulletList({ items, cream = false }: { items: string[]; cream?: boolean }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[10px_1fr] gap-1.5 text-[12.5px] leading-[1.55] text-text-dim">
          <span className={cream ? "text-cream" : "text-text-faint"}>·</span><span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function DrillCard({ drill, defaultExpanded = false }: { drill: DrillPlan; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = `${drill.id}-progressions`;
  const setupItems = [
    ["Players", drill.players], ["Space", drill.space], ["Duration", drill.duration], ["Equipment", drill.equipment],
  ];

  return (
    <article className="rounded-[16px] border border-wire bg-surface p-4 md:p-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 className="display-i text-[22px] leading-none text-cream">{drill.title} · {drill.duration}</h2>
          <span className="rounded-[22px] border border-wire bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">{drill.type}</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-text-dim">{drill.description}</p>
      </header>

      <div className="mt-4"><DrillPitch templateId={drill.template} drillName={drill.title} /></div>

      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {setupItems.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-[10px] bg-surface-2 p-3">
            <dt className="text-[11px] font-bold uppercase text-text-faint">{label}</dt>
            <dd className="mt-1 break-words text-[13px] font-semibold leading-snug text-text">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 space-y-3.5">
        <section><h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">Setup</h3><p className="text-[12.5px] leading-[1.6] text-text-dim">{drill.setup || "—"}</p></section>
        <section><h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">Rules</h3><BulletList items={drill.rules} /></section>
        <section className="rounded-[10px] border border-wire-2 border-l-2 border-l-cream bg-surface-2 p-3"><h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">Why this works</h3><p className="text-[12.5px] leading-[1.6] text-text-dim">{drill.why || "—"}</p></section>
      </div>

      <section className="mt-5">
        <div className="flex items-center gap-3"><h3 className="display shrink-0 text-[14px] text-text-dim">What to look for</h3><span className="h-px flex-1 bg-wire-2" /></div>
        <div className="mt-2"><BulletList items={drill.cues.slice(0, 3)} cream /></div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[10px] border border-wire bg-surface-2">
        <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)} className="tap flex w-full items-center justify-between px-3 text-left text-[12.5px] font-semibold text-text hover:text-cream">
          Progressions <ChevronDown size={16} className={cn("text-text-faint transition-transform duration-150", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div id={detailsId} className="grid gap-4 border-t border-wire px-3 pb-4 pt-3 md:grid-cols-2">
            <div><h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">Make it harder</h4><BulletList items={drill.harder} /></div>
            <div><h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">Make it easier</h4><BulletList items={drill.easier} /></div>
          </div>
        )}
      </section>
    </article>
  );
}