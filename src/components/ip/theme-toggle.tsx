import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const STORE = "ipanema-theme";

/**
 * Dark or light, as the prototype has it.
 *
 * With no choice saved the app follows the device, which is what most people
 * want; picking one here pins it on this device with `data-theme`, exactly as
 * the stylesheet expects.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: Theme | null = null;
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw === "dark" || raw === "light") saved = raw;
    } catch {
      /* private mode — the choice just won't stick */
    }
    setTheme(saved ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
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

  // Until the effect has run there is no way to know which theme is showing,
  // and a wrong icon for one frame is worse than none.
  if (theme === null) return <span className="h-11 w-11" aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={() => choose(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
      className="tap grid h-11 w-11 place-items-center rounded-[10px] text-text-dim transition-colors hover:text-text"
    >
      {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  );
}
