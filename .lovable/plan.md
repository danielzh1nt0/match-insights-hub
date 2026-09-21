# Stats team-clarity rebuild

## Scope
Rebuild only the Stats route and shared Stats presentation pieces. Leave Insights, Match, and Territory unchanged.

## Team identity
- Replace the generic Stats selector with a three-part selector using each real crest or kit-colour monogram and three-letter short code.
- Fill an active team segment with its own kit colour using readable foreground contrast; outline inactive teams and keep Both neutral.
- Pass both real team identities into every Stats card and show an inline team pill for the active team. In Both mode, show both identities rather than silently treating the view as one team.

## Shared card anatomy
- Add a Stats-only card shell in this order: team pill and title, one-line subtitle, visual, three-column comparison row, honesty marker.
- Use only real match values. Target, opponent, and last-five values display an em dash when that source is absent.
- Apply the new anatomy to all Stats cards, including non-pitch cards and honest empty states.

## Pitch context
- Upgrade the shared Stats pitch drawings with goals, halfway line, centre circle, dashed thirds, and a labelled attack-direction arrow.
- Keep landscape and portrait variants spatially correct and accessible.
- Limit dense pitch overlays to five arrows; use isolated or summarized views when evidence exceeds that limit.

## Six priority visuals
1. Possession: selected-team headline value, named possession line, team-colour/graphite split bar, comparison row, confirmed/detected evidence.
2. Average shape: derive an average real-coordinate team shape from period-filtered frames; draw a soft polygon, centroid cross, length, width, and line height on an anchored pitch.
3. Passing lanes: replace the arrow block with tappable best-three and worst-three rows; selecting a row isolates that real lane on the pitch.
4. Better option: show carrier, played receiver, better target, shirt numbers, goal direction, and generated factual played/missed-pass sentences only when fields exist.
5. Passing network: add team identity, shirt-number nodes, pass total, tappable edges with pass counts, and comparisons.
6. Counter-press: add team identity, labelled median and target markers, comparisons, and confirmed/detected evidence.

## Remaining Stats cards
- Add team identity, anchored pitch context where relevant, comparisons, and honesty markers to every existing Ball, Pressing, Shape, Shooting, Players, and Passes card.
- Preserve the approved 24-slot sitemap, period filtering, review persistence, clip links, and empty-state honesty rules.

## Team reference card
- Add a static “Stats screen anatomy” card at the bottom of the Stats route only in development mode, showing team pill, chart title, subtitle, visual, comparison row, and honesty marker.

## QA
- Verify all six tabs and Team A/B/Both selections use real names and colours without visible “Team A” or “Team B” labels.
- Verify period changes update every applicable card and event reviews remain reflected.
- Capture requested mobile states for selector, possession, shape, lanes, better option, and one additional card.
- Capture desktop evidence across all six tabs so every priority visual and the shared anatomy are covered.
- Check 390×844 and 1280×1800 for overflow, clipping, 44px controls, focus states, pitch anchors, accessible image labels, console/runtime/network failures, and build status.
