import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "slate" | "light";
const STORE = "ipanema-theme";
const ORDER: Theme[] = ["dark", "slate", "light"];

const LABEL: Record<Theme, string> = {
  dark: "Purple",
  slate: "Slate",
  light: "Paper",
};

const ICON = { dark: Palette, slate: Moon, light: Sun } as const;

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "slate" || value === "light";
}

/**
 * The three grounds the system is drawn on.
 *
 * Slate is the default and the one the screens were designed against; purple is
 * the same system on the Match Analytics ground; paper is the inversion for a
 * bright room or a printout. Structure never changes between them — only the
 * ground — so a screen that works in one works in all three.
 *
 * With nothing saved the app follows the device, which is what most people
 * want. Choosing here pins it on this device with `data-theme`, exactly as the
 * stylesheet expects.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: Theme | null = null;
    try {
      const raw = window.localStorage.getItem(STORE);
      if (isTheme(raw)) saved = raw;
    } catch {
      /* private mode — the choice just won't stick */
    }
    setTheme(
      saved ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
    );
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(STORE, next);
    } catch {
      /* private mode — the choice just won't stick */
    }
  };

  // Until the effect has run there is no way to know which ground is showing,
  // and a wrong icon for one frame is worse than none.
  if (theme === null) return <span className="h-11 w-11" aria-hidden="true" />;

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
  const Icon = ICON[theme];

  return (
    <button
      type="button"
      onClick={() => choose(next)}
      aria-label={`Ground: ${LABEL[theme]}. Switch to ${LABEL[next]}.`}
      title={`${LABEL[theme]} — switch to ${LABEL[next]}`}
      className={cn(
        "tap grid h-11 w-11 place-items-center text-text-dim transition-colors hover:text-text",
      )}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}
