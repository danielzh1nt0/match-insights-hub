# Rebuild Insights and Match

## Goal
Give Insights and Match distinct coaching jobs: Insights explains what to act on, while Match prioritizes video, compact numbers, and event review.

## Insights
- Keep the existing match header, then place the five-slide recap launcher first.
- Keep the three-sentence summary as a compact numbered list.
- Remove the head-to-head stat table and heat map.
- Rebuild findings as icon-led accordion rows. The first starts open; the rest start closed.
- Use cream, amber, and grey only for finding state. Expanded rows retain metric, target, moments, review controls, and session/reel actions.

## Match
- Keep the video, overlays, fullscreen behavior, control ribbon, mode switch, playback controls, and event review workflow unchanged.
- Replace the horizontal comparison card with `MatchNumbers`: six icon tiles for goals, shots, corners, free kicks, attempts, and possession.
- Read team and metric values from the match stats, falling back to reviewed events only where appropriate.
- Show both-zero values as an em dash. Withhold unreliable possession and mark it amber.
- Open a bottom sheet on mobile and side drawer on desktop with larger values, a plain-language definition, relevant moments, and glossary access.
- Add the “Every event” divider before the existing filters and timeline.

## Shared icon system
- Create `StatIcon` with the complete requested icon set, drawn once as accessible SVG artwork.
- Use 28px icons on mobile and 32px on desktop, with 1.8px rounded strokes.
- Preserve team colours only for team identity; never use red or green as quality signals.

## Verification
- Check the build and live preview at mobile and desktop sizes.
- Capture Insights with the first finding open and another collapsed.
- Capture Match with the SFK–BP sample numbers and a selected tile sheet.
- Capture a dedicated icon strip containing every icon for legibility review.
- Confirm Territory, Session, Library, and authentication screens remain untouched.