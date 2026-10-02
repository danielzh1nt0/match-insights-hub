import { cn } from "@/lib/utils";

export type TeamIdentity = {
  name: string;
  shortCode: string;
  kitColour: string;
  crestUrl?: string | undefined;
  monogram?: string;
};

/** Club-type suffixes that belong in the code rather than being reduced to one letter. */
const CLUB_SUFFIX = /^(FK|IF|BK|SK|FC|IK|AIF|GIF|GAIS|BoIS|IFK)$/i;

/**
 * The three or four letters a club is actually called on a team sheet.
 *
 * Initials alone turn Sollentuna FK into "SF", which no one writing a team
 * sheet would recognise. Where the name ends in a club type the convention is
 * to keep it whole — Sollentuna FK is SFK, Djurgårdens IF is DIF.
 */
export function shortTeamCode(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();

  const last = words[words.length - 1]!;
  if (CLUB_SUFFIX.test(last) && words.length >= 2) {
    const lead = words
      .slice(0, -1)
      .map((word) => word[0])
      .join("");
    return `${lead}${last}`.slice(0, 4).toUpperCase();
  }
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function TeamToken({
  identity,
  size = "sm",
  state = "active",
  suffix,
  mirrored = false,
  className,
}: {
  identity: TeamIdentity;
  size?: "sm" | "md" | "lg";
  state?: "active" | "inactive" | "compare";
  suffix?: string | undefined;
  mirrored?: boolean;
  className?: string;
}) {
  const tile = size === "lg" ? "h-11 w-11" : size === "md" ? "h-7 w-7" : "h-[22px] w-[22px]";
  const code = identity.shortCode || shortTeamCode(identity.name);
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2",
        mirrored && "flex-row-reverse text-right",
        state === "inactive" && "opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden border border-cream/15",
          tile,
          state === "active" && "ring-2 ring-cream ring-offset-2 ring-offset-surface",
        )}
        style={{ background: identity.kitColour }}
        aria-hidden="true"
      >
        {identity.crestUrl ? (
          <img src={identity.crestUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span
            className={cn(
              "display-i leading-none text-text",
              size === "lg" ? "text-[22px]" : size === "md" ? "text-[14px]" : "text-[11px]",
            )}
          >
            {identity.monogram ?? code.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="min-w-0">
        {size !== "lg" && (
          <span
            className={cn(
              "display block uppercase leading-none",
              size === "sm" ? "text-[10px]" : "text-[12px]",
              state === "inactive" ? "text-text-faint" : "text-text",
            )}
          >
            {code}
            {suffix}
          </span>
        )}
        {size !== "sm" && (
          <span
            className={cn(
              "mt-0.5 block truncate text-[13px] font-semibold",
              state === "inactive" ? "text-text-faint" : "text-text",
            )}
          >
            {identity.name}
          </span>
        )}
      </span>
    </span>
  );
}
