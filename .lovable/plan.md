# Match-specific five-slide recap

## Build
- Replace the generic recap builder with five fixed chapters derived from the open match’s real `stats.json`, `match_data.events`, frames, findings, and saved labels.
- Chapter 1: match identity and game fingerprint, using both existing club crests, final score, possession, shots, and turnovers.
- Chapter 2: where the selected club excelled, chosen from its strongest comparative real metric with clear evidence.
- Chapter 3: who excelled, ranked from the real player rows; identify players by tracked shirt number when names are unavailable and explain the ranking with three real values.
- Chapter 4: biggest improvement area, taken from the highest-priority fired finding with its target, event count, timestamps, and actual frame illustration.
- Chapter 5: coaching verdict summarising keep, improve, and the next training focus from the same match evidence.

## Visual direction
- Apply the selected Street-zine Klassiker direction: full-bleed diagonal club-colour fields, large condensed editorial type, real crests, bold metric strips, tactical markings, and varied chapter compositions.
- Preserve Ipanema’s dark/cream controls, five progress bars, tap/hold/swipe navigation, auto-play, reduced-motion support, and accessible controls.
- Use only existing project assets and semantic design tokens; no invented players, figures, venues, scorers, or match events.

## Technical notes
- Pass the real stats, summary, selected team, and moment shape into the recap rather than the deterministic sample `MatchData` values.
- Add a small recap-analysis builder beside the existing match-analysis logic so the same team keys and numbers power Insights, Stats, and Recap.
- Keep the recap at exactly five slides on mobile and desktop, with actions linked to the matching video moments, reel, session, or full analysis.

## Verification
- Check every chapter for `bundesliga2`, confirm BVB uses yellow and Bayern red, verify all shown values against loaded match files, then test navigation and reduced-motion at mobile and desktop sizes.
