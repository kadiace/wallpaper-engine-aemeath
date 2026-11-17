#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
uniform vec3 u_AlbumTint; // {"material":"AlbumTint","type":"color","default":"0.13 0.14 0.20"}
uniform float u_TintStrength; // {"material":"TintStrength","default":0.16,"range":[0,0.4]}
uniform float u_Saturation; // {"material":"Saturation","default":1.1,"range":[0,2]}
uniform float u_TopShade; // {"material":"TopShade","default":0.25,"range":[0,1]}
uniform float u_BottomShade; // {"material":"BottomShade","default":0.7,"range":[0,1]}
varying vec2 v_TexCoord;

// Directly blur the Windows media thumbnail. No intermediate framebuffers:
// a failed render-target binding must never turn the whole card black.
vec4 sampleCover(vec2 uv) {
    return texSample2D(g_Texture0,
        clamp(uv, vec2(0.002, 0.002), vec2(0.998, 0.998)));
}

// 7-tap binomial Gaussian row: coefficients sum to 64.
vec4 sampleGaussianRow(vec2 uv, vec2 stepUV, float row) {
    vec2 yOffset = vec2(0.0, stepUV.y * row);
    return
        sampleCover(uv + yOffset + vec2(-3.0 * stepUV.x, 0.0)) * 1.0 +
        sampleCover(uv + yOffset + vec2(-2.0 * stepUV.x, 0.0)) * 6.0 +
        sampleCover(uv + yOffset + vec2(-1.0 * stepUV.x, 0.0)) * 15.0 +
        sampleCover(uv + yOffset) * 20.0 +
        sampleCover(uv + yOffset + vec2( 1.0 * stepUV.x, 0.0)) * 15.0 +
        sampleCover(uv + yOffset + vec2( 2.0 * stepUV.x, 0.0)) * 6.0 +
        sampleCover(uv + yOffset + vec2( 3.0 * stepUV.x, 0.0)) * 1.0;
}

void main() {
    // Fixed in 256x256 card space rather than the player's thumbnail
    // resolution (which can be 120x120, 150x83, etc.).
    vec2 stepUV = vec2(6.0 / 256.0, 6.0 / 256.0);
    vec4 blurred =
        sampleGaussianRow(v_TexCoord, stepUV, -3.0) * 1.0 +
        sampleGaussianRow(v_TexCoord, stepUV, -2.0) * 6.0 +
        sampleGaussianRow(v_TexCoord, stepUV, -1.0) * 15.0 +
        sampleGaussianRow(v_TexCoord, stepUV,  0.0) * 20.0 +
        sampleGaussianRow(v_TexCoord, stepUV,  1.0) * 15.0 +
        sampleGaussianRow(v_TexCoord, stepUV,  2.0) * 6.0 +
        sampleGaussianRow(v_TexCoord, stepUV,  3.0) * 1.0;
    vec3 cover = blurred.rgb / 4096.0;

    float luma = dot(cover, vec3(0.2126, 0.7152, 0.0722));
    vec3 graded = mix(vec3(luma, luma, luma), cover, u_Saturation);
    graded = mix(graded, u_AlbumTint, u_TintStrength);

    // Keep album colors at the top while darkening text at the bottom.
    float bottom = 1.0 - smoothstep(0.14, 0.82, v_TexCoord.y);
    float shade = mix(u_TopShade, u_BottomShade, bottom);
    graded = mix(graded, vec3(0.075, 0.078, 0.12), shade);

    // This layer is a complete square background, not a translucent sticker.
    // Do not propagate an unexpectedly empty source alpha through the card.
    gl_FragColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
}
