#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
uniform vec4 g_Texture0Resolution;
varying vec2 v_TexCoord;

// Dual Kawase downsample. Center and diagonal taps suppress aliasing.
vec4 sampleClamped(vec2 uv) {
    vec2 halfPixel = 0.5 / max(g_Texture0Resolution.xy, vec2(1.0));
    return texSample2D(g_Texture0, clamp(uv, halfPixel, vec2(1.0) - halfPixel));
}

void main() {
    vec2 stepUV = 1.5 / max(g_Texture0Resolution.xy, vec2(1.0));
    vec4 sum = sampleClamped(v_TexCoord) * 4.0;
    sum += sampleClamped(v_TexCoord + vec2(-stepUV.x, -stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2( stepUV.x, -stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2(-stepUV.x,  stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2( stepUV.x,  stepUV.y));
    gl_FragColor = sum * 0.125;
}
