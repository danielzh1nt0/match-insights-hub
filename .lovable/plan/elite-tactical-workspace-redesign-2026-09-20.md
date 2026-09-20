# Elite tactical workspace redesign

## Goal
Rebuild Ipanema’s full frontend around the selected **Elite tactical workspace** direction while preserving every existing workflow, the approved screen sitemap, real match data, and the supplied Visualisation Library v16 card rules.

## Visual system
- Keep the existing v16 palette and tokens: near-black background, layered charcoal surfaces, cream as the only non-team accent, and club colours only for team identity.
- Keep Barlow Condensed for display/numbers and Inter for body copy.
- Translate the chosen workspace’s density and hierarchy into Ipanema’s language: compact command chrome, dominant football visual, narrow evidence rails, strong borders, and restrained broadcast-style motion.
- Remove prototype-only styling that conflicts with the brief: green product branding, gradients, glow shadows, oversized corner radii, invented metrics, and generic dashboard navigation.
- Maintain 44px interaction targets, visible focus states, reduced-motion support, and no horizontal overflow.

## Implementation phases
1. **Shared foundation**
   - Refine global spacing, surface, radius, motion, and responsive layout tokens.
   - Rebuild shared buttons, cards, chips, segmented controls, loading/error states, and the wordmark treatment.
   - Rework the app header and match navigation into a desktop tactical workspace rail plus compact mobile command bar.

2. **Front door and library**
   - Redesign the landing first viewport around a real-looking Ipanema analysis workspace rather than an empty video shell.
   - Redesign Library as the product’s front door with clearer match hierarchy, status, club identity, search/filter controls, and upload action.
   - Carry the same system into sign-in, sign-up, password reset, onboarding, upload, and processing without changing authentication or upload behaviour.

3. **Match workspace**
   - Finish the shared three-row match header and use it across Insights, Match, Territory, Stats, Player, Reel, Session, and Story.
   - Preserve the approved homes exactly:
     - Insights: Tuesday card, findings, match facts.
     - Match: video, momentum, match in numbers, event feed.
     - Territory: heat map, shape ribbon, loss/win pitches, formation replay.
     - Stats: all 24 approved cards across Ball, Pressing, Shape, Shooting, Players, and Passes.
   - Reframe each page using the selected tactical-workspace composition without moving, duplicating, or fabricating data.

4. **Secondary destinations**
   - Apply the same shell and visual hierarchy to player reports, clip reels, session plans, public shares, settings, glossary, and empty/error/offline states.
   - Keep public-share pages suitably focused and remove authenticated controls from their presentation.

5. **Stats completion and honesty states**
   - Resolve the remaining empty Shape, Shooting, and Pass cards using only available match data.
   - When required inputs do not exist, replace the whole visual with a concise honest state; never show “0 detected”, “not supplied”, or “not tracked”.
   - Keep all prohibited patterns removed: Recharts/Chart.js, Sankey diagrams, SVG arc gauges, and the retired line-height cards.

## QA and completion criteria
- Verify every content route has unique title, description, Open Graph title/description, `og:type`, and `twitter:card` metadata.
- Run type checks and inspect preview build/runtime/console/network errors.
- Test desktop at 1280×1800 and mobile at 393×852 across landing, library, auth, onboarding, upload, all match tabs, player, reel, session, story, settings, glossary, and public shares.
- For each match screen, verify real club crests/colours, team and period switching, clip seeking, review persistence, filters, playback, fullscreen video overlays, and navigation.
- Produce a final screen-by-screen completion matrix and screenshots of the redesigned landing, library, Insights, Match, Territory, every Stats tab, Session, and mobile navigation.
