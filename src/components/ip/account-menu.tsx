import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useMyProfile } from "@/hooks/use-profile";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

const itemClass =
  "tap flex w-full items-center gap-2 rounded-[5px] px-2 text-left text-[13px] text-text-dim hover:bg-surface-3 hover:text-text";

export function AccountMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useMyProfile();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const metaName =
    (user?.user_metadata?.["full_name"] as string | undefined) ??
    (user?.user_metadata?.["name"] as string | undefined) ??
    "";
  const name = profile?.fullName || metaName;
  const email = user?.email ?? "";

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

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
          "tap flex items-center justify-center rounded-full border border-transparent transition-colors duration-150 ease-out",
          open && "border-cream",
        )}
      >
        <Avatar url={profile?.avatarUrl} name={name} email={email} size={36} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-[248px] rounded-[6px] border border-wire bg-surface-2 p-2"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => go("/settings/profile")}
            className="tap flex w-full items-center gap-3 rounded-[5px] px-2 text-left hover:bg-surface-3"
          >
            <Avatar url={profile?.avatarUrl} name={name} email={email} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-text">{name || "Coach"}</span>
              <span className="block truncate text-[11.5px] text-text-faint">
                {profile?.role || email}
              </span>
            </span>
          </button>

          <div className="my-1 h-px bg-wire-2" />

          <button type="button" role="menuitem" onClick={() => go("/settings/profile")} className={itemClass}>
            Edit profile
          </button>
          <button type="button" role="menuitem" onClick={() => go("/signup/club")} className={itemClass}>
            Add a team
          </button>
          <button type="button" role="menuitem" onClick={() => go("/upload")} className={itemClass}>
            Upload a match
          </button>

          <div className="my-1 h-px bg-wire-2" />

          <button type="button" role="menuitem" onClick={() => go("/settings/club")} className={itemClass}>
            Club setup
          </button>
          <button type="button" role="menuitem" onClick={() => go("/settings/account")} className={itemClass}>
            Account
          </button>
          <button type="button" role="menuitem" onClick={() => go("/glossary")} className={itemClass}>
            Glossary
          </button>

          <div className="my-1 h-px bg-wire-2" />

          <button type="button" role="menuitem" onClick={signOut} className={itemClass}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
