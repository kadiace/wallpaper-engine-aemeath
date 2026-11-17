# Aemeath media speech bubble — layout v2

Wallpaper Engine scene: FHD 1920×1080. Aemeath supports A/B idle/roam/screen behaviors, dragging, a stationary long-press menu, live 0–2× scaling, and media-triggered `aemeath` sprite.

## Media speech bubble (no transport buttons)

- The **current album cover is a 176×176 square** (1:1). Its image model lives in `models/aemeath_album_cover.json` and material in `materials/aemeath_album_cover.json`.
- The cover's `genericimage4` material now declares `textures: ["$mediaThumbnail"]` (a single system texture name string), not an object masquerading as a texture. Wallpaper Engine swaps the content of the special media thumbnail texture when media art arrives.
- The existing cover layer is sorted **above** the dynamically created dark cover placeholder and **below** the subsequently created title, artist, progress/timeline and spectrum. The cover layer is visible throughout playback; it is no longer hidden until the optional `mediaThumbnailChanged` event arrives.
- **Pixel bubble:** 480×248 including 4px border; inner 472×240, art left and metadata column right. Title: 20pt; artist: 14pt; current and total time each 11pt. Progress track: 228×6. Original 16 audio-frequency bars remain at the bottom of the metadata column. Speech bubble follows Aemeath and stays inside the canvas.
- The entire layout and palette are configurable via `UI_LAYOUT` and `UI_STYLE` in `scripts/companion.js`; swapping the visual skin won't require changing behavior code. Metadata and play time are optional and display safe placeholders if missing.
- **Previous/Play-Pause/Next controls removed** from the dynamic UI, static Scene layers and `project.json` shortcut properties. This speech bubble is now display-only.

## Album art troubleshooting

The official Wallpaper Engine integration uses **Albedo texture → Bind Album Cover → Current album cover** on the selected image layer. If the new system-texture material does not render in the Windows Wallpaper Engine editor, select the `media_album_cover` image in the Scene editor, then open **Advanced Texture Settings**, click the gear next to **Albedo**, choose **Bind Album Cover**, select **Current album cover**, and save. This editor-native binding is the authoritative fallback; the serialized form may vary by editor version. The original album cover area remains square after binding.

Windows media integration must be enabled and the current media player must provide cover art through the Windows media overlay; some media players provide only a title and artist. If no artwork is available, the square placeholder remains visible.

## Runtime checks

1. `git pull origin master`, reopen the wallpaper's Scene editor and select Run Preview.
2. Play music from a Windows-media-integrated player. Confirm album art visible at left, title and artist at right, two time labels and progress bar underneath, 16 frequency bars at bottom.
3. Verify no transport controls remain in the Scene or user settings.
4. Drag Aemeath while music plays. The bubble and album art should follow the character without changing the GIF.
5. Pause or stop music and confirm the bubble hides. Return to A/B interaction and the long-press menu.

## Code structure

- `scene.json`: 17 static layers (14 GIFs, character hitbox, menu hitbox, album cover).
- `scripts/companion.js`: main Aemeath logic plus configurable UI skin (embedded identically in `scene.json` as aemeath origin script).
- `models/aemeath_album_cover.json` and `materials/aemeath_album_cover.json`: square image with special media cover system texture.
- `project.json`: previous/play/next User Shortcut properties removed.

Wallpaper Engine docs: https://docs.wallpaperengine.io/en/scene/audiovisualizer/albumcover.html
