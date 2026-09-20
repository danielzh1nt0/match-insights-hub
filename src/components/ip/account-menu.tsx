import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initialsFor, useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const name =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    (user?.user_metadata?.["name"] as string | undefined) ??
    "";
  const email = user?.email ?? "";

  async function signOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="Your account"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "tap flex items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-150 ease-out",
          "h-9 w-9 border-wire bg-surface-2 text-text-dim hover:text-text",
          open && "border-cream text-cream",
        )}
      >
        {initialsFor(name, email)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-[220px] rounded-[6px] border border-wire bg-surface-2 p-2"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="truncate text-[13px] font-semibold text-text">{name || "Coach"}</p>
            <p className="truncate text-[11.5px] text-text-faint">{email}</p>
          </div>
          <div className="my-1 h-px bg-wire-2" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/settings/club" });
            }}
            className="tap flex w-full items-center rounded-[5px] px-2 text-left text-[13px] text-text-dim hover:bg-surface-3 hover:text-text"
          >
            Club setup
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/settings/account" });
            }}
            className="tap flex w-full items-center rounded-[5px] px-2 text-left text-[13px] text-text-dim hover:bg-surface-3 hover:text-text"
          >
            Account
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/glossary" });
            }}
            className="tap flex w-full items-center rounded-[5px] px-2 text-left text-[13px] text-text-dim hover:bg-surface-3 hover:text-text"
          >
            Glossary
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="tap flex w-full items-center rounded-[5px] px-2 text-left text-[13px] text-text-dim hover:bg-surface-3 hover:text-text"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
