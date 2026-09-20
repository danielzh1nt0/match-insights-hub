import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, PrimaryButton } from "@/components/ip/primitives";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/account")({
  head: () => ({ meta: [{ title: "Account settings — Ipanema" }, { name: "description", content: "Manage your Ipanema account and sign-in." }, { property: "og:title", content: "Account settings — Ipanema" }, { property: "og:description", content: "Manage your Ipanema account and sign-in." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AccountSettings,
});

function AccountSettings() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  return <div className="min-h-screen bg-bg"><AppHeader backTo="/library"/><Screen className="py-5"><h1 className="display text-[24px] uppercase text-cream">Account</h1><Card className="mt-4 rounded-[14px]"><p className="text-[11px] font-semibold uppercase text-text-faint">Email</p><p className="mt-1 text-[14px] text-text">{user?.email ?? "—"}</p><PrimaryButton className="mt-6" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); window.location.assign("/signin"); }}>Sign out</PrimaryButton></Card><Card className="mt-3 rounded-[14px]"><h2 className="display text-[16px] uppercase text-cream">Notifications</h2><p className="mt-2 text-[13px] text-text-dim">Notification controls will appear here when team alerts are enabled.</p></Card><Card className="mt-3 rounded-[14px]"><h2 className="display text-[16px] uppercase text-text-faint">Delete account</h2><p className="mt-2 text-[13px] text-text-dim">Account deletion requires a secure confirmation flow and is not active yet.</p></Card></Screen></div>;
}