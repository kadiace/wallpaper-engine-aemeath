# Aemeath – Media Speech Bubble and Character Selection

The original animated character (A/B, roaming, drag, double-click, media override) remains a 1920×1080 Scene. Both new UIs are composed of **separate, named layers**; `UI_STYLE` and `UI_LAYOUT` at the bottom of `scripts/companion.js` define the visual skin independently of behavior.

## Media speech bubble

When Windows global media integration reports PLAYING, a pixel-block speech bubble appears above Aemeath and follows the character. It contains:

- Square **92×92 album cover** from the system `$mediaThumbnail` texture, or a dark placeholder if no cover is available
- Song title, artist, album name when available
- Current play position and total length in `m:ss`, and a proportional progress indicator
- A **16-bin real-time audio-frequency amplitude** meter based on `engine.registerAudioBuffers(engine.AUDIO_RESOLUTION_16)`
- Previous / Play-Pause / Next buttons implemented as user-shortcut inputs

**The three transport controls are not an unrestricted media-player API.** Wallpaper Engine's SceneScript cannot issue system-media transport commands directly. Open the wallpaper's Project Settings → User Properties and assign the three new **User Shortcut** entries (`aemeath_previous`, `aemeath_playpause`, `aemeath_next`) to commands or media key macros appropriate for your computer. Until bound, the buttons cannot control the external player. User Shortcuts must be configured separately on each computer. The underlying `engine.openUserShortcut()` is called only from the corresponding cursorClick event.

Timeline is optional in media-player integrations; absent duration/position is shown as `--:--`, not invented. Audio-frequency bars represent current system audio output; they are not guaranteed to isolate the playing media app. Album cover is loaded through Wallpaper Engine's `{"name":"$mediaThumbnail","type":"system"}` material texture reference. Title/artist use SceneScript `mediaPropertiesChanged`. UI is independent of the current GIF's texture and of the context menu.

## Character selection and scale

Wallpaper Engine's documented SceneScript cursor API **does not provide a right-click event or a right mouse button state**. Native right-click may open the Windows desktop context menu instead, and cannot be reliably intercepted by a Scene wallpaper. Therefore, the working supported input for the menu is: **hold the left mouse button over a stationary character for 650ms** (without moving the pointer more than 7 scene units). The menu is designed so an external Windows helper can add a right-click trigger later without changing UI code. The menu's position is locked while dragging the scale slider, so the slider does not move out from under the pointer.

Menu shows eleven GIF selections, `idle1`–`idle4` and `screen1`–`screen7`. Clicking a name immediately displays that GIF and pins it until the next user interaction; selecting an idle selects A, selecting a screen selects B. While B is pinned, periodic random screen changes are paused. Media playback still overrides with `aemeath`.

Below the list is a **live 0.00–2.00× scale slider**. The character's visual scale, collision hitbox and scene boundary constraints update while dragging, and the size is saved in `localStorage`. At scale 0, the hitbox remains at least 12% size so the user can reopen the menu to recover. The media bubble and menu have fixed-size typography; they are not distorted by character scale. To reskin the speech bubble, edit `UI_STYLE` and `UI_LAYOUT`.

## Source and verification

- `scripts/companion.js`: controller, media state and configurable UI module, fully embedded in `scene.json` on `aemeath.origin`
- `scripts/menu-hitbox.js`: menu input events, embedded on `menu_hitbox.visible`
- `scripts/cursor-bridge.js`: existing companion cursor events
- `materials/aemeath_album_cover.json`, `models/aemeath_album_cover.json`: system media cover layer
- `project.json`: the three User Shortcut properties
- `scene.json`: three transport button layers and menu input layer; other visuals are created once by SceneScript

**Live validation is essential.** The SceneScript mock verifies layer creation, metadata handling, 16 audio bars, timeline formatting, and scaling. It does **not** verify Windows input interception, user-shortcut bindings or Wallpaper Engine's internal `$mediaThumbnail` texture rendering.

## Editor smoke test

1. Pull master, open the wallpaper in Wallpaper Engine **Run Preview**, start a supported Windows-media-session player, confirm pixel UI bubble follows Aemeath, displays cover/title/artist and audio bars move.
2. In Project Settings bind the new User Shortcuts. Click previous/play/next once each and confirm external player commands.
3. Stop playback; the bubble disappears; A continues.
4. Hold left mouse button on the character for 650ms without moving; the menu opens. Choose each of the 11 GIF names; it should display immediately.
5. Drag the Scale slider to 0.00, 1.00, 2.00; character responds immediately; reload and verify the scale remains.
6. Confirm single/double click and drag still work when the menu is closed. Right-click remains an unsupported Windows/SceneScript constraint.

Official docs:
- https://docs.wallpaperengine.io/en/scene/audiovisualizer/albumcover.html
- https://docs.wallpaperengine.io/en/scene/scenescript/reference/event/media.html
- https://docs.wallpaperengine.io/en/scene/scenescript/reference/event/cursor.html
- https://docs.wallpaperengine.io/en/scene/userproperties/usershortcut.html

## Further input fixes

A 650ms hold sets a dedicated `menuHoldOpened` flag, and the corresponding release is ignored as a normal click (even if the mouse was held much longer). Changing scale no longer moves the menu itself. When the media provider supplies no timeline, the time readout displays `--:-- / --:--` rather than implying a valid 0:00 duration.
