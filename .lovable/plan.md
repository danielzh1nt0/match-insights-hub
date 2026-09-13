# Ipanema — Phase 1: Foundation

Building the first of your three phases, exactly to the canonical screens in the uploaded design file (brand sheet, landing, auth, onboarding, library, upload + processing). The match view, territory, stats and player pages come in phase 2 — nothing from them is built now.

## Brand system (locked in)

- Fonts loaded from Google Fonts: Barlow Condensed (500/600/700/800 + italics) for the wordmark, scores, big numbers, timers and section titles; Inter (400–800) for all body text, never italic.
- The full colour set from your list as design tokens: near-black backgrounds, three surface greys, two wire greys, three text greys, cream and cream-dim, team red/green, and the good/risky/bad quality colours.
- Cream is the only accent. No purple, no light theme, no emoji.
- Radii: 16 cards, 12 small cards, 8–10 chips, 22 pills. Spacing on a 4-point base. All motion 150–200 ms ease-out; the wordmark fades in once over 300 ms and never animates again.

## Screens

1. **Landing (/)** — hero with large wordmark, the line "Match analysis that ends in Tuesday's session.", looping muted video placeholder, Sign in / Request access; three claim blocks with screenshot placeholders; four-step "How it works"; three "Who it's for" cards; footer with contact, privacy, terms.
2. **Sign in (/signin)** — email, password, Continue with Google, Forgot password, inline error under the field on bad credentials.
3. **Sign up (/signup)** — name, email, club, role as pill buttons, password, terms checkbox, then a "Check your email" confirmation screen.
4. **Reset (/reset)** — three states: enter email, sent, set new password.
5. **Onboarding (/onboarding)** — three skippable steps with a three-dot progress indicator: club name/crest/country; teams with age group and kit colours (red / green); targets (press within 2s 60%, regain within 5s 60%, block length ceiling 38m) each with a one-line plain explanation, with "Use defaults" or edit. Ends on the Library empty state.
6. **Library (/library)** — the home screen. Empty state "No matches yet" with "+ New analysis"; match cards with title, date, competition, duration, status pill (ready / processing / failed), thumbnail and three summary chips (possession split, turnovers, shots); search bar and filter chips. Tapping a card routes to the phase-2 insights path.
7. **New analysis (/new)** — sheet: team, opponent, date, competition, home/away, drag-drop video, Start analysis.
8. **Processing (/processing)** — plain-language stage list ("Reading the pitch · Finding players · Following the ball · Working out possession · Writing findings") with checkmarks, the "about 30 minutes for a 45-minute half" estimate, and a failure state with a plain reason and Retry.

## Shared components (reused in phases 2 and 3)

Wordmark (sm/default/lg/hero sizes), Card, Chip, Pill, Button in primary/secondary/ghost, Input, Checkbox, AppHeader (3-column mobile grid with centred wordmark), MatchBar, TeamSelector, PeriodSelector, FloatingNav (Insights · Match · Territory · Stats).

## Layout rules applied everywhere

16px side padding on mobile, 28px on desktop; 44×44 minimum tap targets; at least 100px bottom padding on screens with the floating nav.

## Sample data

1. FC Köln 1 – 0 Wolfsburg, 0:47 clip, 2026-09-12, "Bundesliga sample", tags #P2009 and #home. Held in front-end sample data for now — no accounts or storage yet, so sign-in and upload are visual flows. Say the word and I'll add real accounts and saved matches.

## Technical notes

- This project runs on TanStack Start with TanStack Router, so routing uses file-based routes under `src/routes/` instead of React Router — same URLs, same behaviour. Framer Motion (Motion for React) and Zustand are added for transitions and local auth/onboarding/library state.
- Tokens are defined as CSS variables plus Tailwind v4 `@theme` mappings in `src/styles.css`; fonts are loaded via `<link>` in the root route. shadcn primitives are restyled onto these tokens.
- Each route gets its own title/description/social metadata.
- The uploaded HTML is used as the visual reference only; it is not copied into the app.

## Review

When it's done I'll show you the landing page on desktop, the library on mobile, and the three onboarding steps, and wait for your go-ahead before phase 2.
