import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ip/primitives";
import { PublicShell } from "@/components/ip/public-shell";
import { GLOSSARY } from "@/lib/glossary";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "Glossary — every Ipanema number in plain words" },
      {
        name: "description",
        content:
          "What each number on your match screens means, why it matters and what a good one looks like. No jargon.",
      },
      { property: "og:title", content: "Glossary — every Ipanema number in plain words" },
      {
        property: "og:description",
        content: "Pressure inside 2 seconds, length back to front, better pass available — explained plainly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Glossary,
});

function Glossary() {
  return (
    <PublicShell>
      <header className="tactical-grid border border-wire bg-workspace px-4 py-8 md:px-7 md:py-10">
        <p className="section-kicker">Coaching language</p>
        <h1 className="display mt-2 text-[32px] uppercase text-text">Glossary</h1>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-text-dim">
          Every number we show, in the words you would use on the touchline. Nothing here needs a stats
          background.
        </p>
      </header>

      <nav aria-label="Jump to a term" className="mt-4 flex flex-wrap gap-2">
        {GLOSSARY.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="inline-flex min-h-11 items-center rounded-[3px] border border-wire px-3 text-xs font-semibold text-text-dim transition-colors duration-150 ease-out hover:border-cream/40 hover:text-text"
          >
            {t.term}
          </a>
        ))}
      </nav>

      <dl className="mt-5 flex flex-col gap-3">
        {GLOSSARY.map((t) => (
          <Card key={t.id} id={t.id} className="scroll-mt-20">
            <dt className="display text-[17px] uppercase text-cream">{t.term}</dt>
            <dd className="mt-2">
              <p className="text-[13.5px] leading-relaxed text-text">{t.plain}</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-faint">{t.why}</p>
            </dd>
          </Card>
        ))}
      </dl>

      <p className="mt-6 text-[12.5px] text-text-dim">
        Still unclear?{" "}
        <Link to="/library" className="text-cream underline">
          Open a match
        </Link>{" "}
        and tap the ⓘ on any card to see the same wording next to your own numbers.
      </p>
    </PublicShell>
  );
}
