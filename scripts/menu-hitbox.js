'use strict';
// Menu input remains independent of the animated GIF and the companion hitbox.
function forward(type,event){
    if(!shared.aemeathUiEvents)shared.aemeathUiEvents=[];
    const p=event.worldPosition;
    shared.aemeathUiEvents.push({type:type,x:p.x,y:p.y});
}
export function cursorDown(event){forward('down',event);}
export function cursorUp(event){forward('up',event);}
