# Club and team registration with upload animation

## New connected flow
- Add `/signup/club`, `/signup/team`, and `/signup/ready` as a three-step mobile-first registration experience.
- Preserve registration details between steps and refreshes: club name, crest/initials, ground, country, age group, team name, and kit colour.
- Keep the existing `/signup`, onboarding, Library, match workspace, and current upload screens unchanged.

## Registration screens
- Build the club screen with live two-letter initials, crest picker sheet, focused ground search results, validation, and fixed Next action.
- Build the team screen with preserved back navigation, age-group selection, country-aware suggested team name, optional kit colours, and validation.
- Build the ready screen with editable match-header and Library-card previews, compact edit sheets, monogram note, and the upload action.
- Use the supplied dark tokens, Barlow Condensed/Inter typography, 44 px controls, exact spacing, and restrained ease-out motion.

## Upload flow
- Add `/upload` with file/link tabs, drop and browse support, match metadata, home/away selection, and guarded Start analysis action.
- Add `/upload/processing` as a full-screen state with upload/pipeline progress, estimated wait, five-stage status strip, CSS/SVG pitch tracker, hide-to-Library action, failure controls, and completion action.
- Keep demo processing deterministic for review while accepting route state for progress/stage/state screenshots.

## Technical details
- Add a focused persisted registration/upload store rather than altering existing account or match business logic.
- Create small registration primitives for the page shell, crest, progress dashes, sheets, and editable previews.
- Use hand-written SVG and scoped CSS keyframes only; respect reduced motion and avoid chart or animation libraries.
- Give every new route unique title, description, Open Graph metadata, and Twitter card metadata.

## QA and completion
- Verify validation, forward/back state retention, sheets, ground search, suggestion replacement, colour selection, file/link entry, and processing actions.
- Capture the requested club empty/typing/search/sheet states, team selection, ready preview, processing at 15/55/92%, and all five tracker stages.
- Check 390×844 and desktop layouts for clipping/overflow, keyboard focus, reduced-motion behavior, console errors, runtime errors, and final preview build status.
