import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card } from "@/components/ip/primitives";
import { useApp } from "@/store/app-store";

export const Route = createFileRoute("/_authenticated/settings/club")({
  head: () => ({ meta: [{ title: "Club settings — Ipanema" }, { name: "description", content: "Manage your club, teams, colours and coaching targets." }, { property: "og:title", content: "Club settings — Ipanema" }, { property: "og:description", content: "Manage your club, teams, colours and coaching targets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ClubSettings,
});

function ClubSettings() {
  const { club, teams, targets } = useApp();
  return <div className="min-h-screen bg-bg"><AppHeader backTo="/library"/><Screen className="py-5"><h1 className="display text-[24px] uppercase text-cream">Club</h1><Card className="mt-4 rounded-[14px]"><div className="flex items-center gap-3"><span className="display-i grid h-12 w-12 place-items-center rounded-[10px] border border-wire bg-surface-2 text-[22px] text-cream">{club.crestInitial}</span><div><h2 className="font-semibold text-text">{club.name}</h2><p className="text-[12px] text-text-faint">{club.country}</p></div></div></Card><Card className="mt-3 rounded-[14px]"><h2 className="display text-[16px] uppercase text-cream">Teams</h2><div className="mt-2 space-y-2">{teams.map((team) => <div key={team.id} className="flex items-center justify-between border-t border-wire-2 pt-2 text-[13px]"><span className="text-text">{team.name}</span><span className="text-text-faint">{team.ageGroup}</span></div>)}</div></Card><Card className="mt-3 rounded-[14px]"><h2 className="display text-[16px] uppercase text-cream">Targets</h2><p className="mt-2 text-[13px] text-text-dim">Press in 2 s: {targets.pressWithin2s}% · Regain in 5 s: {targets.regainWithin5s}% · Block ceiling: {targets.blockLengthCeiling} m</p></Card><Link to="/onboarding" className="tap mt-4 flex items-center justify-center rounded-[12px] bg-cream px-5 text-sm font-semibold text-primary-foreground">Edit club setup</Link><Card className="mt-3 rounded-[14px]"><h2 className="display text-[16px] uppercase text-text-faint">Billing</h2><p className="mt-2 text-[13px] text-text-dim">Billing will appear here when plans are available.</p></Card></Screen></div>;
}