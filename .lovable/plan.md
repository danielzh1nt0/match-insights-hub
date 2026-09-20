# Veo-style visual card refactor

## Placement clarification
The four new line-break cards live on **Territory**, directly after “How compact?” and before the ball-loss and recovery maps.

## Implementation
- Extend the shared `Visual` wrapper with a default takeaway row, comparison baseline, and evidence marker.
- Keep each card question-first: question, one-line caption, one large selected-team value, one existing visual, one comparison, one honesty line.
- Use the selected team’s figure for both-team views; preserve all existing match data and interactions.
- Update Territory visuals and Stats categories to supply meaningful headline values and comparisons; keep the four approved line-break cards on their purpose-built overrides.
- Keep Insights’ summary/finding presentation distinct; update only visualization-style findings where the shared pattern applies.
- Show missing comparisons as `—`; use cream for worse and muted green for better.
- Verify representative spatial, distribution, comparison, player, shot, and timeline states on mobile and desktop.

## Scope
No changes to Match, Session, Library, authentication, or data sources.
