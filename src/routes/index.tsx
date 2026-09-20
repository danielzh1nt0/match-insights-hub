import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, Play, Target } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Wordmark, PrimaryButton, SecondaryButton } from "@/components/ip/primitives";
import bvbCrest from "@/assets/bvb-crest.png.asset.json";
import bayernCrest from "@/assets/bayern-crest.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ipanema — Football match analysis for coaches" },
      { name: "description", content: "Turn match footage into clear coaching findings, reviewable clips, and Tuesday's training session." },
      { property: "og:title", content: "Ipanema — Football match analysis for coaches" },
      { property: "og:description", content: "Findings, not dashboards. Every number has a clip. It writes the session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function TacticalPreview() {
  return (
    <div className="overflow-hidden rounded-[8px] border border-wire bg-workspace">
      <div className="flex min-h-14 items-center justify-between border-b border-wire-2 px-4">
        <span className="section-kicker">Match review · Full time</span>
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-quality-good" /> Analysis ready
        </span>
      </div>
      <div className="grid lg:grid-cols-[180px_minmax(0,1fr)_220px]">
        <aside className="hidden border-r border-wire-2 p-4 lg:block">
          <p className="section-kicker text-cream">Coach summary</p>
          <div className="mt-4 space-y-2">
            {["Insights", "Match", "Territory", "Stats"].map((item, index) => (
              <div key={item} className={`flex min-h-10 items-center gap-3 rounded-[5px] px-3 text-[11px] font-bold uppercase ${index === 0 ? "bg-surface-2 text-cream" : "text-text-faint"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-cream" : "bg-wire"}`} />{item}
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-wire-2 pt-4">
            <p className="text-[10px] uppercase text-text-faint">Next session</p>
            <p className="display mt-1 text-[16px] text-text">Tuesday · 18:30</p>
            <p className="mt-1 text-[11px] text-text-dim">3 drills · 68 min</p>
          </div>
        </aside>

        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center gap-5 border-b border-wire-2 pb-5 md:gap-10">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src={bvbCrest.url} alt="Borussia Dortmund" className="h-10 w-10 object-contain md:h-12 md:w-12" />
              <span className="display hidden text-[15px] text-text sm:block">Dortmund</span>
            </div>
            <span className="display-i text-[40px] leading-none text-cream md:text-[52px]">2 : 1</span>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="display hidden text-[15px] text-text sm:block">FC Bayern</span>
              <img src={bayernCrest.url} alt="FC Bayern München" className="h-10 w-10 object-contain md:h-12 md:w-12" />
            </div>
          </div>

          <div className="mt-4 border border-wire bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">01 · Defensive transition</p>
                <h3 className="display-i mt-2 max-w-[420px] text-[26px] leading-[.95] text-cream md:text-[32px]">The first pressure arrived too late</h3>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-wire text-text-faint"><Target size={15} /></span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_124px]">
              <div className="tactical-grid relative min-h-[166px] overflow-hidden border border-wire-2 bg-surface-2">
                <svg viewBox="0 0 100 58" className="absolute inset-0 h-full w-full" role="img" aria-label="Tactical pitch showing a late defensive pressure">
                  <g fill="none" stroke="var(--cream)" strokeOpacity=".18" strokeWidth=".35"><rect x="3" y="3" width="94" height="52"/><line x1="50" y1="3" x2="50" y2="55"/><circle cx="50" cy="29" r="8"/><rect x="3" y="17" width="13" height="24"/><rect x="84" y="17" width="13" height="24"/></g>
                  <path d="M26 40 C40 30 54 35 70 18" fill="none" stroke="var(--cream)" strokeWidth="1.1" strokeDasharray="2 2"/>
                  {[{x:25,y:40,c:"var(--club-bvb)"},{x:39,y:34,c:"var(--club-bvb)"},{x:57,y:31,c:"var(--club-bvb)"},{x:69,y:18,c:"var(--club-bayern)"},{x:75,y:34,c:"var(--club-bayern)"}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2.4" fill={p.c}/>) }
                  <circle cx="66" cy="21" r="1.1" fill="var(--cream)"/>
                </svg>
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 bg-bg/90 px-2.5 py-1.5 text-[10px] font-bold text-cream"><Play size={11} fill="currentColor"/> 64:18</span>
              </div>
              <div className="grid grid-cols-2 gap-px border border-wire-2 bg-wire-2 sm:grid-cols-1">
                <div className="bg-surface-2 p-3"><strong className="display-i text-[31px] leading-none text-cream">4.8s</strong><span className="mt-1 block text-[9px] uppercase text-text-faint">Reaction</span></div>
                <div className="bg-surface-2 p-3"><strong className="display-i text-[31px] leading-none text-cream">7</strong><span className="mt-1 block text-[9px] uppercase text-text-faint">Moments</span></div>
              </div>
            </div>
            <p className="mt-4 border-l-2 border-cream pl-3 text-[12px] leading-relaxed text-text-dim">When possession turned over, the nearest player delayed instead of closing the first pass.</p>
          </div>
        </div>

        <aside className="hidden border-l border-wire-2 p-4 lg:flex lg:flex-col">
          <p className="section-kicker">Match facts</p>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-wire-2 bg-wire-2">
            {[['61%','Ball'],['9','Regains'],['4.8s','Reaction'],['3','Findings']].map(([value,label]) => (
              <div key={label} className="bg-surface-2 p-3"><strong className="num text-[24px] text-cream">{value}</strong><span className="block text-[9px] uppercase text-text-faint">{label}</span></div>
            ))}
          </div>
          <div className="mt-auto border-t border-wire-2 pt-4 text-[11px] text-text-dim">
            <p className="inline-flex items-center gap-2"><Check size={13} className="text-quality-good" /> Evidence checked</p>
            <p className="mt-2 inline-flex items-center gap-2"><Check size={13} className="text-quality-good" /> Session ready</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Landing() {
  const { session } = useSession();
  const signedIn = Boolean(session);
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-wire-2">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between px-4 md:px-7">
          <div className="flex items-center gap-3"><span className="display-i grid h-9 w-9 place-items-center rounded-[6px] border border-cream text-[21px] text-cream">I</span><Wordmark size="sm" /></div>
          <nav className="flex items-center gap-2">
            {!signedIn && <Link to="/signin"><SecondaryButton>Sign in</SecondaryButton></Link>}
            <Link to={signedIn ? "/library" : "/signup"}><PrimaryButton>{signedIn ? "Open library" : "Request access"}</PrimaryButton></Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="tactical-grid border-b border-wire-2">
          <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-12 md:px-7 md:pb-20 md:pt-20">
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.28,ease:"easeOut"}} className="max-w-[850px]">
              <p className="section-kicker">Match intelligence for football coaches</p>
              <h1 className="display-i mt-4 text-[54px] leading-[.86] text-cream sm:text-[72px] lg:text-[96px]">FROM FINAL WHISTLE<br/>TO TUESDAY’S SESSION.</h1>
              <p className="mt-5 max-w-[620px] text-[15px] leading-relaxed text-text-dim md:text-[17px]">Ipanema turns your match footage into clear findings, reviewable moments, and a training plan your staff can use.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={signedIn ? "/library" : "/signup"}><PrimaryButton className="h-12 px-6">{signedIn ? "Open your library" : "Request access"}<ArrowRight size={16}/></PrimaryButton></Link>
                {!signedIn && <Link to="/signin"><SecondaryButton className="h-12 px-6">Sign in</SecondaryButton></Link>}
              </div>
            </motion.div>
            <div className="mt-10 lg:mt-14"><TacticalPreview /></div>
          </div>
        </section>
        <section className="mx-auto grid max-w-[1440px] gap-px border-x border-wire-2 bg-wire-2 md:grid-cols-3">
          {[
            ["01", "Find the pattern", "Three to five coaching findings, ranked by what changes the next performance."],
            ["02", "Watch the evidence", "Every claim opens the exact match moment, ready for your review."],
            ["03", "Train the response", "Turn confirmed findings into drills, timings, cues, and progressions."],
          ].map(([number,title,body])=><article key={number} className="bg-bg p-6 md:p-8"><span className="num text-[12px] text-text-faint">{number}</span><h2 className="display-i mt-5 text-[27px] text-cream">{title}</h2><p className="mt-2 max-w-[360px] text-[13px] leading-relaxed text-text-dim">{body}</p></article>)}
        </section>
      </main>
    </div>
  );
}