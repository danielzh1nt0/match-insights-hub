# True fullscreen video and control ribbon

## Changes
- Make the complete match stage enter the browser's real fullscreen mode and occupy the full display.
- Let the video area expand to the largest available 16:10 area while preserving the selected canvas overlays.
- Keep playback, layer, and exit-fullscreen controls visible and usable in fullscreen.
- Move the possession status out of the video image into a Football Manager-style information ribbon directly below the image.
- Place the Video / 2D / Both selector beneath that ribbon.

## Verification
- Check the mobile match view and a desktop-sized viewport.
- Enter fullscreen and confirm the stage reaches the viewport edges, overlays remain aligned, and the ribbon is below the image.
- Confirm exiting fullscreen restores the normal card layout.
