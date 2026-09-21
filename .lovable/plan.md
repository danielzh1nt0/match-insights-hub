# Insights: The Four Phases

## Goal
Replace the current Insights content with the supplied B+C hybrid: a phase-led coaching summary built entirely from eight reusable visual components.

## Build
1. Create the shared visual library as eight separate files under `src/components/visuals/`:
   - `MomentumStrip.tsx`
   - `PhaseSpine.tsx`
   - `TwoTeamBar.tsx`
   - `MiniPitch.tsx`
   - `HeatMap.tsx`
   - `CounterPressStrip.tsx`
   - `Sparkline.tsx`
   - `PlayerChip.tsx`
2. Add `src/components/insights/MomentSection.tsx` for the shared collapsed and expanded moment anatomy.
3. Replace the old Insights implementation with `src/components/insights/InsightsScreen.tsx`, containing:
   - verdict and phase navigation
   - fix-first ribbon
   - four moments in the required order
   - players strip, one final session action, and quiet set-piece line
   - in-place expansion, with Transition to defence exposing all nine required evidence sections
4. Rewire `/match/:id/insights` to the new screen while retaining the existing app header, match identity, navigation, session route, reel route, and match-video seeking.
5. Use the supplied sample evidence for the sample match; retain actual match identity and use available event timestamps for clip links where possible. No values will be invented for other matches: unavailable evidence will be presented quietly rather than replaced with fake numbers.
6. Add only the semantic tokens required by the supplied palette, without changing unrelated screens or introducing chart libraries.

## Responsive behavior
- Mobile: stacked verdict, spine, priority ribbon, four moment cards, players, final action, and quiet line.
- Desktop: left narrative column and right 2×2 moment grid; the priority card receives the specified red outline.
- Every interactive target remains at least 44×44px, with visible focus states and accessible labels.

## QA
- Verify all eight visual files exist separately and Insights imports them rather than defining one-off charts.
- Check type safety and the latest preview build status.
- Test phase selection, moment expand/collapse, clip seeking, priority/session actions, and match navigation.
- Audit for prohibited libraries, purple, emoji, duplicate fix actions, and horizontal overflow.
- Capture four required screenshots at 390×844:
  1. top of screen
  2. middle with all four moments
  3. expanded Transition to defence with all nine parts
- Capture the full desktop two-column layout at 1280×1800.
