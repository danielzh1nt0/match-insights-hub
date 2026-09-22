import { cn } from "@/lib/utils";

export type TeamIdentity = {
  name: string;
  shortCode: string;
  kitColour: string;
  crestUrl?: string | undefined;
  monogram?: string;
};

export function shortTeamCode(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] ?? name).slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

export function TeamToken({ identity, size = "sm", state = "active", suffix, mirrored = false, className }: {
  identity: TeamIdentity;
  size?: "sm" | "md" | "lg";
  state?: "active" | "inactive" | "compare";
  suffix?: string | undefined;
  mirrored?: boolean;
  className?: string;
}) {
  const tile = size === "lg" ? "h-11 w-11 rounded-[11px]" : size === "md" ? "h-7 w-7 rounded-[7px]" : "h-[22px] w-[22px] rounded-[6px]";
  const code = identity.shortCode || shortTeamCode(identity.name);
  return <span className={cn("inline-flex min-w-0 items-center gap-2", mirrored && "flex-row-reverse text-right", state === "inactive" && "opacity-60", className)}>
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden border border-cream/15", tile, state === "active" && "ring-2 ring-cream ring-offset-2 ring-offset-surface")} style={{ background: identity.kitColour }} aria-hidden="true">
      {identity.crestUrl ? <img src={identity.crestUrl} alt="" className="h-full w-full object-contain" /> : <span className={cn("display-i leading-none text-text", size === "lg" ? "text-[22px]" : size === "md" ? "text-[14px]" : "text-[11px]")}>{identity.monogram ?? code.slice(0, 2)}</span>}
    </span>
    <span className="min-w-0">
      {size !== "lg" && <span className={cn("display block uppercase leading-none", size === "sm" ? "text-[10px]" : "text-[12px]", state === "inactive" ? "text-text-faint" : "text-text")}>{code}{suffix}</span>}
      {size !== "sm" && <span className={cn("mt-0.5 block truncate text-[13px] font-semibold", state === "inactive" ? "text-text-faint" : "text-text")}>{identity.name}</span>}
    </span>
  </span>;
}