# Rebuild the Session screen

## Goal
Replace only the current Session page with a coach-ready training plan. Each drill will combine a looping tactical animation, concise setup information, practical instructions, coaching cues, and expandable progressions while preserving the existing match header and floating navigation.

## What will change

### 1. Session data and generation
- Add a typed session-plan model for drill title, type, duration, description, setup facts, rules, rationale, cues, progressions, and animation template.
- Build a small deterministic drill library keyed by finding type, including better pass, slow press, and long block themes, with a sensible fallback for other findings.
- Bind the page header to the selected finding's headline, value, target, unit, and event count.
- Use the analysed squad count when available; render `—` for any genuinely unavailable setup field.
- Make Regenerate rebuild the plan from the same latest finding without changing routes or other screens.

### 2. `<DrillPitch>`
- Create a reusable 16:10 SVG pitch with passing, possession/rondo, positional, and match/free-play templates.
- Draw pitch markings, goals, zones, numbered team/GK markers, ball detail, pass/run paths, and arrowheads using existing semantic tokens plus dedicated pitch tokens.
- Animate players, ball, and directional paths on a six-second loop with Motion; pause and replay controls will work independently per drill.
- Respect reduced-motion preferences by showing a stable final frame rather than looping.
- Add accessible one-line pitch descriptions and labelled play, pause, replay, and glossary buttons.
- Open a compact drill glossary sheet from the info control without changing the shared stat visual behavior elsewhere.

### 3. `<DrillCard>`
- Build the requested vertical card layout: title and type, animated pitch, four-field setup grid, Setup/Rules/Why this works, coaching cues, and Progressions.
- Use two setup columns on mobile and four on desktop, with no sideways scrolling.
- Keep all content visible except Progressions, which starts collapsed and uses an accessible `aria-expanded` toggle.
- Keep drill copy short, observable, and specific: three to five rules, no more than three coaching cues, and harder/easier variants.

### 4. Rebuilt `<Session>` page
- Replace the thin text cards with the session source header, three full drill cards (warm-up, main exercise, game), and a full-width cream Regenerate session button.
- Preserve the current match shell, match header, back behavior, and standard Insights / Match / Territory / Stats navigation.
- Keep the page dark-only, cream-accented, token-driven, and consistent with the existing typography, spacing, focus states, and touch targets.

## Technical details
- Scope changes to the Session route plus new Session-only components/data helpers; no other screen behavior or layout will change.
- Use SVG and `motion/react`; add no canvas or animation dependency.
- Add semantic turf/control tokens in the global design system instead of hardcoded component colours.
- Keep the route's existing metadata and selected-finding search parameter behavior.

## Verification
- Check the current build diagnostics and run targeted type/tests after implementation.
- Verify interaction and layout in Chromium at mobile and desktop sizes.
- Capture the requested evidence: session header, warm-up at two animation moments, main exercise with Progressions expanded, Regenerate button, and two-card vertical rhythm.
- Confirm reduced motion, keyboard controls, labelled pitch controls, and `aria-expanded` behavior.
