#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
uniform vec4 g_Texture0Resolution;
uniform float u_Scroll; // {"material":"Scroll","default":0,"range":[0,2000]}
uniform float u_Viewport; // {"material":"Viewport","default":189,"range":[1,2048]}
varying vec2 v_TexCoord;

void main() {
    float x = v_TexCoord.x * g_Texture0Resolution.x;
    float sampleX = v_TexCoord.x + u_Scroll / g_Texture0Resolution.x;
    vec4 color = texSample2D(g_Texture0, vec2(sampleX, v_TexCoord.y));
    float inside = step(32.0, x) * (1.0 - step(32.0 + u_Viewport, x));
    inside *= 1.0 - step(1.0, sampleX);
    gl_FragColor = vec4(color.rgb, color.a * inside);
}
