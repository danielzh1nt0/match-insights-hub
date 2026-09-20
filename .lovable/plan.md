# Visual library fidelity correction

## QA result
The current result does not match the supplied Visualisation Library v16 closely enough. Prompt B was applied as a generic large-number wrapper, but the reference specifies a different visual form for each coaching question. Several listed cards are absent, Territory uses landscape pitches where the reference uses portrait heat maps, compactness is a static pitch instead of a time ribbon, and Stats is one reusable comparison table rather than the requested spatial, timeline, distribution, comparison, player, and shot visuals.

## Correct card anatomy
Refactor the shared `Visual` shell to follow the document exactly:
- 14px card radius, 1px wire border, surface background, clipped content.
- Question and 22px information control in the header; plain caption directly below.
- Prompt B takeaway block: one selected-team value at 48px mobile / 56px desktop, followed by exactly one purpose-built visual.
- Baseline comparison row below the visual; cream when worse, muted green when better, faint when unavailable.
- Separate footer with the dot honesty marker (`confirmed · detected`) and optional right-side context.
- Keep 16px horizontal card padding, 12–14px vertical rhythm, 44px interactive targets, and no generic explanatory panels.

## Territory corrections
- Rebuild “Where did we play?” as the document’s portrait heat pitch with attack direction, time labels, and player chips where data exists.
- Rebuild “How compact were we?” as the shape timeline/ribbon using `stats.metrics.shape_timeline`, not a static rectangle.
- Keep the four Prompt A line-break cards directly after compactness, but align their shell, timeline height, incident thumbnails, traffic-light pill, state pitches, footer, and spacing with the supplied design.
- Combine losses and recoveries into the document’s single Lost/Won turnover visual instead of two duplicate cards.
- Restore the document’s distinct press map and shape-vs-outcome presentation where their required match data exists.

## Stats corrections
Replace the tab-swapped generic table with the supplied question-specific visuals, preserving the existing data contract:
- Ball: possession/distribution visual for “Who had the ball?”
- Pressing: reaction-time strip for “How fast did we react?”
- Shape: compactness ribbon for “How compact were we?”
- Shooting: two-team shot map for “Where did shots come from?”
- Players: sorted two-tone distance-per-minute rows for “Who covered the ground?”
- Passes: progression-flow visual for “Who progressed the ball?”

Each tab keeps one selected-team takeaway and one valid baseline. Missing inputs render `—` or an honest unavailable state; no figures are invented.

## Scope and verification
- Preserve Prompt A’s four-card placement and all existing match data, team switching, clip links, reviews, and tokens.
- Do not change Match, Session, Library, authentication, or backend behavior.
- Verify the supplied card hierarchy and all six visual families on mobile and desktop, including team switching, overflow, empty baselines, and interactive moments.
