# Aemeath companion (Wallpaper Engine SceneScript)

The Scene is 1920 × 1080 **canvas units** (16:9 FHD; scales to 3840 × 2160 UHD); the ordinary GIF layers render at 200 × 200 units. `aemeath` is the original 1000 × 1000 animation rendered at scale 0.2 (200 × 200). Reducing the canvas to 200 × 200 would leave no room for roaming and does not reduce the underlying texture size; the Scene is FHD for full-screen roaming.

## Controls

- **A state:** Freely roam on X and Y; move animation flips for left/right movement. Idle chooses among `idle1`–`idle4`. A single click instantly chooses a different idle without changing state. Hold and drag the sprite to move it; on release, stop at that exact position without momentum and immediately play a **different** idle GIF than the one shown before dragging. During media playback, the character remains on `aemeath` while it is dragged (no `drag` visual replacement). Occasionally follows a nearby cursor when choosing its next walking target.
- **B state:** Double-click the sprite in A to drop to the bottom of the scene. Stay fixed there. Play one of `screen1`–`screen7` at random every 10–30 seconds, with the animation parked on its first frame between plays. A single click immediately chooses and plays a different screen animation without changing state. Double-click returns to A. State changes require exactly two distinct physical mouse press/release cycles within 0.5 seconds and within a 24-unit X/Y window. A/B switching is confirmed 0.5 seconds after the second release if there was no third click; bursts of 3+ clicks do not change state. The derived cursorClick callback is not counted, preventing missed or duplicated click reports during GIF changes.
- **Media:** Windows media-session **playing** (music or video) forces A and displays `aemeath` at its existing 0.2 scale. Double-click cannot enter B while media is playing, but dragging to reposition `aemeath` remains available. Media paused or stopped hides `aemeath` and keeps A active (does not return to B).
- **Save:** Current canvas-space X/Y, dimensions and A/B state are persisted per screen with SceneScript `localStorage`, periodically and after interactions. Old 1000×1000 saved coordinates are proportionally migrated to FHD once. Reset Wallpaper Engine wallpaper data to clear them.

Media integration only works for players integrated with Windows media sessions and must be enabled in Wallpaper Engine settings. SceneScript mouse events only work on **Solid** image layers; the controller sets `solid = true` on all 14 layers. Desktop icons and application windows can intercept mouse events; this is a wallpaper interaction, not a global mouse hook.

## Source locations

- `scripts/companion.js`: main controller, embedded verbatim into the **Origin** script of the `aemeath` layer in `scene.json`.
- `scripts/cursor-bridge.js`: mouse input forwarding, embedded verbatim into each other layer's **Visibility** script.
- `scene.json`: editor-consumable project file. Wallpaper Engine keeps scripts as **inline strings** in JSON, not as JS references, so changing the source files alone will not change the wallpaper. Re-embed source when modifying.
- GIFs imported to `models/` and `materials/` are unchanged.

## Smoke test in Wallpaper Engine editor

1. Pull `master`, open the Scene and select **Run Preview** (SceneScript does not run in normal edit mode).
2. Confirm the Scene size is 1920×1080, one idle sprite is visible and after a few seconds it walks in X/Y, flipping horizontally when moving left.
3. Click once: idle sprite changes, still in A (verify even if a cursorClick callback is duplicated). Hold and drag: drag sprite tracks mouse, stays where released, and switches to a different idle GIF immediately.
4. Double-click: character falls to scene bottom, stays there. Click once: different `screen` GIF plays instantly without leaving B; wait 10–30 seconds for another.
5. Double-click again: A resumes from the same X.
6. Double-click into B again and play media via a Windows-media-integrated player: `aemeath` appears, A takes over. While playing, double-click must not enter B. Pause/stop: ordinary A resumes.
7. Reload the wallpaper and confirm the A/B mode and location return.

External GitHub validation checks source/JSON consistency and deterministic behavior scenarios, but cannot exercise the Windows Wallpaper Engine runtime itself.

## Double-click regression checks

1. Single click in A => different idle, still A.
2. Single click in B => different screen animation, still B.
3. One physical down/up followed by two cursorClick callbacks => one click, no A/B change (cursorClick is informational only).
4. Exactly two separate down/up cycles within 500ms and 24 canvas units => one A/B change after the burst ends, even if cursorClick never fires.
5. Slow clicks (>500ms apart), spatially distant clicks, or bursts of 3+ rapid clicks => no A/B change.
6. Playback is the only automatic override: starting media in B forces A, and media prevents a double-click into B.

## Drag-release regression check

In A, note the current `idle1`–`idle4`, drag the bot and release it. The bot must stay at its release coordinates and immediately show a **different** idle GIF. Releasing a normal click without dragging must not trigger an extra idle change.

## Media drag regression

While a Windows-integrated media player is playing, `aemeath` remains the visible GIF (0.2 scale). Press on the character, move the cursor while held and release it: its position must update and stay at the drop point, without briefly showing `drag` or switching to B. Stop playback: ordinary A idle behavior resumes at the saved position.

## Click-event fix

The previous controller only registered a click after a strict `cursorDown` + `cursorUp` + `cursorClick` chain and accidentally cleared `pointerPressed` when `input.cursorLeftDown` became false before `cursorUp` was dispatched. It also required two clicks to land within 8 canvas units. The new controller counts a completed **down/up** pair on release, uses a 24-unit tolerance, and treats `cursorClick` as optional; dragging and duplicated callbacks do not register extra clicks. Exactly two clicks within 500ms (without a third) switch modes after the final 500ms quiet window. SceneScript is still subject to Wallpaper Engine desktop input interception.
