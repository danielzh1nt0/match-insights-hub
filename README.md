# Match Insights Hub

COME UP WITH A PLAN FOR THIS, READ THE DOCuMENTATION CLEARLY AND LOOK ATHTE HTMLThree Lovable Prompts

Paste these into Lovable sequentially. Each builds on the previous. Do not skip ahead — the first two establish the foundation the third depends on.

PROMPT 1 of 3 — Foundation: brand, auth, onboarding, library, upload

Paste this first:

Build the foundation for Ipanema, a football match-analysis app used by coaches. This is phase 1 of 3. Do not build the match view, territory, stats, or player pages yet — those come in phases 2 and 3.

Stack

React + TypeScript

Tailwind CSS with custom tokens (see below — do not use default Tailwind colours)

shadcn/ui adapted to our tokens (override everything)

React Router for navigation

Framer Motion for transitions (150–200 ms ease-out)

Zustand for auth + onboarding + library state

Brand system — lock these in exactly

Fonts — load from Google Fonts:

Display: Barlow Condensed weights 500/600/700/800, including italics

Body: Inter weights 400/500/600/700/800

The display face is used for: wordmark, score, all large stat numbers, timers, event times, section titles, everything that reads as a "big number". It's italic 800 for the wordmark and stat values, 700 non-italic for section titles. Body stays Inter, never italic.

Tokens — define as CSS variables and Tailwind theme extension:

text

--bg: #0b0d10

--surface: #14171c

--surface-2: #1a1e24

--surface-3: #20242c

--wire: #2a3038

--wire-2: #1e232a

--text: #e7eaee

--text-dim: #8b94a3

--text-faint: #5b6472

--cream: #ede6d6

--cream-dim: #b9b3a5

--team-a: #ef4444

--team-b: #22c55e

--quality-good: #34d399

--quality-risky: #f59e0b

--quality-bad: #ef4444

Cream is the only accent. No purple anywhere. No light theme. Buttons use cream background with dark text, or outlined cream. Active chips are cream-filled. Big numbers are cream.

Radii: cards 16pt, small cards 12pt, chips 8–10pt, pills 22pt.

Spacing: base 4pt, standard gaps 8/12/16/20/24.

Motion: 150–200 ms ease-out everywhere. The wordmark fades in over 300 ms on app open and never animates again.

What to build in phase 1

1. Landing page (/) — desktop + mobile

Five sections, no marketing fluff:

Hero: wordmark large, one line "Match analysis that ends in Tuesday's session.", a looping muted video placeholder, buttons Sign in / Request access

Three claims with one screenshot placeholder each: "Findings, not dashboards", "Every number has a clip", "It writes the session"

How it works: Upload → Analysed → Findings → Session, four steps

Who it's for: Youth academies / Amateur clubs / Individual coaches — three cards

Footer: contact, privacy, terms

2. Auth — all at desktop + mobile widths

/signin — email + password, Continue with Google, Forgot password. Inline error state under the field when credentials are wrong.

/signup — name, email, club, role (Head coach / Assistant / Analyst as pill buttons), password, terms checkbox, then a confirmation screen "Check your email"

/reset — email → sent → new password (three states)

3. Onboarding (/onboarding) — three skippable steps

Step 1: Club name, crest upload, country

Step 2: Teams (name, age group, default kit colours — team A red, team B green)

Step 3: Targets — show press within 2s = 60%, regain within 5s = 60%, block length ceiling = 38m. Each with a one-line plain explanation. Options: "Use defaults" or edit.

Progress indicator at the top (three dots). Ends on Library empty state.

4. Library (/library) — the app's home after onboarding

Empty state: "No matches yet" + "+ New analysis" CTA

With matches: cards showing title (from a label map or "Team A – Team B · label needed"), date, competition, duration, status pill (ready / processing / failed), thumbnail

Three summary chips per card: possession split, turnovers, shots

Search bar + filter chips

"+ New analysis" opens the upload sheet

Tapping a card routes to /match/:id/insights (built in phase 2)

5. Upload + Processing (/new and /processing)

New analysis sheet: choose team, opponent, date, competition, home/away; drag-drop video; "Start analysis"

Processing screen: plain-language progress list — "Reading the pitch · Finding players · Following the ball · Working out possession · Writing findings" with checkmarks as stages complete. Estimate line: "about 30 minutes for a 45-minute half". Failure state with plain reason and Retry button.

Sample data

Use this match throughout: 1. FC Köln 1 – 0 Wolfsburg, clip length 0:47, date 2026-09-12, competition "Bundesliga sample", tags #P2009 and #home.

Components to build now (reused later)

Wordmark — accepts size prop (sm 18px, default 24px, lg 72px, hero 88px) — always uses Barlow Condensed 800 italic, uppercase, cream

Card, Chip, Pill, Button (primary/secondary/ghost), Input, Checkbox

AppHeader (mobile) — 3-column grid, centred wordmark, back arrow slot left, avatar right

MatchBar — team badges, team names, score block (cream, display font), period line with gear icon

TeamSelector — 3-button segmented (Team A / Both / Team B)

PeriodSelector — 1st / 2nd / Full segmented, only when match has multiple periods

FloatingNav — bottom nav for mobile, 4 items: Insights · Match · Territory · Stats

PrimaryButton, SecondaryButton, GhostButton

Design rules — non-negotiable

Every screen uses the same grid: padding: 0 16px on mobile, 0 28px on desktop

Every interactive element: 44×44pt minimum tap target

Content padding-bottom on screens with floating nav: ≥ 100px

No emoji anywhere

No light theme

No purple

Build phase 1 completely. Show me the landing on desktop, library on mobile, and the onboarding 3-step flow. I'll review before you move to phase 2.

PROMPT 2 of 3 — The match experience

Paste this after phase 1 is approved:

Now build the match experience for Ipanema. This is phase 2 of 3. Phase 1 (auth, onboarding, library, upload) is done — do not rebuild it.

The rule for every visual in this app

Every chart, map, or pitch has:

A title written as the question it answers — "Where were we with the ball?", "How compact were we?", "Where did we lose it?"

One plain caption under it, max 15 words, in --text-faint 11.5px

An ⓘ button in the top-right that opens a stat info sheet

No jargon on screen — say "shape", "middle of the team", "how stretched". Never "hull", "centroid", "block length".

If a visual can't be captioned in one plain sentence, it doesn't ship.

Build a reusable <Visual> component

This is the most important component of the phase. Props: question, caption, infoContent, children. It renders:

Card with border 1px --wire, radius 14pt, background --surface

Header: question title (Barlow Condensed 17px 700 uppercase, cream) + ⓘ button

Body: children

Caption: 11.5px --text-faint, one line

Use this component for every chart on every screen from now on.

1. Insights (/match/:id/insights) — mobile + desktop

The opening screen when a match opens.

Match bar with team badges, score 1 : 0, period line "1st half · Köln attack →" with gear icon

Team selector (Team A / Both / Team B) + Period selector (1st / 2nd / Full) in a row below the match bar

Coach mark (dismissible, cream background, dark text) pointing at the team selector — shown once per user

"Where was the ball?" — one pitch, ball positions coloured by possession team. Caption: "Which team owned which part of the pitch."

"Who had the ball?" — merged possession ribbon + momentum strip. Ribbon on top (team colours, loose amber, dead grey), tilt below (who spent longer in attacking half). Caption: "Top = who had the ball. Bottom = who spent longer in the attacking half."

Summary card: "The match in three sentences". Text: "KÖLN had 52% of the ball across 42 sequences, averaging 3.4 passes each. 22% of passes went forward and 18 advanced ≥10 m toward goal. After losing the ball, first pressure came in a median 1.12 s and 62% were won back within 5 s." Köln in team A red.

Findings section, first one always visible above the fold:

Finding card: headline, metric value vs target, progress bar with target marker, event count, interpretation, moment timestamps (0:14, 0:28) each with a Watch link, Build session CTA

Sample finding: "3 times a clearly better pass was available and wasn't played." — value 3, target 1, 4 events, interpretation "Decision quality is trainable; execution errors mostly aren't."

2. Match (/match/:id/match) — mobile + desktop

The video screen.

Video card — 16:10 aspect, rounded 16pt, "Köln · controlled" pill top-left, player dots overlay. No event tag on top of the video. No mode switch on top of the video.

Mode switch below the video — 3-button segmented: Video / 2D / Both

Playback bar — play/pause, scrubber with event markers on track, time readout (cream, display font), fullscreen button

Momentum strip — under the playback bar. Field tilt over time as a two-tone ribbon (team A red, team B green) with goals as diamonds and turnovers as ticks. Title: "Field tilt over time"

Filter chips — All / Goals & shots / Turnovers / Passes / Set pieces. Active chip is cream-filled with a count badge: "Turnovers · 14"

Events feed — reads from match_data.events[]. Types and icons:

goal — football icon in team-coloured slot

shot — target icon

turnover_lost / turnover_won — arrows

high_turnover — arrows with upward chevron

pass_bad / pass_risky / better_option — boot icon in red / amber / dashed slot

set_piece — flag icon

sequence_end — end bar

Each row: time (display font) · icon · title · subtitle · play button that seeks to t − 2

No cards, fouls, substitutions, or xG — the pipeline doesn't produce these

Time is in seconds (0:14, not 12')

3. Territory (/match/:id/territory) — mobile + desktop

The third nav tab. Three blocks, stacked on mobile, 2+1 on desktop.

"Where were we with the ball?" — team heat map over time. Pitch with heat blobs, team colour, brighter = more time. Below the pitch: time slider with play button. Two modes: Up to now (accumulates) and Window (30 s adjustable 15/30/60). Phase toggle: With ball / Without ball / Both. Caption: "Brighter = we spent more time there. Drag to see it change."

"How compact were we?" — single horizontal band coloured green (compact) / amber (stretched) / red (very stretched). Under it, one number: "Stretched 34% of the time". Caption: "Red = big gaps between our lines. Tap to watch."

"Where did we lose it — and where did we win it?" — two small pitches side by side. Left: losses as team-colour markers. Right: recoveries with high-zone recoveries drawn bolder. Captions under each: "Each dot is one time we lost the ball." / "Bold dots = won the ball in their final third."

"How did our shape change?" — formation replay. Pitch with eleven dots at smoothed positions (5 s window), team drawn as a soft dashed outline, middle of the team as a small cross. Same time slider. Phase toggle With ball / Without ball. Below the pitch: a strip of snapshots every 30 seconds, tap to jump. Caption: "Watch the team's shape move. Snapshots below every 30 seconds."

The v13 formation card is removed — the heat map with Both + Up to now at the end is the shape.

4. Stats (/match/:id/stats) — mobile + desktop

Four tabs: Ball · Pressing · Shape · Shooting · Players · Passes

Ball — "Which third were we in?" (three stacked bars per team: own / mid / final third). "How long did we keep it?" (five big numbers with tiny bars: 1–2: 18, 3–4: 9, 5–6: 7, 7–8: 5, 9+: 3). "Where did our runs come from?" (run arrows on a pitch, With ball / Without ball toggle)

Pressing — "Where did we press?" (pressing heat map). "How fast did we react?" (dot strip per turnover on 0–8 s axis, team colour, target line at 2 s)

Shape — three medians (block length, block width, defensive line height) with a "See the shape timeline →" link to Territory

Shooting — "Where did we shoot from?" (shot map, filled = goal, bigger = harder shot). Shots / On target / Average distance stat cards

Players — player cards, 3 per row desktop / 1 mobile. Each: team bar, id, time visible, four mini-metrics (touches, passes, pressures, distance), pass-quality strip (good/risky/bad), counterpress ring

Passes — "Where did our passes go?" (pass map, completed team-colour lines + lost red dashed lines, toggle Completed / Zone grid). "Where did we lose passes?" (interception map, opponent-colour heat). Plus the pass log table

5. Player page (/match/:id/player/:pid)

Hero: badge with shirt number (team colour), name, team, time visible, distance, Share button

"Where was #9?" — heat map with time slider

"Where did #9 pass?" — pass sonar (radial chart, dot colour = pass quality, distance from centre = pass length)

"Where did #9 run from?" — run arrows

Best three / worst three moments with tap-to-play replay

Pass-quality strip

Own numbers only — no other player's numbers appear

6. Clip reel (/match/:id/reel)

Header: "Match reel", count, total duration

List of moments in order: number, time, title, editable note input, up/down reorder

Bottom actions: Share link / Export clips

7. Session (/match/:id/session)

White-paper document. Header shows the finding it came from: "From finding: 3 times a clearly better pass... Today 3 · target 1". Regenerate button at the bottom.

Visual component check

Every chart above uses the <Visual> component. Question title, caption, ⓘ. Team selector applies from the match header.

Data bindings

match_data.frames[].players[].m and .px — heat maps, formation, player positions

match_data.frames[].ball.px — ball heat map

match_data.frames[].possession and .phase — phase filters

match_data.events[] — event feed, momentum markers, turnover dots

match_data.periods[].attack_right — direction normalisation

stats.teams[] — possession, sequences, passes, completion, forward share, progressive passes, block medians

stats.metrics.field[team] — field tilt, final-third entries

stats.metrics.high_turnover_counts[team]

stats.metrics.shape_timeline[team][] — compact band

stats.players[] — player cards, sonar, run map

stats.passes[] — pass map, interception map

stats.sequences — sequence length distribution

stats.heatmaps[id] — player heat maps

Build all of phase 2. Show me Insights on mobile, Match on mobile with the momentum strip, Territory on mobile, and Stats on desktop. I'll review before phase 3.

PROMPT 3 of 3 — Share, settings, glossary, polish, tutorial layer

Paste this after phase 2 is approved:

Final phase for Ipanema. Phase 1 (foundation) and phase 2 (match experience) are done. Do not rebuild them. This phase adds share pages, settings, glossary, the tutorial layer, and final polish.

1. Share pages (public, no account needed)

Player share (/s/player/:token) — mobile + desktop

Club crest + club name top-left, IPANEMA wordmark top-right, both in a header bar

Player hero: shirt number badge, name, team, "Match · 1 – 0 · 0:47"

Best three moments with Replay buttons

Worst three moments with Replay buttons

Pass-quality strip

Counterpress rate card: "3 of 4 losses won back within 5s"

No other players' numbers appear

Footer: "Made with Ipanema"

Reel share (/s/reel/:token) — mobile + desktop

Same header

"Match reel · 4 moments · 0:52 total"

Vertical list: time, title, coach's note (italic, quoted), Replay

Footer: "Made with Ipanema"

Both pages are no-auth. Anyone with the link can view.

2. Settings

Account settings (/settings/account)

Profile: name, email, avatar upload

Notifications: Match ready (toggle, default on), Weekly summary (toggle, default off)

Sign out

Delete account (danger, red text)

Club settings (/settings/club)

Club: name, crest

Teams list — add/edit

Players per team — shirt number, name, position, photo. This is what lets tracker ids become names later. List shows shirt number in display font, name, position. Example: "9 · Striker · Forward", "10 · Winger · Attacking mid", "6 · Pivot · Central mid"

Staff — invite by email, role (Head coach / Assistant / Analyst)

Default targets per age group (P15 / P2009 / Adult): press within 2s, regain within 5s, block length ceiling, better options per match

Default team colours

Billing — placeholder card "Available after your trial"

3. Glossary + stat info sheets

Glossary (/glossary) — reachable from Settings and from any ⓘ

Alphabetical list of every stat

Each entry: name (Barlow Condensed 18px cream) + three lines:

What it is. One plain line.

Why it matters. One plain line.

How we measure it. Two plain lines, no jargon.

Include at minimum: Field tilt, PPDA, Counterpress rate, Block length, Defensive line height, Possession %, Pass completion, Forward share, Progressive passes, Final-third entries, High turnovers, Shot distance, Pass quality

Stat info sheet — a bottom sheet that opens when the ⓘ on any stat or visual is tapped

Five rows:

What it is — one line

Why it matters — one line

How we measure it — two lines, plain

Target for P2009 — the threshold in cream (e.g. 50%)

Your number this match — the actual value in cream (e.g. 58% — 8 above target)

Two actions: See the moments (where applicable) and Glossary

4. Tutorial layer

Coach marks — first visit to each major screen shows one dismissable card

Insights: "This is your match summary. In three sentences. Tap the team selector above to read it for either side."

Territory heat map: "Drag the slider — watch where the team goes."

Territory compact band: "Red patches are where you'd want to press pause and talk."

Match events: "Tap any event to jump straight to that moment."

Max 40 words each, cream background, dark text, ✕ to dismiss

Never shown again after dismissal

"Show tips again" reset button in Settings → Account

ⓘ on every visual — already established in phase 2. Confirm every chart, pitch, and stat card has one and it opens the correct info sheet.

5. Final polish

Wordmark fade — 300 ms fade-in on app open only, never animates again

Route transitions — 150 ms crossfade between screens

Loading states — skeleton shimmer on cards and rows, slim progress bar on video

Empty states — "No shots in this clip" with a small pitch icon; "No findings above the thresholds — the moments are listed below"

Error states — inline row with Retry button, cached content stays visible

Offline — show last-cached data with a "Cached" pill

6. Accessibility

Every interactive element: role, aria-label, 44×44pt minimum tap target

Contrast ratio ≥ 4.5:1 for all body text

Focus rings visible on desktop (2pt cream outline, offset 2pt)

Respect prefers-reduced-motion — disable pulse animations and the new-event flash

7. What to double-check before saying done

Every screen opens with a clear purpose

Every chart has a question title, caption, and ⓘ

Every stat card has a ⓘ that opens a plain-language info sheet

Team selector + Period selector appear on every match screen

Wordmark is always Barlow Condensed 800 italic, cream, uppercase

No purple anywhere

No emoji

Time is always in seconds (0:14), never minutes

Session opens from a finding, not from nav

Library is the front door

Player share and Reel share are public and don't require an account

Coach marks show once per screen, dismissable, resettable in Settings

Ship it

Build the final phase. Show me the player share page, the club settings with players list, the glossary, and the stat info sheet open. Then we're done.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/73bac415-a694-487f-a5d2-6e01fa0971d5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
