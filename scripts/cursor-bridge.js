'use strict';

// Visible sprite input bridge. The controller runs on aemeath.origin.
function queue(type, event) {
    if (!shared.aemeathEvents) shared.aemeathEvents = [];
    shared.aemeathEvents.push({
        type: type,
        x: event.worldPosition.x,
        y: event.worldPosition.y
    });
}

export function cursorDown(event) { queue('down', event); }
export function cursorUp(event) { queue('up', event); }
export function cursorClick(event) { queue('click', event); }
