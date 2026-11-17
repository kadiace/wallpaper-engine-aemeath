# Aemeath — square album-art bubble

Media UI design: the album artwork fills the **256×256 1:1 background** with a blur effect. A separate, unblurred **128×128 rounded square** jacket sits near the top center. A dark wash keeps the text and spectrum legible over the blurred background.

## Media bubble layer order (back -> front)
1. `media_outer`: pixel border, 264×264
2. `media_cover_empty`: square fallback background, 256×256
3. `media_album_cover`: blurred Windows media cover texture, 256×256, 1:1
4. `media_info_shade`: dark alpha 0.60 wash across the cover
5. `media_jacket`: sharp 128×128 album cover with rounded corners
6. `media_spectrum_0`–`media_spectrum_63`: 64 thin neutral live audio bars below the jacket
7. `media_title`: 6pt at native 1× layer scale, max width 189; titles over 12 characters slide left using a bounded text window. The final window stays in place for 3 seconds before jumping immediately back to the start.
8. `media_artist`: 4pt at native 1× layer scale, max width 189; artist names over 18 characters use the same animation.
9. `media_progress_back` and `media_progress_fill`: 189×5
10. `media_time_current` and `media_time_total`: 3pt at native 1× layer scale

Before playback, character movement uses only the character's own dimensions. Starting music clamps its height to reserve room for the full bubble and border plus a 40px top margin, including at 0–2× scale; the bubble's horizontal position is clamped independently near the left and right screen edges. The title, artist, spectrum and progress/time fit inside the card without a second information panel.

The look-and-feel can be adjusted by changing `UI_STYLE` and `UI_LAYOUT` inside `scripts/companion.js`, separately from character and media state logic. The `scene.json` Aemeath Origin script embeds an identical controller copy.

SceneScript does not expose measured glyph width or a text-layer viewport. The marquee therefore uses conservative character windows and approximate per-character travel; confirm the actual font and clipping in Run Preview, especially for wide characters and non-Latin text.

## Album art requirements

Both art layers bind the current-media `$mediaThumbnail` texture through the system `usertextures` entry in `materials/aemeath_album_cover.json`. Actual thumbnail delivery depends on the Windows media player and Wallpaper Engine media integration. To inspect or renew the binding in the editor, choose `media_album_cover` or `media_jacket` → Advanced Texture Settings → Albedo → Bind Album Cover → Current album cover → Save. The runtime code does not fabricate a jacket when media does not provide one.

## Preview checklist

1. Open the current master in Wallpaper Engine's editor and Run Preview with a music player that provides album art.
2. Confirm the blurred art fills the ENTIRE square background, the smaller jacket is sharp and rounded, the spectrum animates beneath it, and title / artist / progress / times stay inside the lower card.
3. Confirm the dark wash improves readability on both bright and dark artwork. When no thumbnail is available, check that the fallback remains visible without a stale jacket.
4. Move the character near the top before music starts, then start playback: its height is corrected to fit the bubble. Drag while media plays: the 256×256 bubble follows the character and stays inside the FHD scene. Before music plays the character can use the full screen height.
5. Pause/stop playback: the bubble and music-time companion appearance/position remain until the next user input. The title stops scrolling and all spectrum bars drop to minimum height. Prior A/B interactions, manual animation menu, and 0–2× scale continue working. If Windows withdraws its media thumbnail on stop, the fallback may replace the album art.

Docs: https://docs.wallpaperengine.io/en/scene/audiovisualizer/albumcover.html
