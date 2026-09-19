# Match event filter rebuild

## Scope
- Add a Match-only `<EventFilter>` component and replace the current scrolling chip strip.
- Keep the event feed, review actions, Territory, Insights, and other screens unchanged.

## Filter row
- Show `All`, `Turnovers`, `Passes`, `Set pieces`, `Sequences`, and `More ▾` in a wrapping 6px-gap row with no horizontal overflow.
- Use the existing filter-chip visual language with the requested 32px minimum height, cream active state, and accessible pressed/expanded states.
- Keep one active Type at a time; choosing a visible Type clears any previous Type selection.
- Show the count of active non-default Zone, Player, and Quality groups on `More` after Apply.

## Filter sheet
- Use an accessible dialog that traps focus and closes on Escape.
- Present as a bottom sheet on mobile and right-side drawer on desktop.
- Add Type, Zone, Player, and Quality sections with single-select chips; Player rows are grouped by team and populated from the match events.
- Keep edits in draft state until the full-width cream Apply button is pressed; Reset restores All and clears other groups.

## Feed filtering and support line
- Apply Type, Zone, Player, and Quality filters together to the existing visible event list, using event payload fields without changing source data.
- Replace the current detected/confirmed sentence with `N events · Tap a moment to confirm`.
- Preserve the existing playback control because it is above this section; no extra divider is needed beneath the event support line.

## Verification
- Check Type, Zone, Player, and Quality filtering against the SFK–BP sample.
- Verify focus trapping, Escape, `aria-pressed`, `aria-expanded`, reset/apply behavior, and no horizontal overflow.
- Capture mobile and desktop screenshots for: All active, Turnovers active with a two-group More badge, and the open four-section sheet.
- Confirm the preview build remains clean.
