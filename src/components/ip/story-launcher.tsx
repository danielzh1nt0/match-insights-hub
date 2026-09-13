import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Cream pill that opens the five-slide recap. Sits on ready library cards and
 * at the top of the insights screen.
 */
export function StoryLauncher({
  matchId,
  label = "Watch the 5-slide recap",
  sub = "30 seconds · auto-plays",
  className,
}: {
  matchId: string;
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <Link
      to="/match/$matchId/story"
      params={{ matchId }}
      aria-label={label}
      className={cn(
        "flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className,
      )}
      style={{ background: "linear-gradient(135deg, var(--cream) 0%, #d9d0bb 100%)" }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#111111]" aria-hidden="true">
        <svg width="12" height="14" viewBox="0 0 12 14" fill="var(--cream)">
          <path d="M1 1l10 6-10 6z" />
        </svg>
      </span>
      <span className="flex-1">
        <span className="display-i block text-[16px] leading-[1.1] text-[#111111]">{label}</span>
        <span className="mt-0.5 block text-[11.5px] font-semibold text-[rgba(17,17,17,0.65)]">{sub}</span>
      </span>
      <span className="display-i shrink-0 text-[20px] text-[#111111]" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
