'use strict';

// Aemeath desktop companion. Bound to aemeath's Origin property.
// The remaining image layers forward click events through shared.aemeathEvents.
const NAMES = ['aemeath','drag','idle1','idle2','idle3','idle4','move',
    'screen1','screen2','screen3','screen4','screen5','screen6','screen7'];
const IDLES = ['idle1','idle2','idle3','idle4'];
const SCREENS = ['screen1','screen2','screen3','screen4','screen5','screen6','screen7'];
const STORAGE_KEY = 'aemeath.companion.v1';
const HALF_SIZE = 100;
const SPEED = 130;
const DRAG_THRESHOLD = 7;
// Windows defaults to a 500ms double-click interval. Allow small cursor drift
// in canvas coordinates (especially when wallpaper scaling differs from desktop pixels).
const DOUBLE_CLICK_SECONDS = 0.5;
const DOUBLE_CLICK_DISTANCE = 24;
const DOUBLE_CLICK_CONFIRM_MS = 180;
const DEBUG_INPUT = true;

let layers = {};
let hitbox = null;
let x = 960, y = 540, facing = 1;
let mode = 'A', action = 'idle';
let idleName = 'idle1', screenName = 'screen1';
let musicPlaying = false;
let falling = false, fallSpeed = 0;
let target = null;
let actionDelay = 3;
let screenDelay = 20, screenPlayLeft = 0;
let armed = false, dragging = false, dragged = false;
let grabX = 0, grabY = 0, pressX = 0, pressY = 0;
let suppressClickUntil = 0;
let clickBurst = 0, burstLastTime = -1, burstX = 0, burstY = 0;
let burstMode = 'A';
let pointerPressed = false;
let pointerDownX = 0, pointerDownY = 0, pointerDownTime = -1;
let elapsed = 0, saveDelay = 5;

function random(min, max) {
    return min + Math.random() * (max - min);
}

function chooseOther(names, oldName) {
    const choices = names.filter(function (name) { return name !== oldName; });
    return choices[Math.floor(Math.random() * choices.length)];
}

function bounds() {
    const size = engine.canvasSize;
    return {
        width: Math.max(200, size.x),
        height: Math.max(200, size.y)
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function stayOnScreen() {
    const size = bounds();
    const half = canvasHalfSize();
    x = clamp(x, half, size.width - half);
    y = clamp(y, half, size.height - half);
}

function persist() {
    const size = bounds();
    localStorage.set(STORAGE_KEY, { mode: mode, x: x, y: y, width: size.width, height: size.height,
        sizeMultiplier: sizeMultiplier, manualVisual: manualVisual });
}

function setIdle(change) {
    action = 'idle';
    target = null;
    if (change) idleName = chooseOther(IDLES, idleName);
    actionDelay = random(2.5, 6);
}

function beginWalk() {
    const size = bounds();
    const cursor = input.cursorWorldPosition;
    let tx = random(HALF_SIZE, size.width - HALF_SIZE);
    let ty = random(HALF_SIZE, size.height - HALF_SIZE);

    // Sometimes follow a nearby cursor, otherwise roam freely in both axes.
    if (cursor && Math.random() < 0.25) {
        const dx = cursor.x - x, dy = cursor.y - y;
        if (dx * dx + dy * dy < 260 * 260) {
            tx = clamp(cursor.x, HALF_SIZE, size.width - HALF_SIZE);
            ty = clamp(cursor.y, HALF_SIZE, size.height - HALF_SIZE);
        }
    }
    if (Math.abs(tx - x) < 15 && Math.abs(ty - y) < 15) {
        setIdle(true);
        return;
    }
    target = { x: tx, y: ty };
    action = 'move';
}

function changeScreen() {
    screenName = chooseOther(SCREENS, screenName);
    screenDelay = random(10, 30);
    const layer = layers[screenName];
    if (!layer) return;
    const animation = layer.getTextureAnimation();
    if (animation) {
        animation.stop();
        animation.setFrame(0);
        animation.play();
        screenPlayLeft = animation.duration;
    } else {
        screenPlayLeft = 0.96;
    }
}

function setMode(next) {
    if (musicPlaying && next === 'B') return;
    if (next === mode) return;
    mode = next;
    manualVisual = null;
    menuOpen = false;
    armed = false;
    dragging = false;
    dragged = false;
    pointerPressed = false;
    resetClickSequence();
    target = null;
    if (DEBUG_INPUT) console.log('[Aemeath mode] now ' + mode);
    if (mode === 'B') {
        falling = true;
        fallSpeed = 0;
        action = 'idle';
        changeScreen();
    } else {
        falling = false;
        setIdle(true);
    }
    persist();
}

function releaseGrab() {
    if (!armed) return;
    if (dragging) {
        manualVisual = null;
        dragged = true;
        suppressClickUntil = elapsed + 0.25;
        stayOnScreen();
        // Pick a different idle animation than the one shown before dragging.
        setIdle(true);
        actionDelay = random(2.5, 4);
        persist();
    }
    armed = false;
    dragging = false;
}

function singleClick() {
    if (musicPlaying) return;
    manualVisual = null;
    if (mode === 'B') {
        changeScreen();
    } else {
        setIdle(true);
    }
}

// Start a fresh sequence only after a pause or a meaningful cursor movement.
// Subsequent 3rd/4th clicks inside the same sequence cancel the A/B toggle.
function resetClickSequence() {
    clickBurst = 0;
    burstLastTime = -1;
    burstX = 0;
    burstY = 0;
}

function registerPhysicalClick(ev) {
    const now = typeof ev.at === 'number' ? ev.at : Date.now();
    const samePlace = Math.abs(ev.x - burstX) <= DOUBLE_CLICK_DISTANCE
        && Math.abs(ev.y - burstY) <= DOUBLE_CLICK_DISTANCE;
    const continues = clickBurst > 0 && mode === burstMode
        && now - burstLastTime >= 0 && now - burstLastTime <= DOUBLE_CLICK_SECONDS * 1000
        && samePlace;
    if (!continues) {
        clickBurst = 1;
        burstMode = mode;
    } else {
        clickBurst += 1;
    }
    burstLastTime = now;
    burstX = ev.x;
    burstY = ev.y;
    if (DEBUG_INPUT) console.log('[Aemeath click] count=' + clickBurst + ' mode=' + mode);
    singleClick();
}

function finishClickSequence() {
    if (clickBurst === 0 || pointerPressed) return;
    const sinceLastClick = Date.now() - burstLastTime;
    // Confirm after a short grace period rather than a second full 500ms.
    if (clickBurst === 2 && sinceLastClick >= DOUBLE_CLICK_CONFIRM_MS) {
        resetClickSequence();
        if (!musicPlaying) setMode(mode === 'A' ? 'B' : 'A');
        return;
    }
    if (sinceLastClick > DOUBLE_CLICK_SECONDS * 1000) resetClickSequence();
}

// Only the permanent invisible companion_hitbox forwards pointer events.
function processEvents() {
    if (!shared.aemeathEvents) shared.aemeathEvents = [];
    const events = shared.aemeathEvents.splice(0);
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === 'down') {
            if (pointerPressed) {
                if (ev.at - pointerDownTime < 35) continue;
                releaseGrab();
                resetClickSequence();
            }
            pointerPressed = true;
            pointerDownTime = ev.at;
            pointerDownX = ev.x;
            pointerDownY = ev.y;
            if (mode === 'A') {
                armed = true;
                dragging = false;
                dragged = false;
                pressX = ev.x;
                pressY = ev.y;
                grabX = x - ev.x;
                grabY = y - ev.y;
                target = null;
                action = 'idle';
            }
        } else if (ev.type === 'up') {
            if (!pointerPressed) continue;
            pointerPressed = false;
            const dx = ev.x - pointerDownX, dy = ev.y - pointerDownY;
            const moved = dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD;
            const wasDrag = dragging || dragged || moved;
            releaseGrab();
            if (wasDrag || elapsed < suppressClickUntil) {
                dragged = false;
                resetClickSequence();
                continue;
            }
            registerPhysicalClick(ev);
        }
        // cursorClick is a derived event and is never counted again.
    }
}

function stepA(dt) {
    if (armed) {
        if (!input.cursorLeftDown) {
            releaseGrab();
            // A cursorUp event may arrive during the next frame; do not clear
            // pointerPressed here or that release would be discarded. A future
            // genuine cursorDown can recover if no cursorUp arrives at all.
        } else {
            const cursor = input.cursorWorldPosition;
            if (cursor) {
                const dx = cursor.x - pressX, dy = cursor.y - pressY;
                if (dragging || dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
                    const oldX = x;
                    dragging = true;
                    action = 'drag';
                    x = cursor.x + grabX;
                    y = cursor.y + grabY;
                    stayOnScreen();
                    if (Math.abs(x - oldX) > 0.1) facing = x > oldX ? 1 : -1;
                }
            }
            return;
        }
    }
    if (musicPlaying || menuOpen || manualVisual) return;
    if (action === 'move' && target) {
        const dx = target.x - x, dy = target.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const step = SPEED * dt;
        if (distance <= step || distance < 0.5) {
            x = target.x;
            y = target.y;
            setIdle(true);
        } else {
            x += dx / distance * step;
            y += dy / distance * step;
            if (Math.abs(dx) > 0.1) facing = dx > 0 ? 1 : -1;
        }
    } else {
        actionDelay -= dt;
        if (actionDelay <= 0) {
            if (Math.random() < 0.7) beginWalk();
            else setIdle(true);
        }
    }
    stayOnScreen();
}

function stepB(dt) {
    if (falling) {
        fallSpeed += 1400 * dt;
        y -= fallSpeed * dt;
        if (y <= canvasHalfSize()) {
            y = canvasHalfSize();
            falling = false;
            fallSpeed = 0;
            persist();
        }
    } else {
        y = canvasHalfSize();
    }
    if (menuOpen || manualVisual) return;
    screenDelay -= dt;
    if (screenPlayLeft > 0) {
        screenPlayLeft -= dt;
        if (screenPlayLeft <= 0) {
            const animation = layers[screenName].getTextureAnimation();
            if (animation) {
                animation.setFrame(0);
                animation.pause();
            }
        }
    }
    if (!falling && screenDelay <= 0) changeScreen();
}

function render() {
    const active = musicPlaying ? 'aemeath'
        : manualVisual ? manualVisual
        : mode === 'B' ? screenName
        : dragging ? 'drag'
        : action === 'move' ? 'move' : idleName;

    for (let i = 0; i < NAMES.length; i++) {
        const name = NAMES[i];
        const layer = layers[name];
        if (!layer) continue;
        const shouldBeVisible = name === active;
        if (layer.visible !== shouldBeVisible) layer.visible = shouldBeVisible;

        // The script is bound to aemeath.origin, so return its position from update.
        if (name !== 'aemeath') {
            const origin = layer.origin;
            if (Math.abs(origin.x - x) > 0.01 || Math.abs(origin.y - y) > 0.01) {
                layer.origin = new Vec3(x, y, 0);
            }
        }
        const desiredX = sizeMultiplier * (name === 'aemeath' ? 0.2 :
            (name.indexOf('screen') === 0 ? 1 : facing));
        const desiredY = sizeMultiplier * (name === 'aemeath' ? 0.2 : 1);
        const currentScale = layer.scale;
        if (Math.abs(currentScale.x - desiredX) > 0.001 ||
            Math.abs(currentScale.y - desiredY) > 0.001) {
            layer.scale = new Vec3(desiredX, desiredY, 1);
        }
    }
    if (hitbox) {
        hitbox.visible = true;
        const hitSize = Math.max(0.12, sizeMultiplier);
        const hs = hitbox.scale;
        if (Math.abs(hs.x-hitSize)>0.001 || Math.abs(hs.y-hitSize)>0.001)
            hitbox.scale = new Vec3(hitSize,hitSize,1);
        const p = hitbox.origin;
        if (Math.abs(p.x - x) > 0.01 || Math.abs(p.y - y) > 0.01)
            hitbox.origin = new Vec3(x, y, 0);
    }
}

export function init() {
    for (let i = 0; i < NAMES.length; i++) {
        layers[NAMES[i]] = thisScene.getLayer(NAMES[i]);
        if (layers[NAMES[i]]) layers[NAMES[i]].solid = false;
    }
    hitbox = thisScene.getLayer('companion_hitbox');
    if (hitbox) {
        hitbox.solid = true;
        hitbox.visible = true;
    } else {
        console.log('[Aemeath ERROR] companion_hitbox layer is missing');
    }
    const saved = localStorage.get(STORAGE_KEY);
    if (saved && (saved.mode === 'A' || saved.mode === 'B')) {
        mode = saved.mode;
        if (typeof saved.sizeMultiplier==='number' && isFinite(saved.sizeMultiplier))
            sizeMultiplier=clamp(saved.sizeMultiplier,0,2);
        if (MANUAL_NAMES.indexOf(saved.manualVisual)>=0)manualVisual=saved.manualVisual;
        const canvas = bounds();
        // Migrate saved positions from the previous 1000x1000 scene.
        const oldWidth = typeof saved.width === 'number' && saved.width > 200 ? saved.width : 1000;
        const oldHeight = typeof saved.height === 'number' && saved.height > 200 ? saved.height : 1000;
        if (typeof saved.x === 'number' && isFinite(saved.x)) {
            x = HALF_SIZE + (saved.x - HALF_SIZE) / (oldWidth - HALF_SIZE * 2)
                * (canvas.width - HALF_SIZE * 2);
        }
        if (typeof saved.y === 'number' && isFinite(saved.y)) {
            y = HALF_SIZE + (saved.y - HALF_SIZE) / (oldHeight - HALF_SIZE * 2)
                * (canvas.height - HALF_SIZE * 2);
        }
    }
    stayOnScreen();
    if (mode === 'B') {
        y = canvasHalfSize();
        const animation = layers[screenName].getTextureAnimation();
        if (animation) {
            animation.setFrame(0);
            animation.pause();
        }
        screenDelay = random(10, 30);
    }
    initUi();
    render();
}

export function update(value) {
    const dt = clamp(engine.frametime, 0, 0.05);
    elapsed += dt;
    processMenuEvents();
    processEvents();
    handleContextHold();
    finishClickSequence();
    if (mode === 'A') stepA(dt);
    else stepB(dt);
    saveDelay -= dt;
    if (saveDelay <= 0) {
        persist();
        saveDelay = 5;
    }
    render();
    updateMediaData(dt);
    updateUiGeometry();
    value.x = x;
    value.y = y;
    value.z = 0;
    return value;
}

export function destroy() {
    persist();
}

export function mediaPlaybackChanged(event) {
    const playing = event.state === MediaPlaybackEvent.PLAYBACK_PLAYING;
    if (playing === musicPlaying) return;
    musicPlaying = playing;
    mediaPaused = !playing;
    if (playing) {
        menuOpen = false;
        manualVisual = null;
        if (mode === 'B') setMode('A');
        releaseGrab();
        pointerPressed = false;
        resetClickSequence();
        setIdle(false);
        persist();
    } else {
        // Media ends or pauses: remain in A and resume regular behavior.
        resetClickSequence();
        setIdle(true);
        persist();
    }
    render();
}

export function mediaStatusChanged(event) {
    if (!event.enabled && musicPlaying) {
        musicPlaying = false;
        setIdle(true);
        persist();
        render();
    }
}


// -------------------------------------------------------------
// UI MODULE. Change UI_STYLE and UI_LAYOUT to reskin without changing behavior.
// Components are built as text / Solid Placeholder layers and follow companion origin.
// -------------------------------------------------------------
const UI_STYLE = {
    background: "0.075 0.078 0.12",
    border: "0.85 0.82 0.97",
    panel: "0.13 0.14 0.20",
    accent: "0.56 0.89 0.83",
    muted: "0.52 0.54 0.67",
    text: "0.96 0.94 0.98",
    highlight: "0.26 0.29 0.41"
};
const UI_LAYOUT = {
    mediaW: 360, mediaH: 282, menuW: 252, menuH: 348,
    rowStart: 30, rowHeight: 22, sliderTop: 304, sliderHalf: 100
};
const MANUAL_NAMES = ['idle1','idle2','idle3','idle4',
    'screen1','screen2','screen3','screen4','screen5','screen6','screen7'];
let sizeMultiplier = 1;
let manualVisual = null;
let menuOpen = false, sliderDragging = false, menuHoldOpened = false;
let menuCenterX = 960, menuCenterY = 540, mediaCenterX = 960, mediaCenterY = 540;
let ui = {};
let uiReady = false;
let mediaTitle = 'Unknown track', mediaArtist = 'Unknown artist';
let mediaAlbum = '', mediaHasArt = false;
let mediaPosition = 0, mediaDuration = 0, mediaTimelineAt = -1;
let mediaPaused = false;
let spectrum = null;
let levels = new Array(16).fill(0);

function canvasHalfSize() {
    return Math.max(0, 100 * sizeMultiplier);
}
function fmtTime(seconds) {
    if (!(seconds >= 0) || !isFinite(seconds)) return '--:--';
    const n = Math.floor(seconds);
    return Math.floor(n / 60) + ':' + ('0' + (n % 60)).slice(-2);
}
function uiPosition(layer, px, py) {
    if (!layer) return;
    const p = layer.origin;
    if (!p || Math.abs(p.x-px) > 0.1 || Math.abs(p.y-py) > 0.1)
        layer.origin = new Vec3(px, py, 0);
}
function makeBlock(name, w, h, color) {
    const layer = thisScene.createLayer({
        name: name, image: 'models/util/solidlayer.json',
        origin: '0 0 0', size: w + ' ' + h,
        color: color, alpha: 1, visible: false, solid: false
    });
    ui[name] = layer;
    return layer;
}
function makeText(name, initial, pt, maxwidth, color) {
    // Text layer creation uses the officially documented createLayer(text) API.
    // Text styling is independent of the companion behavior state machine.
    const layer = thisScene.createLayer({
        name: name, text: initial, pointsize: pt,
        color: color || UI_STYLE.text, maxwidth: maxwidth,
        limitwidth: true, limitrows: true, maxrows: 1,
        horizontalalign: 'center', verticalalign: 'center',
        origin: '0 0 0', scale: '1 1 1', visible: false
    });
    ui[name] = layer;
    return layer;
}
function initUi() {
    if (uiReady) return;
    uiReady = true;
    makeBlock('media_outer', 368, 290, UI_STYLE.border);
    makeBlock('media_inner', 360, 282, UI_STYLE.background);
    makeBlock('media_tail', 18, 14, UI_STYLE.border);
    makeBlock('media_cover_frame', 100, 100, UI_STYLE.border);
    makeBlock('media_cover_empty', 92, 92, UI_STYLE.panel);
    makeText('media_title', mediaTitle, 16, 210);
    makeText('media_artist', mediaArtist, 12, 210, UI_STYLE.muted);
    makeText('media_album', '', 10, 210, UI_STYLE.muted);
    makeBlock('media_progress_back', 295, 5, UI_STYLE.highlight);
    makeBlock('media_progress_fill', 1, 5, UI_STYLE.accent);
    makeText('media_clock', '--:-- / --:--', 11, 225, UI_STYLE.text);
    makeText('media_transport_prev', '<', 20, 42);
    makeText('media_transport_play', 'II', 18, 42);
    makeText('media_transport_next', '>', 20, 42);
    for (let i = 0; i < 16; i++) makeBlock('media_band_' + i, 9, 3, UI_STYLE.accent);
    makeBlock('menu_outer', 258, 354, UI_STYLE.border);
    makeBlock('menu_inner', 252, 348, UI_STYLE.background);
    makeText('menu_heading', 'AEMEATH / ACTION', 15, 234, UI_STYLE.accent);
    for (let i = 0; i < MANUAL_NAMES.length; i++) {
        makeBlock('menu_row_back_' + i, 239, 20, UI_STYLE.panel);
        makeText('menu_row_text_' + i, MANUAL_NAMES[i], 12, 210);
    }
    makeText('menu_scale_label', 'SCALE 1.00x', 12, 210, UI_STYLE.text);
    makeBlock('menu_slider_track', 208, 6, UI_STYLE.highlight);
    makeBlock('menu_slider_fill', 104, 6, UI_STYLE.accent);
    makeBlock('menu_slider_knob', 10, 18, UI_STYLE.border);
}
function showMenu() {
    if (menuOpen) { menuOpen = false; return; }
    menuOpen = true;
    sliderDragging = false;
    manualVisual = null;
    target = null;
    action = 'idle';
    armed = false;
    dragging = false;
    resetClickSequence();
    persist();
}
function updateUiGeometry() {
    if (!uiReady) return;
    const size = bounds();
    // Keep the speech bubble above the character, shifted into canvas if needed.
    mediaCenterX = clamp(x, UI_LAYOUT.mediaW / 2 + 10, size.width - UI_LAYOUT.mediaW / 2 - 10);
    mediaCenterY = clamp(y + canvasHalfSize() + UI_LAYOUT.mediaH/2 + 22,
        UI_LAYOUT.mediaH/2 + 8, size.height - UI_LAYOUT.mediaH/2 - 8);
    const mx = mediaCenterX, my = mediaCenterY;
    const bubble = musicPlaying;
    const place = (name,ox,oy,visible)=> {
        const layer = ui[name]; if (!layer) return;
        layer.visible = visible;
        if (visible) uiPosition(layer, mx+ox, my+oy);
    };
    place('media_outer',0,0,bubble);
    place('media_inner',0,0,bubble);
    place('media_tail',clamp(x-mx,-152,152),-148,bubble);
    place('media_cover_frame',-120,68,bubble);
    place('media_cover_empty',-120,68,bubble && !mediaHasArt);
    const cover = thisScene.getLayer('media_album_cover');
    if (cover) {
        cover.visible = bubble && mediaHasArt;
        if (bubble) uiPosition(cover,mx-120,my+68);
    }
    place('media_title',57,108,bubble);
    place('media_artist',57,76,bubble);
    place('media_album',57,46,bubble);
    place('media_progress_back',0,-10,bubble);
    const progress = ui.media_progress_fill;
    const pct = mediaDuration > 0 ? clamp(mediaPosition/mediaDuration,0,1):0;
    if(progress) {
        progress.visible=bubble;
        if(bubble) {
            progress.size = new Vec2(Math.max(1,295*pct),5);
            uiPosition(progress,mx-147.5+147.5*pct,my-10);
        }
    }
    place('media_clock',0,-32,bubble);
    place('media_transport_prev',-78,-66,bubble);
    place('media_transport_play',0,-66,bubble);
    place('media_transport_next',78,-66,bubble);
    for (let i=0;i<16;i++) {
        const bar=ui['media_band_'+i]; if(!bar) continue;
        bar.visible=bubble;
        if(bubble){
            const height=3+Math.round(levels[i]*30);
            // Scale rather than changing the physical placeholder size every frame.
            bar.scale=new Vec3(1,height/3,1);
            uiPosition(bar,mx-112+i*15,my-119+height/2);
        }
    }
    // Transport hitboxes are stable input layers, not tied to changing UI text.
    const buttons=['media_btn_prev','media_btn_play','media_btn_next'];
    const xs=[-78,0,78];
    for(let i=0;i<buttons.length;i++){
        const btn=thisScene.getLayer(buttons[i]);
        if(!btn) continue;
        btn.visible=bubble;
        if(bubble) uiPosition(btn,mx+xs[i],my-66);
    }
    // Menu is detached from the skin and built from named reusable components.
    menuCenterX = clamp(x+canvasHalfSize()+UI_LAYOUT.menuW/2+14,
        UI_LAYOUT.menuW/2+10,size.width-UI_LAYOUT.menuW/2-10);
    menuCenterY = clamp(y,UI_LAYOUT.menuH/2+10,size.height-UI_LAYOUT.menuH/2-10);
    const cx=menuCenterX, cy=menuCenterY, top=cy+UI_LAYOUT.menuH/2;
    const mPlace=(name,px,py)=>{
        const layer=ui[name];if(!layer)return;
        layer.visible=menuOpen;
        if(menuOpen)uiPosition(layer,px,py);
    };
    mPlace('menu_outer',cx,cy);mPlace('menu_inner',cx,cy);
    mPlace('menu_heading',cx,top-16);
    for(let i=0;i<MANUAL_NAMES.length;i++){
        const yy=top-UI_LAYOUT.rowStart-(i+0.5)*UI_LAYOUT.rowHeight;
        mPlace('menu_row_back_'+i,cx,yy);
        mPlace('menu_row_text_'+i,cx,yy);
    }
    mPlace('menu_scale_label',cx,top-277);
    mPlace('menu_slider_track',cx,top-UI_LAYOUT.sliderTop);
    const fill=ui.menu_slider_fill;
    if(fill){fill.visible=menuOpen;if(menuOpen) {
        const width=202*sizeMultiplier/2;
        fill.scale=new Vec3(Math.max(0.005,width/104),1,1);
        uiPosition(fill,cx-101+width/2,top-UI_LAYOUT.sliderTop);
    }}
    mPlace('menu_slider_knob',cx-101+202*(sizeMultiplier/2),top-UI_LAYOUT.sliderTop);
    const menuHit=thisScene.getLayer('menu_hitbox');
    if(menuHit){menuHit.visible=menuOpen;if(menuOpen)uiPosition(menuHit,cx,cy);}
}
function updateMediaData(dt) {
    if (musicPlaying && mediaTimelineAt>=0 && mediaDuration>0)
        mediaPosition=clamp(mediaPosition+dt,0,mediaDuration);
    if (ui.media_title) {
        ui.media_title.text=mediaTitle || 'Unknown track';
        ui.media_artist.text=mediaArtist || 'Unknown artist';
        ui.media_album.text=mediaAlbum || '';
        ui.media_clock.text=fmtTime(mediaPosition)+' / '+fmtTime(mediaDuration);
        ui.media_transport_play.text=mediaPaused ? '>' : 'II';
        ui.menu_scale_label.text='SCALE '+sizeMultiplier.toFixed(2)+'x';
    }
    if (!spectrum && engine.registerAudioBuffers)
        spectrum=engine.registerAudioBuffers(engine.AUDIO_RESOLUTION_16);
    if (spectrum && spectrum.average) {
        for(let i=0;i<16;i++){
            const raw=Math.max(0,Math.min(1,Number(spectrum.average[i])||0));
            const value=musicPlaying ? Math.sqrt(raw) : 0;
            levels[i] += (value-levels[i]) * Math.min(1,dt*16);
        }
    }
}
function updateMenuSlider(mouseX) {
    const t=clamp((mouseX-(menuCenterX-101))/202,0,1);
    sizeMultiplier=Math.round(t*200)/100;
    stayOnScreen();
}
function processMenuEvents() {
    if (!shared.aemeathUiEvents) shared.aemeathUiEvents=[];
    const events=shared.aemeathUiEvents.splice(0);
    for (let i=0;i<events.length;i++) {
        if (!menuOpen) continue;
        const e=events[i], top=menuCenterY+UI_LAYOUT.menuH/2;
        const dy=top-e.y;
        const slider=dy>=283&&dy<=330;
        if(e.type==='down') {
            if(slider) {sliderDragging=true;updateMenuSlider(e.x);}
        } else if(e.type==='up') {
            if(sliderDragging){updateMenuSlider(e.x);sliderDragging=false;persist();continue;}
            const row=Math.floor((dy-UI_LAYOUT.rowStart)/UI_LAYOUT.rowHeight);
            if(row>=0&&row<MANUAL_NAMES.length) {
                const selected=MANUAL_NAMES[row];
                if(selected.indexOf('screen')===0) {
                    if(mode==='A')setMode('B');
                    screenName=selected;
                    screenDelay=random(10,30);
                    falling=mode==='B'&&y>canvasHalfSize();
                } else {
                    if(mode==='B')setMode('A');
                    idleName=selected;setIdle(false);
                }
                manualVisual=selected;
                menuOpen=false;
                persist();
            }
        }
    }
    if(sliderDragging&&input.cursorLeftDown)
        updateMenuSlider(input.cursorWorldPosition.x);
    else if(sliderDragging&&!input.cursorLeftDown){sliderDragging=false;persist();}
}
function handleContextHold() {
    // SceneScript has no documented right-button property/cursorRightClick.
    // A stationary 650ms left press is a reliable alternative.
    if (!pointerPressed || !armed || dragging || menuOpen || sliderDragging) return;
    const duration=Date.now()-pointerDownTime;
    const cur=input.cursorWorldPosition;
    const dist=cur ? (cur.x-pointerDownX)*(cur.x-pointerDownX)
        +(cur.y-pointerDownY)*(cur.y-pointerDownY) : 1e10;
    if (duration>=650&&dist<=DRAG_THRESHOLD*DRAG_THRESHOLD) {
        showMenu();
        menuHoldOpened=true;
        suppressClickUntil=elapsed+0.3;
    }
}

export function mediaPropertiesChanged(event) {
    mediaTitle = event.title || 'Unknown track';
    mediaArtist = event.artist || 'Unknown artist';
    mediaAlbum = event.albumTitle || '';
    // New song metadata arrives before its optional new timeline.
    mediaPosition=0; mediaDuration=0; mediaTimelineAt=-1;
}
export function mediaThumbnailChanged(event) {
    mediaHasArt = !!event.hasThumbnail;
}
export function mediaTimelineChanged(event) {
    if (typeof event.position === 'number' && isFinite(event.position))
        mediaPosition = Math.max(0,event.position);
    if (typeof event.duration === 'number' && isFinite(event.duration))
        mediaDuration = Math.max(0,event.duration);
    mediaTimelineAt = Date.now();
}
