# Stop video overlay flicker

## Goal
Make players, the ball, team shapes, and passing lanes move smoothly and resist one-frame tracking dropouts without changing the match data.

## Changes
- Replace nearest-frame rendering with a renderer-local frame bracket lookup around the current video time.
- Interpolate each player by id between the previous and next frame for both pixel and pitch positions.
- Keep each player’s last valid marker for 0.4 seconds, draw gap-filled markers at 60% opacity with the predicted ring, and remove them only after the timeout.
- Smooth every player’s displayed position independently with exponential smoothing at alpha 0.5, resetting safely after seeks or match changes.
- Interpolate and smooth the ball independently, persist it for 0.3 seconds, then hide it.
- Build each team hull from the currently interpolated/persisted player positions, showing it only with at least four visible players; do not use a flashing raw-frame triangle.
- Track carrier identity over time and show passing lanes only after the same carrier has remained stable for 0.3 seconds. Resolve lane endpoints against the smoothed player markers.
- Preserve the existing team filters, layer settings, video/pitch modes, fullscreen behavior, colours, and control layout.

## Technical details
- Keep temporal state inside `MatchCanvas`: per-player last seen values and smoothed coordinates, independent ball state, stable-carrier timing, and short visibility hysteresis.
- Use binary search to obtain the nearest frame before and after the current playback time and a clamped linear interpolation factor.
- Treat raw `stale` observations as absent. Interpolate only when an id exists in both bracket frames; otherwise retain the newest valid observation within the persistence window.
- Compute a convex hull from visible team player positions in pitch metres, then map it to the current view.
- Clear temporal state on backward/large seeks, file changes, and canvas teardown so old positions never leak into another moment.

## Verification
- Run the focused type/build checks and inspect preview diagnostics.
- On `SFKBP1109_s1200` at 1× playback, verify players glide without blinking, shapes do not flash, and lanes wait for a stable carrier.
- Capture screenshots at 0:59 and 2:10 with Players and Team shapes enabled, using the real match video.
