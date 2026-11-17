#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
uniform vec4 g_Texture0Resolution;
uniform vec3 u_AlbumTint; // {"material":"AlbumTint","type":"color","default":"0.13 0.14 0.20"}
uniform float u_TintStrength; // {"material":"TintStrength","default":0.16,"range":[0,0.4]}
uniform float u_Saturation; // {"material":"Saturation","default":1.1,"range":[0,2]}
uniform float u_TopShade; // {"material":"TopShade","default":0.25,"range":[0,1]}
uniform float u_BottomShade; // {"material":"BottomShade","default":0.7,"range":[0,1]}
varying vec2 v_TexCoord;

vec4 sampleClamped(vec2 uv) {
    vec2 halfPixel = 0.5 / max(g_Texture0Resolution.xy, vec2(1.0));
    return texSample2D(g_Texture0, clamp(uv, halfPixel, vec2(1.0) - halfPixel));
}

void main() {
    // Final 128 -> 256 upsample and album-aware color grading in the same pass.
    vec2 stepUV = 1.5 / max(g_Texture0Resolution.xy, vec2(1.0));
    vec4 sum = vec4(0.0);
    sum += sampleClamped(v_TexCoord + vec2(-stepUV.x, 0.0)) * 2.0;
    sum += sampleClamped(v_TexCoord + vec2( stepUV.x, 0.0)) * 2.0;
    sum += sampleClamped(v_TexCoord + vec2(0.0, -stepUV.y)) * 2.0;
    sum += sampleClamped(v_TexCoord + vec2(0.0,  stepUV.y)) * 2.0;
    sum += sampleClamped(v_TexCoord + vec2(-stepUV.x, -stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2( stepUV.x, -stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2(-stepUV.x,  stepUV.y));
    sum += sampleClamped(v_TexCoord + vec2( stepUV.x,  stepUV.y));
    vec4 color = sum / 12.0;

    float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 graded = mix(vec3(luma), color.rgb, u_Saturation);
    graded = mix(graded, u_AlbumTint, u_TintStrength);

    // UV y=1 is top; protect the song metadata area at the bottom.
    float bottom = 1.0 - smoothstep(0.14, 0.82, v_TexCoord.y);
    float shade = mix(u_TopShade, u_BottomShade, bottom);
    graded = mix(graded, vec3(0.075, 0.078, 0.12), shade);

    // Static, very fine grain to reduce low-resolution color banding.
    vec2 pixel = floor(v_TexCoord * vec2(256.0));
    float grain = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    graded = clamp(graded + vec3(grain * 0.008), 0.0, 1.0);
    gl_FragColor = vec4(graded, color.a);
}
