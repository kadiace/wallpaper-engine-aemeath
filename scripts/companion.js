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
const DOUBLE_CLICK_SECONDS = 0.36;
const DOUBLE_CLICK_DISTANCE = 65;

let layers = {};
let x = 500, y = 500, facing = 1;
let mode = 'A', action = 'idle';
let idleName = 'idle1', screenName = 'screen1';
let musicPlaying = false;
let falling = false, fallSpeed = 0;
let target = null;
let actionDelay = 3;
let screenDelay = 20, screenPlayLeft = 0;
let armed = false, dragging = false, dragged = false;
let grabX = 0, grabY = 0, pressX = 0, pressY = 0;
let suppressClickUntil = 0, lastClickTime = -100, lastClickX = 0, lastClickY = 0;
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
    localStorage.set(STORAGE_KEY, { mode: mode, x: x, y: y });
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
    target = null;
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
        setIdle(false);
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

function processEvents() {
    if (!shared.aemeathEvents) shared.aemeathEvents = [];
    const events = shared.aemeathEvents.splice(0);
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === 'down') {
            if (mode === 'A' && !musicPlaying) {
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
            releaseGrab();
        } else if (ev.type === 'click') {
            if (elapsed < suppressClickUntil || dragged) {
                dragged = false;
                continue;
            }
            const distanceSquared = (ev.x - lastClickX) * (ev.x - lastClickX)
                + (ev.y - lastClickY) * (ev.y - lastClickY);
            const doubleClick = elapsed - lastClickTime <= DOUBLE_CLICK_SECONDS
                && distanceSquared <= DOUBLE_CLICK_DISTANCE * DOUBLE_CLICK_DISTANCE;
            if (doubleClick) {
                lastClickTime = -100;
                setMode(mode === 'A' ? 'B' : 'A');
            } else {
                lastClickTime = elapsed;
                lastClickX = ev.x;
                lastClickY = ev.y;
                singleClick();
            }
        }
    }
}

function stepA(dt) {
    if (armed) {
        if (!input.cursorLeftDown) {
            releaseGrab();
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
}

function queue(type, ev) {
    if (!shared.aemeathEvents) shared.aemeathEvents = [];
    shared.aemeathEvents.push({ type: type, x: ev.worldPosition.x, y: ev.worldPosition.y });
}

export function init() {
    for (let i = 0; i < NAMES.length; i++) {
        layers[NAMES[i]] = thisScene.getLayer(NAMES[i]);
        if (layers[NAMES[i]]) layers[NAMES[i]].solid = true;
    }
    const saved = localStorage.get(STORAGE_KEY);
    if (saved && (saved.mode === 'A' || saved.mode === 'B')) {
        mode = saved.mode;
        if (typeof saved.x === 'number' && isFinite(saved.x)) x = saved.x;
        if (typeof saved.y === 'number' && isFinite(saved.y)) y = saved.y;
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
        lastClickTime = -100;
        setIdle(false);
        persist();
    } else {
        // Media ends or pauses: remain in A and resume regular behavior.
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

export function cursorDown(event) { queue('down', event); }
export function cursorUp(event) { queue('up', event); }
export function cursorClick(event) { queue('click', event); }
