import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Screen } from "./chrome";
import { Wordmark } from "./primitives";

/** Header + footer for pages a visitor can open without an account. */
export function PublicShell({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-wire-2 bg-bg/95 px-4 py-2.5 backdrop-blur md:px-7">
        <Link to="/" aria-label="Ipanema home">
          <Wordmark />
        </Link>
        <Link
          to="/signin"
          className="tap inline-flex items-center rounded-[12px] border border-cream/60 px-4 text-sm font-semibold text-cream transition-colors duration-150 ease-out hover:bg-cream/10"
        >
          Sign in
        </Link>
      </header>
      <Screen className="pb-16 pt-4">{children}</Screen>
      <footer className="border-t border-wire-2 px-4 py-6 md:px-7">
        <p className="mx-auto max-w-[1400px] text-[11.5px] leading-relaxed text-text-faint">
          {note ?? "Match analysis that ends in Tuesday's session."}
        </p>
      </footer>
    </div>
  );
}
