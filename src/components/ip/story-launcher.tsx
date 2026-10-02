import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Cream pill that opens the five-slide recap.
 *
 * `size="sm"` is for the library, where one of these sits on every card: at
 * full size it outshouts the scoreline, which is what the coach is actually
 * scanning for.
 */
export function StoryLauncher({
  matchId,
  label = "Watch the 5-slide recap",
  sub = "30 seconds · auto-plays",
  size = "lg",
  className,
}: {
  matchId: string;
  label?: string;
  sub?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const small = size === "sm";
  return (
    <Link
      to="/match/$matchId/story"
      params={{ matchId }}
      aria-label={label}
      className={cn(
        "flex items-center text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        small ? "min-h-11 gap-2 px-3 py-2" : "gap-3 px-3.5 py-3",
        className,
      )}
      style={{ background: "linear-gradient(135deg, var(--cream) 0%, #d9d0bb 100%)" }}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-[#111111]", small ? "h-6 w-6" : "h-9 w-9")} aria-hidden="true">
        <svg width={small ? 9 : 12} height={small ? 10 : 14} viewBox="0 0 12 14" fill="var(--cream)">
          <path d="M1 1l10 6-10 6z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("display-i block leading-[1.1] text-[#111111]", small ? "truncate text-[12.5px]" : "text-[16px]")}>{label}</span>
        {!small && <span className="mt-0.5 block text-[11.5px] font-semibold text-[rgba(17,17,17,0.65)]">{sub}</span>}
      </span>
      <span className={cn("display-i shrink-0 text-[#111111]", small ? "text-[15px]" : "text-[20px]")} aria-hidden="true">
        →
      </span>
    </Link>
  );
}
