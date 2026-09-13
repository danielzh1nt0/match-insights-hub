# Use the real club crests in the match header

## What will change
- Add the uploaded **1. FC Köln** and **VfL Wolfsburg** crest images to the app’s managed image assets.
- Extend the reusable match header so each team tile can show a crest while preserving its existing label, team-filter action, and accessible name.
- Map the two crests to the Köln–Wolfsburg sample match and pass them through the shared match shell, so they appear consistently on Insights, Match, Territory, Stats, Player, Reel, and Session screens.
- Keep the current coloured initial tile as a fallback for matches without a supplied crest, including Bochum, Mainz, and newly uploaded matches.

## Presentation details
- Fit each full crest inside the existing 44 px mobile / 52 px desktop team area without cropping or distortion.
- Preserve transparent backgrounds and give the logos enough internal breathing room for clear edges.
- Keep the score, divider, match status line, and settings control unchanged.

## Verification
- Check the Köln–Wolfsburg header on both the current mobile viewport and desktop.
- Confirm both crests are sharp, centered, fully visible, and do not shift the score.
- Confirm another sample match still uses the initial fallback correctly.
- Confirm the app remains error-free after the update.
