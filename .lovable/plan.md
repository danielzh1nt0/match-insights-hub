# Complete Stats visual rebuild

## What is wrong now
The live Stats screen renders one shared wrapper and only one primary visual per tab. That is why most of the approved cards are missing. The uploaded Visualisation Library contains 20 reference visuals, but several belong to Match or Territory rather than Stats. The Stats rebuild must use the approved sitemap, not place every reference card on the current page.

## Correct homes from the uploaded library
- Keep on Match: head-to-head / Match in numbers, momentum strip, events feed.
- Keep on Territory: “Where did we play?”, compactness ribbon, loss/win pitches, formation replay.
- Use on Stats: distance rows, run map, press map, lane effectiveness, better option, pass network, counter-press strip, shape-vs-outcome, entries conceded, line timeline, build-up/pass map, shot map, and player-card patterns.
- Do not implement the uploaded Sankey/progression flow, ring quality dial, old “How high was our line?” card, or old pushed-up line-state card. Those conflict with the explicit deletion list.

## Stats screen structure
Keep the shared match header, team selector, period selector, and six tabs. Replace the current single generic `<StatsVisual>` and generic moment-summary cards with ordered, purpose-built visual cards.

### Ball
1. **Control** — one selected-team possession takeaway, two-team control strip, and baseline.
2. **Thirds** — three clearly labelled pitch thirds showing selected-team territory share.
3. **Sequence length** — distribution of possession-spell lengths with a single coach-facing takeaway.
4. **Runs** — portrait pitch with real tracked run arrows; solid with ball, dashed without it, brightness by speed.
5. **Distance** — sorted two-tone player rows for total and high-intensity distance, normalised per visible minute.

### Pressing
1. **Press map** — pressure-event dots on a pitch, with confirmed/detected honesty counts.
2. **Counter-press strip** — 0–8 second reaction axis, semantic reaction colours, median, pressed-within-2s, and regained-within-5s.
3. **Line breaks** — the approved “Did they get in behind us?” incident card with real line-break events and clip links; no zero-detected card.

### Shape
1. **Line depth answer** — No / Sometimes / Yes answer using the selected team’s median versus usual line depth.
2. **Small multiples** — compact labelled pitch states derived from real shape samples.
3. **Shape vs outcome** — six defensive states with entries and shots; highlight the worst state without recreating the banned pushed-up card.
4. **Line timeline** — renamed coach-first question, real line-height curve and opponent-shot diamonds; never titled “How high was our line?”.

### Shooting
1. **Shot map** — both teams on one pitch, with off-target, on-target, and goal states plus clip links.
2. **Shots summary** — plain icon-led totals and quality breakdown; no arc or ring.
3. **Entries conceded** — entry arrows and five labelled lanes, with shot-conceded markers and clip links.

### Players
1. **Player cards** — one card per observed player with number, visibility, five real metric tiles, pass-quality strip, and comparison profile. Remove the uploaded ring dial; do not invent names, positions, or unavailable metrics.

### Passes
1. **Lane effectiveness** — player-pair arrows, thickness by volume, brightness by completion, best/worst lane rows.
2. **Better option** — played pass versus missed forward option, linked to reviewed moments.
3. **Network** — touch-sized player nodes and pass edges; this is a network, not a Sankey.
4. **Pass map** — real pass routes, completion state, direction, and simple filters.
5. **Interception** — interception locations and resulting direction from real events only.
6. **Pass log** — scannable chronological rows with player numbers, direction, outcome, quality, and clip link.

## Data and honesty rules
- Continue using only the open match’s `match_data.events`, frames, `stats.json`, and persisted event reviews.
- Apply the existing `teamKey()` result and period selection to every card, not only the first visual.
- Prefer confirmed reviewed events where applicable and show detected context without displaying “0 detected”.
- Never invent players, positions, event coordinates, runs, shots, baselines, or tracking quality.
- When a whole card has no valid evidence, omit it and use one tab-level concise empty state; never show “not supplied” or “not tracked”.
- Keep club identity colours correct; cream is the only non-team accent.

## Component work
- Replace the one-switch `StatsVisual` implementation with focused components grouped by tab.
- Add a small shared Stats card shell matching the uploaded wire border, surface, question header, plain caption, information control, visual body, and evidence footer.
- Reuse shared pitch geometry and event-review helpers, but do not reuse one chart form for unrelated questions.
- Keep all controls at least 44×44, all SVG visuals accessible with `role="img"`, and every card free of horizontal scrolling.

## QA completion matrix
The rebuild is not complete until every item below is evidenced.

### Source and data audit
- Confirm all 24 sitemap slots exist in the correct tab and order.
- Confirm Match-only and Territory-only visuals are not duplicated on Stats.
- Confirm every card reads the selected team and period.
- Confirm event-based cards reflect confirm/delete/retime reviews after reload.
- Search the source for Recharts, Chart.js, D3, Visx, Sankey, SVG arc gauges, “How high was our line?”, “What happened when we pushed up?”, “0 detected”, “not supplied”, and “not tracked”; all prohibited results must be absent from rendered Stats code.

### Interaction QA
- Switch through Ball, Pressing, Shape, Shooting, Players, and Passes.
- Switch Team A, Team B, and Both; verify values and spatial marks differ where the match data differs.
- Switch full match / first half / second half and verify each visual updates.
- Open information sheets and close them by button, backdrop, and Escape.
- Open every available moment, shot, line break, better option, interception, and pass clip link.
- Verify player-card selection, run/pass filters, and all visual toggles have correct pressed states.

### Render QA
- Test authenticated mobile at 393×852 and desktop at 1280×1800.
- Capture every tab on both sizes, plus expanded/filtered states.
- Verify no horizontal page overflow, clipped labels, overlapping controls, empty SVGs, or wrong team colours.
- Verify 44×44 targets, keyboard focus, accessible names, and `role="img"` labels.
- Check runtime, console, network, type, and build errors.

### Final report
- Provide a 24-row completion matrix with component, tab, real data source, empty-state behavior, interaction tested, mobile screenshot, and desktop screenshot.
- Leave the roadmap item open until every row passes.