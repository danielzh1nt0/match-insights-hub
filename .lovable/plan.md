# Rebuild Stats visuals and team identity

## Scope
- Rebuild the six requested Stats visuals and selector around real club crests, short codes, kit colours, comparisons, and evidence counts.
- Extend the same reusable team identity token to Insights, the Match feed/header, Territory pitches, and public share headers.
- Leave auth, registration, upload, data schemas, and unrelated screens unchanged.

## Implementation
1. Create one reusable `TeamToken` with crest-first rendering, monogram fallback, three sizes, and active/inactive/compare states.
2. Rebuild the Stats selector as two crest-led team choices plus a distinct Both choice. The comparison state will show both teams at full strength.
3. Standardize every Stats card to the required anatomy: team strip, question, caption, visual, three-column comparison, honesty marker.
4. Rebuild the six key visuals using only real match evidence:
   - Possession: large percentage and two-team split.
   - Shape: anchored full pitch, up to eleven average player positions, soft hull, cream centroid, shape dimensions.
   - Lanes: isolated selected lane plus best/worst tables and 2/3/5/10 minimum-pass filter.
   - Better option: carrier, receiver, alternative target, two labeled paths.
   - Runs: anchored pitch, maximum five speed-coded directional arrows, filter controls, selectable detail card.
   - Counter-press: 0–8 second scale, target/median labels, semantic reaction dots including hollow unresolved cases.
5. Add team tokens to the Insights identity strip and finding headers, Match score/header and event rows, Territory pitch identity, and share headers.
6. For Both mode, show both crest tokens and both kit colours; never collapse it into a single-team label.

## Data and honesty
- Reuse match labels, registered club identity, existing crest lookup, and match analysis data; do not invent values.
- Use monograms only when no crest exists and show `—` when a comparison is unavailable.
- Keep every pitch anchored with two goals, halfway line, centre circle, dashed thirds, and attack direction.
- Preserve the no-purple, no-emoji, 44px-target, no-more-than-five-arrows rules.

## Verification
- Check compilation and preview errors.
- Verify mobile at 390×844 and desktop at 1280+ with no overflow and no visible “Team A”/“Team B”.
- Capture the requested mobile Stats views plus identity examples on Insights, Match, Territory, and share pages; capture full desktop Stats and Insights views.
