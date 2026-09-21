import { cn } from "@/lib/utils";
import { initialsFor } from "@/hooks/use-session";

export function Avatar({
  url,
  name,
  email,
  size = 36,
  className,
}: {
  url?: string | null | undefined;
  name?: string | null | undefined;
  email?: string | null | undefined;
  size?: number | undefined;
  className?: string | undefined;
}) {
  const initials = initialsFor(name, email);
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-wire bg-surface-2 font-bold text-text-dim",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
