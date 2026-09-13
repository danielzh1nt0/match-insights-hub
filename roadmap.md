# Roadmap

## Done
- Phase 1: brand, auth, onboarding, library, upload, processing
- Real accounts (email + Google), club/teams/targets saved to the account
- Phase 2: insights, match, territory, stats, player, clip reel, session
- Share pages `/s/player/:token` and `/s/reel/:token`, public glossary `/glossary`
- Player page and clip reel wired to the derived analysis data (events, findings, per-player heat)

## Open
- [ ] `<MatchHeader>` rebuild (3 rows: score row with team tiles, divider, meta line + gear); replaces MatchBar on every match screen; mobile/desktop sizes; pre-match and second-half states
- [ ] `<MatchStory>` full-screen 5-slide recap + route `/match/:id/story` + `<StoryLauncher>` pill on library cards (ready matches) and top of insights
- [ ] QA pass against the uploaded wireframe HTML: colours, fonts, spacing, functionality; fix inconsistencies
- [ ] Phase 3 remainder: settings screens, coach marks per screen, skeleton/empty/error/offline states
