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
  return <div className="min-h-screen bg-bg"><AppHeader backTo="/library"/><Screen className="tactical-grid min-h-[calc(100vh-64px)] py-7"><p className="section-kicker">Settings</p><h1 className="display mt-2 text-[28px] uppercase text-text">Club</h1><div className="mt-5 grid gap-3 md:grid-cols-2"><Card><div className="flex items-center gap-3"><span className="display-i grid h-12 w-12 place-items-center rounded-[3px] border border-wire bg-surface-2 text-[22px] text-cream">{club.crestInitial}</span><div><h2 className="font-semibold text-text">{club.name}</h2><p className="text-[12px] text-text-faint">{club.country}</p></div></div></Card><Card><h2 className="display text-[16px] uppercase text-cream">Teams</h2><div className="mt-2 space-y-2">{teams.map((team) => <div key={team.id} className="flex items-center justify-between border-t border-wire-2 pt-2 text-[13px]"><span className="text-text">{team.name}</span><span className="text-text-faint">{team.ageGroup}</span></div>)}</div></Card><Card><h2 className="display text-[16px] uppercase text-cream">Targets</h2><p className="mt-2 text-[13px] text-text-dim">Press in 2 s: {targets.pressWithin2s}% · Regain in 5 s: {targets.regainWithin5s}% · Block ceiling: {targets.blockLengthCeiling} m</p></Card><Card><h2 className="display text-[16px] uppercase text-text-faint">Billing</h2><p className="mt-2 text-[13px] text-text-dim">Billing will appear here when plans are available.</p></Card></div><Link to="/onboarding" className="tap mt-4 flex items-center justify-center rounded-[3px] bg-cream px-5 text-sm font-semibold text-primary-foreground">Edit club setup</Link></Screen></div>;
}