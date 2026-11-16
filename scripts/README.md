# Aemeath – Stable Hitbox Input

Scene: 1920×1080 (scales to UHD 3840×2160); character: 200×200, except the 1000×1000 aemeath GIF at its existing 0.2 scale.

## Click architecture
- The permanent **companion_hitbox** is an invisible 200×200 Solid Placeholder using Wallpaper Engine's internal `models/util/solidlayer.json`. It is `visible:true`, `solid:true`, `alpha:0` and has click propagation disabled.
- All 14 GIF layers are **non-solid** (`solid:false`) and no longer bind independent input scripts. The hitbox's Origin follows the character regardless of which animation is displayed.
- `scripts/cursor-bridge.js` is embedded on the hitbox's Visibility property; `scripts/companion.js` is embedded on `aemeath` Origin. Both sources are duplicated inline within `scene.json`. Any source edit must be synchronized with the inline copy.
- Hitbox `cursorDown`/`cursorUp` pairs are the sole input count. `cursorClick` is logged for diagnostics but never counted. Real wall-clock timestamps are collected with `Date.now()`.
- Two clicks at nearly the same location (within 24 units per axis) less than 500ms apart form a double-click. A short 180ms third-click grace period follows; if no third click arrives, A/B toggles. Three clicks within that grace period cancel the toggle. A third click after the grace period cannot cancel an already committed double-click.
- Temporary event-level diagnostics use `DEBUG_INPUT = true` in both scripts; the Wallpaper Engine editor **Log** tab will show `[Aemeath hitbox]`, `[Aemeath click]`, and `[Aemeath mode]`. Disable debug before release to avoid verbose logs.

## Behavior preserved
- **A:** Independent X/Y roaming with left/right mirroring; random idle1–4; single click immediately chooses another idle. Drag displays drag.gif and stays at the release position; releasing picks a different idle. Hitbox follows the bot.
- **B:** Falls to the scene bottom, stays fixed there, plays a random screen1–7 animation every 10–30 seconds; single click immediately chooses another screen animation.
- **Music/video media session playing:** Forces state A and displays aemeath.gif, including while dragging; B remains blocked. Stop/pause remains in A. GIF scale is unchanged.
- **Persistence:** Last A/B mode and character X/Y are saved, with migration from older canvas dimensions.

## Live editor verification
The GitHub-side regression tests are **mocks**, not a Wallpaper Engine Windows execution. Open the Scene, **Run Preview**, and inspect the **Log** tab:
1. Single click: one `down`, one `up`, and `count=1`; idle/screen changes without A/B toggling.
2. Double click at the same location: two pairs, `count=2`, then after about 180ms one `[Aemeath mode]` change.
3. Three fast clicks: no A/B toggle. Double-click again in B: back to A.
4. Drag and release: no click count for drag, hitbox moves with sprite. Music continues to display aemeath.gif during drag.

**Important runtime uncertainty:** Some Wallpaper Engine versions might not hit-test a completely transparent (`alpha: 0`) Solid Placeholder. If no `[Aemeath hitbox]` messages appear, temporarily change the hitbox's alpha to `0.01` in the editor and retry. This distinguishes alpha culling from script errors.

To see logs when wallpaper is applied on Windows, enable verbose logging in settings and check the Wallpaper Engine `log.txt`.
