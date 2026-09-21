import { type ReactNode, useEffect, useRef } from "react";
import { Camera, ChevronDown, FileImage, Grid2X2, Image, X } from "lucide-react";
import { Wordmark } from "@/components/ip/primitives";
import { cn } from "@/lib/utils";

export function RegistrationShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return <main className="registration-theme min-h-screen bg-bg"><div className="mx-auto flex min-h-[100svh] w-full max-w-[560px] flex-col px-6 pt-6 md:py-10"><Wordmark size="sm" className="mx-auto opacity-60"/><div className="flex-1 pb-6">{children}</div>{footer && <div className="sticky bottom-0 z-10 -mx-6 border-t border-wire-2 bg-bg/95 px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur">{footer}</div>}</div></main>;
}

export function ProgressDashes({ step }: { step: 1 | 2 }) {
  return <div className="mt-5 flex justify-center gap-2" aria-label={`Step ${step} of 2`}><span className="h-1 w-9 rounded-full bg-cream"/><span className={cn("h-1 w-9 rounded-full", step === 2 ? "bg-cream" : "bg-wire")}/></div>;
}

export function ScreenHeading({ title, sub, back }: { title: string; sub: string; back?: ReactNode }) {
  return <header className="relative mt-7">{back}<h1 className="display-i text-[34px] leading-[1.05] text-cream">{title}</h1><p className="mt-2 text-[13px] text-text-dim">{sub}</p></header>;
}

export function FormLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim">{children}{optional && <span className="text-[9.5px] font-medium text-text-faint">Optional</span>}</span>;
}

export function CrestTile({ monogram, colour, image, empty, size = "large", onClick }: { monogram: string; colour: string; image?: string | null; empty?: boolean; size?: "large" | "small"; onClick?: () => void }) {
  const classes = size === "large" ? "h-28 w-28 rounded-[28px]" : "h-11 w-11 rounded-xl";
  const content = empty ? <><Camera size={22}/><span className="text-[11px] font-semibold uppercase">Add crest</span></> : image ? <img src={image} alt="Club crest" className="h-full w-full rounded-[inherit] object-cover"/> : <span key={monogram} className={cn("display-i animate-monogram text-cream", size === "large" ? "text-[44px]" : "text-[20px]")}>{monogram || "CL"}</span>;
  return <button type="button" onClick={onClick} aria-label={empty ? "Add club crest" : "Edit club crest"} className={cn("tap flex shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden border", classes, empty ? "border-dashed border-wire bg-transparent text-text-dim" : "border-wire text-cream")} style={empty ? undefined : { backgroundColor: colour }}>{content}</button>;
}

export function BottomSheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const previous = document.activeElement as HTMLElement | null; ref.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); previous?.focus(); }; }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 backdrop-blur-sm" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="w-full max-w-[560px] animate-sheet rounded-t-[22px] border border-wire bg-surface px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3"><div className="mx-auto h-1 w-9 rounded-full bg-wire"/><div className="mt-5 flex items-start justify-between gap-4"><div><h2 className="display text-[18px] text-text">{title}</h2>{sub && <p className="mt-1 text-[11.5px] text-text-faint">{sub}</p>}</div><button type="button" onClick={onClose} className="tap flex items-center justify-center text-text-dim" aria-label="Close"><X size={18}/></button></div><div className="mt-4">{children}</div></div></div>;
}

const options = [{ icon: Image, name: "Photo library", desc: "Choose from your photos", mode: "image" }, { icon: Grid2X2, name: "Files", desc: "Browse your device", mode: "image" }, { icon: Camera, name: "Take a photo", desc: "Open camera", mode: "image" }, { icon: ChevronDown, name: "Keep initials for now", desc: "Add it any time later", mode: "monogram" }] as const;
export function CrestSheet({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (mode: "image" | "monogram", file?: File) => void }) {
  const chooseRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null);
  return <BottomSheet open={open} onClose={onClose} title="Add your crest" sub="PNG or JPG. Square works best."><input ref={chooseRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) onSelect("image",f); }}/><input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f=e.target.files?.[0]; if(f) onSelect("image",f); }}/>{options.map(({icon: Icon,name,desc,mode},i)=><button key={name} type="button" onClick={() => i < 2 ? chooseRef.current?.click() : i === 2 ? cameraRef.current?.click() : onSelect(mode)} className="tap flex w-full items-center gap-3 border-b border-wire-2 py-2.5 text-left last:border-0"><span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2 text-text-dim"><Icon size={18}/></span><span><strong className="block text-[14px] font-semibold text-text">{name}</strong><small className="text-[11.5px] text-text-faint">{desc}</small></span></button>)}</BottomSheet>;
}
