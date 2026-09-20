# Match information architecture and Insights rebuild

## Goal
Make the Library the front door, give every match visual one unambiguous home, and rebuild Insights as the coach-first opening screen using the supplied card anatomy and real match data.

## 1. Establish the screen homes
- Keep the existing match routes and four-item match navigation: Insights, Match, Territory, Stats.
- Preserve Session as a finding action, Reel as an Insights/Match destination, Player as a Stats → Players destination, and Story as the Insights/Library launcher.
- Add the missing Account and Club settings routes and retain the existing public player/reel shares and glossary.
- Keep working match functionality in place; use honest unavailable/placeholder states only where a specified card has no implemented visual yet.
- Reorder each match screen to the supplied sitemap and remove duplicate/misplaced forms:
  - Insights: selectors, story, three-sentence summary, findings, facts.
  - Match: video, playback, momentum, numbers, event heading, filters, feed.
  - Territory: heat map with player chips, compactness ribbon, paired loss/win pitches, formation replay with snapshots.
  - Stats tabs: Ball, Pressing, Shape, Shooting, Players, Passes, each with the listed cards in the listed order.
- Move the four line-defending cards out of Territory: line-break count to Pressing; depth answer, high/mid/low states, shape/outcome, and timeline to Shape. Do not show the same visual twice.

## 2. Rebuild Insights as `<InsightsScreen>`
- Extract the route body into a focused `InsightsScreen` component while the route keeps data loading, metadata, and match state.
- Use the existing match header and team/period selectors, followed by the full-width cream story launcher.
- Render “The match in three sentences” as a bordered numbered card with three real, selected-team sentences.
- Render Findings with a review count; the first eligible finding opens by default and the rest start collapsed.
- Give every finding a 40px circular football-native `FindingIcon`, a short coaching-task headline, semantic result pill, chevron, evidence row, target marker/progress bar, interpretation, moments, review actions, Build session, and Clip reel.
- Add a muted one-line facts strip for shots, corners, and free kicks from the current match.

## 3. Data honesty and gating
- Extend the finding model only as needed to represent nullable target/baseline values instead of manufacturing comparisons.
- Apply the gate exactly: hide only findings where metric is zero and both target and baseline are null.
- Rewrite generated headlines as coaching actions while keeping the measured evidence and interpretation beneath them.
- If fewer than three eligible findings remain, show the supplied limited-tracking state after the remaining cards, with an Upload another clip action.
- Keep confirmed events as the preferred basis and detected events as fallback; retain confirm, hide, retime, deep-link, and reload persistence behavior.
- Do not invent player names, baselines, events, or match facts.

## 4. Visual implementation
- Keep the supplied dark tokens, cream-only non-team accent, Barlow Condensed/Inter typography, 14px card shells, 16px horizontal padding, and 44px tap targets.
- Make the shared `<Viz>` shell match the supplied header, caption, body, and evidence footer structure without adding alternate decorative card styles.
- Draw the eight finding icons once in a typed `<FindingIcon name="…" />` SVG component; no emoji or substitute icons.
- Preserve club identity colours only for team identity and semantic good/warning/bad colours only for result states.

## 5. Verification
- Verify every requested route resolves and every match destination is reachable in one tap from its stated parent.
- Verify mobile Insights with five findings, fewer-than-three limited state, a withheld zero finding, and an expanded finding; use deterministic component fixtures for states absent from the uploaded match without changing production data.
- Verify desktop Insights top-to-bottom, all 44px controls, no horizontal overflow, first-card expansion, finding actions, and no console/runtime errors.
- Verify Territory no longer contains line-break cards and Stats Pressing/Shape contain them in the specified order.
