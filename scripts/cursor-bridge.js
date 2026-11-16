'use strict';

// The stable, transparent 200x200 Solid Placeholder is the ONLY mouse target.
const DEBUG_INPUT = true;
function queue(type, event) {
    if (!shared.aemeathEvents) shared.aemeathEvents = [];
    const p = event.worldPosition, at = Date.now();
    shared.aemeathEvents.push({type: type, x: p.x, y: p.y, at: at});
    if (DEBUG_INPUT) console.log('[Aemeath hitbox] ' + type
        + ' t=' + at + ' x=' + Math.round(p.x) + ' y=' + Math.round(p.y));
}
export function cursorDown(event) { queue('down', event); }
export function cursorUp(event) { queue('up', event); }
export function cursorClick(event) {
    if (DEBUG_INPUT) console.log('[Aemeath hitbox] derived click (ignored)');
}
