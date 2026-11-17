# Aemeath — square album-art bubble (overlay layout)

Media UI design: the album jacket is the **256×256 1:1 full background** of the character-following square speech bubble. The art is NOT positioned as a separate image on the left. The artist, track title, timeline and play progress all sit ON TOP OF the jacket.

## Media bubble layer order (back -> front)
1. `media_outer`: pixel border, 264×264
2. `media_cover_empty`: square fallback background, 256×256
3. `media_album_cover`: Windows media cover texture, 256×256, 1:1
4. `media_info_shade`: dark alpha 0.84 scrim in bottom 142px, over album for legibility
5. `media_title`: 18pt, max width 222
6. `media_artist`: 13pt, max width 222
7. `media_progress_back` and `media_progress_fill`: 222×6
8. `media_time_current` and `media_time_total`: 11pt
9. Sixteen audio-frequency spectrum bars overlay the cover in its top region.

The bubble stays attached above the companion and is clamped inside the 1920×1080 Scene. The original media controls remain removed. The title, artist and progress/time hierarchy is readable without needing a second horizontal information panel.

The look-and-feel can be adjusted by changing `UI_STYLE` and `UI_LAYOUT` inside `scripts/companion.js`, separately from character and media state logic. The `scene.json` Aemeath Origin script embeds an identical controller copy.

## Album art requirements

The art layer reads the current-media `$mediaThumbnail` texture declared in `materials/aemeath_album_cover.json`. Actual thumbnail delivery depends on the Windows media player and Wallpaper Engine media integration. Wallpaper Engine's documented guaranteed editor workflow is to choose `media_album_cover` in the scene editor → Advanced Texture Settings → Albedo → Bind Album Cover → Current album cover → Save. The runtime code does not fabricate a jacket when media does not provide one.

## Preview checklist

1. Open the current master in Wallpaper Engine's editor and Run Preview with a music player that provides album art.
2. Confirm the square cover fills the ENTIRE bubble with no side-by-side cover column. Title / artist / progress / times overlay the cover at bottom; the spectrum remains above.
3. Confirm the dark overlay improves readability on both bright and dark artwork.
4. Drag the character while media plays: the 256×256 bubble follows the character and is constrained to the FHD scene.
5. Pause/stop playback: the bubble hides. Prior A/B interactions, manual animation menu, and 0–2× scale continue working.

Docs: https://docs.wallpaperengine.io/en/scene/audiovisualizer/albumcover.html
