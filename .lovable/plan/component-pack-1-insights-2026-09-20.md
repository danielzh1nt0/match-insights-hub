# Component Pack 1 — Insights

## Goal
Rebuild Insights from the supplied component pack with the supplied appearance, while preserving real match-specific data and working coaching actions. Lock the provided screen map as the placement contract for all later packs.

## 1. Lock the screen homes
- Insights: Tuesday card, findings, match facts.
- Match: video, momentum strip, match in numbers, events feed.
- Territory: heat map, shape ribbon, loss/win pitches, formation replay.
- Stats tabs:
  - Ball: control, thirds, sequence length, runs, distance.
  - Pressing: press map, counter-press strip, line breaks.
  - Shape: line depth answer, small multiples, shape-vs-outcome, line timeline.
  - Shooting: shot map, shots summary, entries conceded.
  - Players: player cards.
  - Passes: lane effectiveness, better option, network, pass map, interception, pass log.
- Do not duplicate a visual across screens or place it outside its assigned slot.

## 2. Add the supplied Insights components
- Create one file per supplied component under the project’s Insights component folder: `TuesdayCard`, `FindingRow`, `MomentRow`, and `MetricBar`.
- Preserve the supplied dimensions, spacing, typography, colours, borders, SVGs, and interaction states exactly; add no gradients, extra shadows, or revised corner radii.
- Replace the existing Insights body with the supplied screen structure: Tuesday card, optional withheld-possession line, findings, and match facts.
- Remove the current story launcher and three-sentence card from Insights because they are not part of the newly confirmed slot order.

## 3. Connect the design to real match behaviour
- Populate the Tuesday card from the highest-priority eligible finding, including its real headline, target, current value, result state, and Build session destination.
- Populate finding rows from eligible match findings; open the first by default and keep the others collapsed.
- Keep the exact result-pill, metric-bar, interpretation, and moment-row presentation from the pack.
- Connect moment playback, confirmation, deletion, session building, and clip-reel navigation to the existing app flows instead of the pack’s demo alerts.
- Support moment selection and show the supplied reel-builder bar when at least one moment is checked; connect its actions to the existing reel/share destinations where supported.
- Keep the match facts strip last and derive it from reviewed match events.
- Show the withheld-possession line only when possession evidence is genuinely unreliable; never invent that state.
- If fewer than three real findings exist, replace the whole Insights body with the empty state rather than appending a footer.

## 4. Remove prohibited visuals and copy
- Remove the existing “How high was our line?” card.
- Remove the current “What happened when we pushed up?” implementation; its future replacement remains assigned to Stats → Shape as small multiples/shape-vs-outcome.
- Remove cards that render a zero value with “0 detected”.
- Remove or replace cards whose captions say “not supplied” or “not tracked” so unavailable data does not render as a card.
- Remove all Recharts/Chart.js UI code and dependencies, all Sankey diagrams, and all SVG arc gauges. The current audit found the Recharts dependency and wrapper, plus several prohibited unavailable-data captions; no Chart.js or Sankey usage was found in the searched source.

## 5. Verification and review evidence
- Verify the Insights route still uses real selected-team match data and all existing review/navigation actions work.
- Check mobile and desktop layouts for 44px interactions, no overlap, and no horizontal overflow.
- Capture the three requested review states:
  1. Tuesday card with three findings.
  2. One finding expanded.
  3. One moment checked with the reel-builder bar visible.
- Check for build, runtime, console, and navigation errors before presenting the screenshots.
