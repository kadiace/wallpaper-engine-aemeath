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
    x = clamp(x, HALF_SIZE, size.width - HALF_SIZE);
    y = clamp(y, HALF_SIZE, size.height - HALF_SIZE);
}

function persist() {
    const size = bounds();
    localStorage.set(STORAGE_KEY, { mode: mode, x: x, y: y, width: size.width, height: size.height });
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
    if (musicPlaying) return;
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
        if (y <= HALF_SIZE) {
            y = HALF_SIZE;
            falling = false;
            fallSpeed = 0;
            persist();
        }
    } else {
        y = HALF_SIZE;
    }
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
        const desiredX = name === 'aemeath' ? 0.2 :
            (name.indexOf('screen') === 0 ? 1 : facing);
        const desiredY = name === 'aemeath' ? 0.2 : 1;
        const currentScale = layer.scale;
        if (Math.abs(currentScale.x - desiredX) > 0.001 ||
            Math.abs(currentScale.y - desiredY) > 0.001) {
            layer.scale = new Vec3(desiredX, desiredY, 1);
        }
    }
    if (hitbox) {
        hitbox.visible = true;
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
        y = HALF_SIZE;
        const animation = layers[screenName].getTextureAnimation();
        if (animation) {
            animation.setFrame(0);
            animation.pause();
        }
        screenDelay = random(10, 30);
    }
    render();
}

export function update(value) {
    const dt = clamp(engine.frametime, 0, 0.05);
    elapsed += dt;
    processEvents();
    finishClickSequence();
    if (mode === 'A') stepA(dt);
    else stepB(dt);
    saveDelay -= dt;
    if (saveDelay <= 0) {
        persist();
        saveDelay = 5;
    }
    render();
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
    if (playing) {
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

