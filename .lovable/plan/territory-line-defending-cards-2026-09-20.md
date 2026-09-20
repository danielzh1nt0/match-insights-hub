# Territory Line-Defending Cards

## Goal
Replace Territory’s current line-height presentation with four coach-first cards that explain whether opponents got behind, what happened around conceded shots, whether the team defended too deep, and the outcomes of high/mid/low defensive lines.

## Scope
- Implement Prompt A only. Prompt B remains deferred until this work is reviewed and approved.
- Add the four cards to Territory in the requested order, without changing Match, Insights, Stats, Session, Library, or authentication screens.
- Keep the uploaded visualisation library as design reference only.

## Build
- Create a reusable `LineBreakCards` section using the existing `Visual` card shell, info treatment, spacing, typography, tokens, and 44px interaction targets.
- Extend the Territory analysis result with:
  - line-break incidents and last-five comparison when present;
  - a defending line-height timeline aligned to opponent shots;
  - median and usual defensive-line values;
  - high/mid/low state summaries with shots and goals conceded.
- Handle the available file shapes defensively: use the named fields when present, preserve honest missing-data states, and never invent incidents or baselines.
- Link incident thumbnails and shot diamonds to the Match video at the relevant time; link each state tile to the clip reel with that state carried in the URL.

## Cards
1. **Did they get in behind us?** — 72px takeaway, incident pitch thumbnails, zero-state check, and last-five comparison.
2. **Where was our line when they scored?** — thin line-height trace, opponent-shot diamonds, generated under-30m finding, and moment links.
3. **Did we defend too deep?** — No/Sometimes/Yes status pill based on the requested median-versus-usual thresholds, with plain reasoning.
4. **What happened when we pushed up?** — three compact pitch states with defensive shape, shots/goals conceded, worst-state marker, summary, and reel links.

## Technical details
- Add typed line-defending data and derivation helpers in the existing match analysis layer.
- Read `stats.metrics.line_breaks_against`, `stats.metrics.shape_timeline[team]`, team defensive-line fields, and the existing reviewed event list.
- Resolve opponent shots from the existing event team field, while also accepting `won_by` where supplied by the match file.
- Match line height to an event using the nearest timeline sample at its timestamp.
- Classify defending samples as low `<30m`, mid `30–38m`, and high `>38m`; associate each conceded shot/goal with its nearest state.
- Use semantic tokens for all state colours and preserve team colours for identity only.

## Verification
- Check the build and live Territory screen on mobile and desktop.
- Capture mobile evidence for the populated hero, timeline, deep-line status, and three-state pitches.
- Exercise the hero’s zero state with deterministic fixture-level rendering or a focused component harness without changing production data.
- Capture desktop evidence for the hero and three-state card.
- Verify incident, shot, and state links; empty/missing data; selected-team switching; and no changes to other screens.
