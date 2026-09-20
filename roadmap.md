# Roadmap

## Done
- Prompt A: Territory line-height presentation replaced by four coach-first `<LineBreakCards>` cards
- Stop video overlay flicker: interpolated and smoothed players/ball, dropout persistence, stable shapes and lanes
- Session screen rebuild: animated tactical drill pitches, setup/instructions/cues/progressions, regeneration, and responsive QA
- Phase 1: brand, auth, onboarding, library, upload, processing
- Real accounts (email + Google), club/teams/targets saved to the account
- Phase 2: insights, match, territory, stats, player, clip reel, session
- Share pages `/s/player/:token` and `/s/reel/:token`, public glossary `/glossary`
- Player page and clip reel wired to the derived analysis data (events, findings, per-player heat)
- Coach confirmation of events: event_reviews table, confirm/not-an-event/fix-time controls, bulk confirm, keyboard shortcuts, reviews export, head-to-head card, confirmed-vs-detected numbers, attacking-side override in setup
- Rebuilt Insights as an expandable coaching summary and Match as a video-first numbers-and-events screen

## Open
- [x] Prompt B: Veo-style number-led visual refactor across Insights, Stats, and Territory
- [x] Match event filter: wrapped chip row, responsive More sheet, grouped filtering, and mobile/desktop QA
- [ ] `<MatchHeader>` rebuild (3 rows: score row with team tiles, divider, meta line + gear); replaces MatchBar on every match screen; mobile/desktop sizes; pre-match and second-half states
- [x] `<MatchStory>` full-screen match-specific 5-slide recap + route `/match/:id/story` + `<StoryLauncher>` pill on library cards and insights
- [x] Correct Territory and Stats against Visualisation Library v16: exact card anatomy and six distinct visual families
- [ ] Phase 3 remainder: settings screens, coach marks per screen, skeleton/empty/error/offline states
- [x] Establish the approved screen sitemap and rebuild Insights with gated coaching findings

- [x] Name the Bundesliga sample match BVB vs FC Bayern and add both crests (BVB = uploaded yellow crest)
