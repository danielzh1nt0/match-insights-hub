# Implement Packs 2 and 3 with completion QA

## Goal
Rebuild the Match and Territory screens from the uploaded component specification, preserving its supplied JSX/SVG structure and visual values while connecting every component to the open match’s real data and existing working actions.

## Fixed screen order

```text
Match
Match header
Video and overlays
Video / 2D / Both switch
Playback bar
Momentum strip
Match in numbers
Every event
Wrapped filters
Event feed

Territory
Match header and selectors
Team heat map
Shape ribbon
Loss / win pitches
Formation replay
```

No Pack 2 visual will appear on Territory, and no Pack 3 visual will appear on Match.

## Pack 2 — Match

### Add the supplied component set
Create the dedicated Match component folder and implement every named component from the document:

1. `StatIcon` — all 24 supplied hand-drawn SVG icon cases and their exact API.
2. `MatchHeader` — team tiles/crests, score, divider, period/attack/duration line, and setup control; use it consistently on Insights, Match, Territory, and Stats through the shared match shell.
3. `MomentumStrip` — 15-second field-tilt windows, Team A above and Team B below the midline, goal diamonds, turnover ticks, current-time cursor, and click-to-seek.
4. `MatchNumbers` — exact 3×2 tiles, real team values, dash treatment for two zeroes, reliability state, and inspector opening on tap.
5. `FilterChips` — wrapped, non-scrolling primary filters and More badge behavior, integrated with the existing detailed filter sheet.
6. `EventRow` — icon, time/play action, team marker, title/subtitle, confirmed/hidden/untouched appearance, confirm, and hide actions.
7. `PlaybackBar` — play/pause, scrubber, team-coloured markers, time, and true video fullscreen.
8. `MatchScreen` — compose the components in the exact supplied order without demo values.

### Preserve and connect existing behavior
- Keep the current real video source, interpolated canvas overlays, layer choices, possession ribbon, native-controls suppression, Video/2D/Both modes, and fullscreen targeting only the video/overlay area.
- Keep event reveal tied to video time, deep-link seeking, keyboard review controls, bulk confirmation, review export, event correction, hidden-event restore, and the existing More filter sheet.
- Feed all numbers and events from reviewed match data: deleted events stay excluded; corrected time/team values are used; confirmed counts take priority under the existing evidence rule.
- Use club identity colours and crests already resolved by the app rather than replacing them with demo Team A/Team B values.
- Generate momentum windows only from available match tracking/statistics; do not invent missing samples.

## Pack 3 — Territory

### Add the supplied component set
Create the dedicated Territory component folder and implement every named component from the document:

1. `TeamHeatMap` — portrait pitch, team-colour heat blobs, match-time slider, player chips, selected-player full-opacity layer over a 20% team layer, attack direction, reliability line, player count, and frame count.
2. `ShapeRibbon` — match-derived block-length ribbon, width line, minute labels, current-time cursor, median length, and click-to-seek.
3. `LossWinPitches` — paired pitches, separate losses/recoveries, stronger high-zone recovery dots, and dot-to-moment navigation.
4. `FormationReplay` — With ball/Without ball switch, replay slider, observed player markers, goalkeeper treatment, hull, centroid, smoothed movement, and 30-second snapshot strip.
5. `TerritoryScreen` — compose the four components in the exact supplied order below the shared header/selectors.

### Territory data adapters
- Extend the existing reviewed-data derivation to provide heat blobs by team and player, stable timeline samples, turnover timestamps/positions/high-zone state, phase-filtered formation frames, hull paths, centroids, and snapshots.
- Apply the existing single team mapping everywhere so Team A and Team B produce genuinely different heat, ribbon, turnovers, and formation output.
- Respect the selected period and attack direction when filtering/orienting data.
- Render only tracked players and valid shapes; never manufacture an eleventh player or a missing event.
- Suppress unavailable visuals or show a neutral unavailable state without forbidden “0 detected,” “not supplied,” or “not tracked” captions.

## Visual and accessibility constraints
- Preserve every supplied colour, font, spacing, radius, inline SVG path, and layout value; use the app’s equivalent semantic tokens where integration requires it.
- No Recharts, Chart.js, D3, Visx, Sankey, SVG arc gauge, third-party icon library, emoji, or purple.
- Keep all controls labelled, keyboard reachable, and with an effective 44×44 tap area without changing the visible dimensions from the supplied design.
- Keep responsive layouts free of clipped text and page-level horizontal overflow.
- Preserve current loading, missing-match, old-analysis, and review failure handling around the new screen compositions.

## Technical approach
- Build small adapters between `useAnalysis`/reviewed match files and the exact Pack prop contracts; do not place sample constants in production routes.
- Reuse the existing shared match shell for navigation, setup, selectors, and destination integrity.
- Replace the current duplicate Match/Territory presentation components only after their real-data replacements are wired, then remove obsolete imports and dead implementations.
- Keep route metadata and all unrelated Insights, Stats, Session, Library, auth, player, story, reel, share, settings, and glossary behavior unchanged.

## QA completion matrix

### Source audit
- Check off all 13 named components above against the uploaded document, including every prop, SVG case, text label, exact order, and interaction.
- Search the dependency graph and source for prohibited chart libraries, Sankey implementations, arc gauges, emoji substitutions, purple values, forbidden captions, and stale duplicate Match/Territory cards.
- Confirm no hard-coded demo match values remain in either screen.

### Automated checks
- Run the TypeScript check and focused tests for data adapters/filtering.
- Confirm the preview build is clean and inspect runtime, console, and network errors.
- Verify reviewed events remain persistent after reload and drive the feed and number tiles.

### Mobile browser QA — 393×852
On a real analysed match, capture and inspect:
1. Match default view: header, actual video, mode switch, playback, momentum, all six number tiles, filters, and feed.
2. Match interaction states: scrub playback/momentum, open a number inspector, open/apply More filters, confirm and hide an event, restore it after reload, switch all three video modes, toggle overlay layers, and enter/exit real video fullscreen with overlays visible.
3. Territory default view: heat map, ribbon, paired pitches, and formation replay in the required order.
4. Territory interaction states: Team A versus Team B, period change, player heat selection, both formation phases, slider movement, snapshot selection, ribbon seek, and turnover-dot navigation.

### Desktop browser QA — 1280×1800
- Capture full Match and Territory screen views.
- Repeat inspector/filter drawer, seeking, event review, team/period, player heat, and formation controls.
- Confirm no horizontal overflow, overlap, clipping, blank SVG/pitch, or console error.

### Data-integrity acceptance
- Compare visible Match numbers with the reviewed event/stat source for the selected test match.
- Confirm timeline markers and event taps seek to the correct timestamps.
- Confirm Team A and Team B Territory counts and rendered point sets differ when their source data differs.
- Confirm heat-map footer counts, shape median, loss/win totals, player markers, hull, and snapshots match the derived source arrays.
- Confirm zero/unavailable values use the specified dash or suppression treatment rather than misleading claims.

## Review deliverables
Provide the requested two final screenshots—Match and Territory—plus focused evidence for fullscreen overlays, an event review state, selected-player heat, and formation replay. Report the completion matrix with every item marked passed or any explicit blocker before Pack 4 begins.
