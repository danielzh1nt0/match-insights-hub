import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { ClipboardList, Pencil, Play, Plus } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { Wordmark } from "@/components/ip/primitives";
import {
  ClipFigure,
  DrillFigure,
  TelestrationFigure,
  TerritoryFigure,
  TriggerGapFigure,
  TurnoverFigure,
} from "@/components/landing/landing-visuals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ipanema — Football match analysis for coaches" },
      {
        name: "description",
        content:
          "Upload the match. Get back the three things that decided it, the clips that prove each one, and a session plan built from them.",
      },
      { property: "og:title", content: "From final whistle to Tuesday's session" },
      {
        property: "og:description",
        content: "Findings, not dashboards. Every number has a clip. It writes the session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/* ---------------- The product, drawn rather than screenshotted ---------------- */

/**
 * A simplified Insights screen for the hero.
 *
 * Drawn in markup rather than shipped as a screenshot so it stays in the
 * system's colours, stays sharp on any display, and cannot go stale when the
 * product moves. Every figure on it is one the pipeline really produces.
 */
function HeroPanel() {
  return (
    <div className="border border-wire bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-wire px-4 py-3">
        <span className="label-xs text-text-faint">Match debrief · U16</span>
        <span className="label-xs border border-positive/50 px-2 py-1 text-positive">
          9 of 22 confirmed
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <p className="display-i text-[clamp(16px,1.7vw,22px)] leading-tight text-text-bright">
          &ldquo;We won it twice. They walked back in once.&rdquo;
        </p>

        <div className="rule-x grid grid-cols-3 border-y border-wire">
          {[
            { value: "42%", label: "Pressed under 2s", tone: "text-text-bright" },
            { value: "14–8", label: "Shots", tone: "text-accent-sea" },
            { value: "2.1s", label: "Reaction time", tone: "text-positive" },
          ].map((figure) => (
            <div key={figure.label} className="py-3 pr-3 first:pl-0 [&:not(:first-child)]:pl-3">
              <p className={`num text-[clamp(24px,3vw,40px)] leading-none ${figure.tone}`}>
                {figure.value}
              </p>
              <p className="label-xs mt-1.5 text-text-faint">{figure.label}</p>
            </div>
          ))}
        </div>

        <TurnoverFigure />
        <TerritoryFigure />
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

function Landing() {
  const { session } = useSession();
  const signedIn = Boolean(session);

  return (
    <div className="min-h-screen">
      <header className="border-b border-wire">
        <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center gap-4 px-4 md:px-7">
          <Link to="/" aria-label="Ipanema" className="flex items-center gap-2.5">
            <Wordmark size="sm" />
            <span className="label-xs border border-wire px-1.5 py-1 text-text-faint">
              Tactical
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-2 sm:gap-4">
            {signedIn ? (
              <Link to="/library" className="btn btn-primary">
                Your matches
              </Link>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="label-sm px-2 text-text-dim transition-colors hover:text-text"
                >
                  Sign in
                </Link>
                <Link to="/signup" className="btn btn-primary">
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative z-[1] mx-auto max-w-[1440px] px-4 py-14 md:px-7 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="label-sm text-accent-sea">For youth football coaches</p>
            <h1 className="display-i mt-4 text-[clamp(32px,4.4vw,54px)] leading-[0.94] text-text-bright">
              From final whistle
              <br />
              to Tuesday&rsquo;s session
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-text-dim md:text-[17px]">
              Upload the match. Get back the three things that decided it, the clips that prove each
              one, and a session plan built from them.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup" className="btn btn-primary">
                Start free with one match
              </Link>
              <Link to="/glossary" className="btn btn-secondary">
                See what you get back
              </Link>
            </div>
            <p className="mt-4 text-[12.5px] text-text-faint">
              No card. One match, free, start to finish.
            </p>
          </div>

          <HeroPanel />
        </div>
      </section>

      {/* ---------------- What it gives back ---------------- */}
      <section className="border-y border-wire" aria-labelledby="what-you-get">
        <h2 id="what-you-get" className="sr-only">
          What you get back
        </h2>
        <div className="rule-x mx-auto grid max-w-[1440px] md:grid-cols-2 xl:grid-cols-4">
          <Feature
            icon={Plus}
            title="The one thing to fix"
            body="Every match returns a single headline finding, with the number behind it and the target you set. Not a dashboard of forty metrics."
            figure={<TriggerGapFigure />}
          />
          <Feature
            icon={Play}
            title="The clips that prove it"
            body="Each finding carries its moments. Tap one and the video is already at the right second, ready to share to your staff group."
            figure={<ClipFigure />}
          />
          <Feature
            icon={Pencil}
            title="Telestration on every clip"
            body="Draw straight onto the video before you send it. Circle a player, mark the run, or point an arrow at the space they missed."
            figure={<TelestrationFigure />}
          />
          <Feature
            icon={ClipboardList}
            title="Tuesday's session"
            body="The finding becomes a session plan with drills, durations and pitch diagrams you can print and take out with you."
            figure={<DrillFigure />}
          />
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mx-auto max-w-[1440px] px-4 py-14 md:px-7 md:py-20" aria-labelledby="how">
        <p className="label-sm text-accent-sea">Methodology</p>
        <h2
          id="how"
          className="display-i mt-2 text-[clamp(26px,3.6vw,40px)] leading-none text-text-bright"
        >
          From file to the grass
        </h2>

        <ol className="rule-x mt-7 grid border border-wire sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Upload", "One video file from any fixed camera. MP4 or MOV."],
            [
              "We watch it",
              "Players, ball and every turnover, tracked. About thirty minutes for a half.",
            ],
            [
              "You read it",
              "Three findings, the clips behind them, and the tools to mark up what you want them to see.",
            ],
            [
              "You coach it",
              "Build Tuesday's session and share the marked-up clips to your squad.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="p-5">
              <span className="num block text-[32px] leading-none text-text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-text-bright">{title}</h3>
              <p className="mt-2 text-[13px] leading-snug text-text-dim">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- The honesty position ---------------- */}
      <section
        className="mx-auto max-w-[1440px] px-4 pb-14 md:px-7 md:pb-20"
        aria-labelledby="honesty"
      >
        <div className="border border-wire bg-surface p-6 sm:p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center">
            <div>
              <p className="label-sm text-accent-sea">What we will not do</p>
              <h2
                id="honesty"
                className="display-i mt-3 text-[clamp(26px,3.4vw,38px)] leading-none text-text-bright"
              >
                We don&rsquo;t invent numbers
              </h2>
              <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-text-dim">
                When the camera loses the ball, we say so. A figure we can&rsquo;t stand behind is
                marked withheld, with the reason next to it. You will never take a number into a
                dressing room that we made up.
              </p>
            </div>

            {/* The real withheld treatment, exactly as it appears in the product. */}
            <div className="border border-wire bg-surface-2 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-text-bright">Block length</span>
                <span className="text-[15px] font-medium text-text-dim">Withheld</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-snug text-text-faint">
                Ball tracking below threshold in the second half.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Who it is for ---------------- */}
      <section className="border-y border-wire" aria-label="Who Ipanema is for">
        <ul className="rule-x mx-auto grid max-w-[1440px] sm:grid-cols-2 xl:grid-cols-4">
          {[
            "Youth and academy coaches, from U13 up",
            "Clubs filming on a tripod, a club camera or a phone",
            "Anyone who runs the session as well as the analysis",
            "Coaches who want to draw on a clip in seconds, not hours",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 p-5">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-positive"
              />
              <span className="text-[13.5px] leading-snug text-text">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- Closing ---------------- */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 text-center md:px-7 md:py-24">
        <h2 className="display-i mx-auto max-w-[20ch] text-[clamp(30px,5vw,54px)] leading-[0.95] text-text-bright">
          Your next match is Tuesday&rsquo;s session
        </h2>
        <div className="mt-8 flex justify-center">
          <Link to="/signup" className="btn btn-primary">
            Start free with one match
          </Link>
        </div>
        <p className="mt-4 text-[12.5px] text-text-faint">One match, free. No card.</p>
      </section>

      <footer className="border-t border-wire">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-7">
          <Wordmark size="sm" />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/signin"
              className="text-[12.5px] text-text-dim transition-colors hover:text-text"
            >
              Sign in
            </Link>
            <Link
              to="/glossary"
              className="text-[12.5px] text-text-dim transition-colors hover:text-text"
            >
              Glossary
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
  figure,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  figure: ReactNode;
}) {
  return (
    <div className="flex flex-col p-5 md:p-6">
      <span className="grid h-10 w-10 place-items-center border border-wire text-accent-sea">
        <Icon size={18} strokeWidth={1.75} aria-hidden={true} />
      </span>
      <h3 className="display-i mt-4 text-[19px] leading-none text-text-bright">{title}</h3>
      <p className="mt-3 flex-1 text-[13.5px] leading-snug text-text-dim">{body}</p>
      <div className="mt-5">{figure}</div>
    </div>
  );
}
