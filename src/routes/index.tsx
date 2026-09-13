import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useSession } from "@/hooks/use-session";
import { Wordmark, PrimaryButton, SecondaryButton, Card } from "@/components/ip/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ipanema — Match analysis that ends in Tuesday's session" },
      {
        name: "description",
        content:
          "Ipanema turns match video into three to five coach-readable findings, every number backed by a clip, and a printable training session.",
      },
      { property: "og:title", content: "Ipanema — Football match analysis for coaches" },
      {
        property: "og:description",
        content: "Findings, not dashboards. Every number has a clip. It writes the session.",
      },
    ],
  }),
  component: Landing,
});

const claims = [
  {
    title: "Findings, not dashboards",
    body: "Three to five coach-readable findings per match. The numbers have targets. The targets have drills.",
    shot: (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="num text-[34px] text-cream">3</span>
        <span className="mt-1 text-[10px] text-text-faint">better options missed</span>
      </div>
    ),
  },
  {
    title: "Every number has a clip",
    body: "Tap a finding, watch the moment. Every event in the feed seeks the video to the second.",
    shot: (
      <div className="pitch-turf relative h-full w-full">
        <span className="absolute left-[30%] top-[40%] h-2.5 w-2.5 rounded-full bg-team-a" />
        <span className="absolute left-[58%] top-[62%] h-2.5 w-2.5 rounded-full bg-team-b" />
        <span className="num absolute bottom-2 right-2 text-[12px] text-cream">0:14</span>
      </div>
    ),
  },
  {
    title: "It writes the session",
    body: "Findings turn into a printable training plan with drills, timings and coaching points.",
    shot: (
      <div className="flex h-full flex-col justify-center bg-[#fdfdfd] p-3">
        <span className="display text-[13px] text-[#111315]">Rondo · lane rule</span>
        <span className="mt-1 text-[10px] text-[#666]">20 min</span>
      </div>
    ),
  },
];

const steps = [
  { n: "01", title: "Upload", body: "Drop a video. Choose the teams and the date." },
  { n: "02", title: "Analysed", body: "About 30 minutes for a 45-minute half." },
  { n: "03", title: "Findings", body: "Three to five, with moments and targets." },
  { n: "04", title: "Session", body: "A printable plan for the next training." },
];

const audiences = [
  {
    title: "Youth academies",
    body: "Age-group targets, player pages, and a session that fits a 60-minute slot.",
  },
  { title: "Amateur clubs", body: "One camera, one clip, findings the whole staff can read." },
  { title: "Individual coaches", body: "No analyst needed. Upload after the game, plan on Sunday." },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="display mb-5 text-[15px] tracking-[0.06em] text-text-dim">{children}</h2>
  );
}

function Landing() {
  const { session } = useSession();
  const signedIn = Boolean(session);

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-7">
        <Wordmark size="sm" />
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link to="/library">
              <PrimaryButton className="h-11">Open your library</PrimaryButton>
            </Link>
          ) : (
            <>
              <Link to="/signin">
                <SecondaryButton className="h-11">Sign in</SecondaryButton>
              </Link>
              <Link to="/signup" className="hidden sm:block">
                <PrimaryButton className="h-11">Request access</PrimaryButton>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pb-20 md:px-7">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="border-b border-wire-2 py-14 text-center md:py-20"
        >
          <Wordmark size="lg" className="block md:hidden" />
          <Wordmark size="hero" className="hidden md:block" />
          <h1 className="mx-auto mt-5 max-w-[620px] text-[19px] leading-snug text-text md:text-[24px]">
            Match analysis that ends in Tuesday's session.
          </h1>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {signedIn ? (
              <Link to="/library">
                <PrimaryButton className="h-12 px-7">Open your library</PrimaryButton>
              </Link>
            ) : (
              <>
                <Link to="/signin">
                  <PrimaryButton className="h-12 px-7">Sign in</PrimaryButton>
                </Link>
                <Link to="/signup">
                  <SecondaryButton className="h-12 px-7">Request access</SecondaryButton>
                </Link>
              </>
            )}
          </div>

          <div className="relative mx-auto mt-10 aspect-[16/9] w-full max-w-[900px] overflow-hidden rounded-[16px] border border-wire pitch-turf">
            <video
              className="h-full w-full object-cover opacity-70"
              muted
              loop
              autoPlay
              playsInline
              aria-label="Looping sample of an analysed match clip"
            />
            <span className="absolute left-3.5 top-3.5 rounded-[8px] bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              Köln · controlled
            </span>
            <span className="num absolute right-3.5 top-3.5 rounded-[8px] bg-black/60 px-2.5 py-1 text-[14px] text-cream backdrop-blur">
              0:14
            </span>
            <span className="absolute left-[34%] top-[46%] h-3 w-3 rounded-full bg-team-a" />
            <span className="absolute left-[52%] top-[58%] h-3 w-3 rounded-full bg-team-b" />
            <span className="absolute left-[64%] top-[36%] h-3 w-3 rounded-full bg-team-b" />
          </div>
        </motion.section>

        {/* Claims */}
        <section className="border-b border-wire-2 py-12">
          <SectionTitle>What it does</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {claims.map((c) => (
              <Card key={c.title}>
                <h3 className="display text-[17px] text-cream">{c.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-text-dim">{c.body}</p>
                <div className="mt-4 h-[132px] overflow-hidden rounded-[12px] border border-wire bg-surface-2">
                  {c.shot}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-wire-2 py-12">
          <SectionTitle>How it works</SectionTitle>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((s) => (
              <Card key={s.n} small>
                <span className="num text-[13px] text-text-faint">{s.n}</span>
                <h3 className="display mt-1 text-[17px] text-text">{s.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-dim">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-b border-wire-2 py-12">
          <SectionTitle>Who it's for</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((a) => (
              <Card key={a.title}>
                <h3 className="display text-[17px] text-cream">{a.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-text-dim">{a.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 py-10 text-[12px] text-text-faint md:flex-row md:items-center md:justify-between">
          <Wordmark size="sm" />
          <div className="flex flex-wrap gap-5">
            <a href="mailto:hello@ipanema.football" className="tap inline-flex items-center hover:text-text-dim">
              hello@ipanema.football
            </a>
            <a href="#privacy" className="tap inline-flex items-center hover:text-text-dim">
              Privacy
            </a>
            <a href="#terms" className="tap inline-flex items-center hover:text-text-dim">
              Terms
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
