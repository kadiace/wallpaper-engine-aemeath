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

// Truncated 2D Gaussian gather: 32 radii x 4 rotated copies = 128 taps.
// The tap positions are precomputed with a golden-angle sequence (sigma=9px,
// radius<=25px in 256x256 card space). Equal sample weights approximate the
// Gaussian probability distribution; no wide-spaced square grid remains.
// Every offset has 90, 180 and 270 degree copies, so the weighted centroid
// is exactly zero and X/Y second moments are identical. No runtime trig.
void main() {
    vec4 blurred = vec4(0.0, 0.0, 0.0, 0.0);
    blurred += sampleCover(v_TexCoord + vec2(0.000005029, 0.006172566));
    blurred += sampleCover(v_TexCoord + vec2(-0.006172566, 0.000005029));
    blurred += sampleCover(v_TexCoord + vec2(-0.000005029, -0.006172566));
    blurred += sampleCover(v_TexCoord + vec2(0.006172566, -0.000005029));
    blurred += sampleCover(v_TexCoord + vec2(-0.007285178, -0.007939543));
    blurred += sampleCover(v_TexCoord + vec2(0.007939543, -0.007285178));
    blurred += sampleCover(v_TexCoord + vec2(0.007285178, 0.007939543));
    blurred += sampleCover(v_TexCoord + vec2(-0.007939543, 0.007285178));
    blurred += sampleCover(v_TexCoord + vec2(0.013970922, 0.001214644));
    blurred += sampleCover(v_TexCoord + vec2(-0.001214644, 0.013970922));
    blurred += sampleCover(v_TexCoord + vec2(-0.013970922, -0.001214644));
    blurred += sampleCover(v_TexCoord + vec2(0.001214644, -0.013970922));
    blurred += sampleCover(v_TexCoord + vec2(-0.013269462, 0.010190625));
    blurred += sampleCover(v_TexCoord + vec2(-0.010190625, -0.013269462));
    blurred += sampleCover(v_TexCoord + vec2(0.013269462, -0.010190625));
    blurred += sampleCover(v_TexCoord + vec2(0.010190625, 0.013269462));
    blurred += sampleCover(v_TexCoord + vec2(0.003317381, -0.018843851));
    blurred += sampleCover(v_TexCoord + vec2(0.018843851, 0.003317381));
    blurred += sampleCover(v_TexCoord + vec2(-0.003317381, 0.018843851));
    blurred += sampleCover(v_TexCoord + vec2(-0.018843851, -0.003317381));
    blurred += sampleCover(v_TexCoord + vec2(0.011468202, 0.017996024));
    blurred += sampleCover(v_TexCoord + vec2(-0.017996024, 0.011468202));
    blurred += sampleCover(v_TexCoord + vec2(-0.011468202, -0.017996024));
    blurred += sampleCover(v_TexCoord + vec2(0.017996024, -0.011468202));
    blurred += sampleCover(v_TexCoord + vec2(-0.022611820, -0.006058779));
    blurred += sampleCover(v_TexCoord + vec2(0.006058779, -0.022611820));
    blurred += sampleCover(v_TexCoord + vec2(0.022611820, 0.006058779));
    blurred += sampleCover(v_TexCoord + vec2(-0.006058779, 0.022611820));
    blurred += sampleCover(v_TexCoord + vec2(0.022515510, -0.011717003));
    blurred += sampleCover(v_TexCoord + vec2(0.011717003, 0.022515510));
    blurred += sampleCover(v_TexCoord + vec2(-0.022515510, 0.011717003));
    blurred += sampleCover(v_TexCoord + vec2(-0.011717003, -0.022515510));
    blurred += sampleCover(v_TexCoord + vec2(-0.009338279, 0.025635224));
    blurred += sampleCover(v_TexCoord + vec2(-0.025635224, -0.009338279));
    blurred += sampleCover(v_TexCoord + vec2(0.009338279, -0.025635224));
    blurred += sampleCover(v_TexCoord + vec2(0.025635224, 0.009338279));
    blurred += sampleCover(v_TexCoord + vec2(-0.011137794, -0.026919834));
    blurred += sampleCover(v_TexCoord + vec2(0.026919834, -0.011137794));
    blurred += sampleCover(v_TexCoord + vec2(0.011137794, 0.026919834));
    blurred += sampleCover(v_TexCoord + vec2(-0.026919834, 0.011137794));
    blurred += sampleCover(v_TexCoord + vec2(0.028040021, 0.013093728));
    blurred += sampleCover(v_TexCoord + vec2(-0.013093728, 0.028040021));
    blurred += sampleCover(v_TexCoord + vec2(-0.028040021, -0.013093728));
    blurred += sampleCover(v_TexCoord + vec2(0.013093728, -0.028040021));
    blurred += sampleCover(v_TexCoord + vec2(-0.031227942, 0.009822933));
    blurred += sampleCover(v_TexCoord + vec2(-0.009822933, -0.031227942));
    blurred += sampleCover(v_TexCoord + vec2(0.031227942, -0.009822933));
    blurred += sampleCover(v_TexCoord + vec2(0.009822933, 0.031227942));
    blurred += sampleCover(v_TexCoord + vec2(0.017280922, -0.029875428));
    blurred += sampleCover(v_TexCoord + vec2(0.029875428, 0.017280922));
    blurred += sampleCover(v_TexCoord + vec2(-0.017280922, 0.029875428));
    blurred += sampleCover(v_TexCoord + vec2(-0.029875428, -0.017280922));
    blurred += sampleCover(v_TexCoord + vec2(0.007820377, 0.035434190));
    blurred += sampleCover(v_TexCoord + vec2(-0.035434190, 0.007820377));
    blurred += sampleCover(v_TexCoord + vec2(-0.007820377, -0.035434190));
    blurred += sampleCover(v_TexCoord + vec2(0.035434190, -0.007820377));
    blurred += sampleCover(v_TexCoord + vec2(-0.031158297, -0.021867574));
    blurred += sampleCover(v_TexCoord + vec2(0.021867574, -0.031158297));
    blurred += sampleCover(v_TexCoord + vec2(0.031158297, 0.021867574));
    blurred += sampleCover(v_TexCoord + vec2(-0.021867574, 0.031158297));
    blurred += sampleCover(v_TexCoord + vec2(0.039525088, -0.005154612));
    blurred += sampleCover(v_TexCoord + vec2(0.005154612, 0.039525088));
    blurred += sampleCover(v_TexCoord + vec2(-0.039525088, 0.005154612));
    blurred += sampleCover(v_TexCoord + vec2(-0.005154612, -0.039525088));
    blurred += sampleCover(v_TexCoord + vec2(-0.026832505, 0.031889982));
    blurred += sampleCover(v_TexCoord + vec2(-0.031889982, -0.026832505));
    blurred += sampleCover(v_TexCoord + vec2(0.026832505, -0.031889982));
    blurred += sampleCover(v_TexCoord + vec2(0.031889982, 0.026832505));
    blurred += sampleCover(v_TexCoord + vec2(-0.001833850, -0.043487833));
    blurred += sampleCover(v_TexCoord + vec2(0.043487833, -0.001833850));
    blurred += sampleCover(v_TexCoord + vec2(0.001833850, 0.043487833));
    blurred += sampleCover(v_TexCoord + vec2(-0.043487833, 0.001833850));
    blurred += sampleCover(v_TexCoord + vec2(0.032063915, 0.032168256));
    blurred += sampleCover(v_TexCoord + vec2(-0.032168256, 0.032063915));
    blurred += sampleCover(v_TexCoord + vec2(-0.032063915, -0.032168256));
    blurred += sampleCover(v_TexCoord + vec2(0.032168256, -0.032063915));
    blurred += sampleCover(v_TexCoord + vec2(-0.047317176, -0.002149353));
    blurred += sampleCover(v_TexCoord + vec2(0.002149353, -0.047317176));
    blurred += sampleCover(v_TexCoord + vec2(0.047317176, 0.002149353));
    blurred += sampleCover(v_TexCoord + vec2(-0.002149353, 0.047317176));
    blurred += sampleCover(v_TexCoord + vec2(0.037887706, -0.031669376));
    blurred += sampleCover(v_TexCoord + vec2(0.031669376, 0.037887706));
    blurred += sampleCover(v_TexCoord + vec2(-0.037887706, 0.031669376));
    blurred += sampleCover(v_TexCoord + vec2(-0.031669376, -0.037887706));
    blurred += sampleCover(v_TexCoord + vec2(-0.006822904, 0.051024108));
    blurred += sampleCover(v_TexCoord + vec2(-0.051024108, -0.006822904));
    blurred += sampleCover(v_TexCoord + vec2(0.006822904, -0.051024108));
    blurred += sampleCover(v_TexCoord + vec2(0.051024108, 0.006822904));
    blurred += sampleCover(v_TexCoord + vec2(-0.030693573, -0.044037716));
    blurred += sampleCover(v_TexCoord + vec2(0.044037716, -0.030693573));
    blurred += sampleCover(v_TexCoord + vec2(0.030693573, 0.044037716));
    blurred += sampleCover(v_TexCoord + vec2(-0.044037716, 0.030693573));
    blurred += sampleCover(v_TexCoord + vec2(0.054650987, 0.012247888));
    blurred += sampleCover(v_TexCoord + vec2(-0.012247888, 0.054650987));
    blurred += sampleCover(v_TexCoord + vec2(-0.054650987, -0.012247888));
    blurred += sampleCover(v_TexCoord + vec2(0.012247888, -0.054650987));
    blurred += sampleCover(v_TexCoord + vec2(-0.050728141, 0.029123272));
    blurred += sampleCover(v_TexCoord + vec2(-0.029123272, -0.050728141));
    blurred += sampleCover(v_TexCoord + vec2(0.050728141, -0.029123272));
    blurred += sampleCover(v_TexCoord + vec2(0.029123272, 0.050728141));
    blurred += sampleCover(v_TexCoord + vec2(0.018548276, -0.058304101));
    blurred += sampleCover(v_TexCoord + vec2(0.058304101, 0.018548276));
    blurred += sampleCover(v_TexCoord + vec2(-0.018548276, 0.058304101));
    blurred += sampleCover(v_TexCoord + vec2(-0.058304101, -0.018548276));
    blurred += sampleCover(v_TexCoord + vec2(0.026948038, 0.058201300));
    blurred += sampleCover(v_TexCoord + vec2(-0.058201300, 0.026948038));
    blurred += sampleCover(v_TexCoord + vec2(-0.026948038, -0.058201300));
    blurred += sampleCover(v_TexCoord + vec2(0.058201300, -0.026948038));
    blurred += sampleCover(v_TexCoord + vec2(-0.062239524, -0.025988080));
    blurred += sampleCover(v_TexCoord + vec2(0.025988080, -0.062239524));
    blurred += sampleCover(v_TexCoord + vec2(0.062239524, 0.025988080));
    blurred += sampleCover(v_TexCoord + vec2(-0.025988080, 0.062239524));
    blurred += sampleCover(v_TexCoord + vec2(0.067036240, -0.024173245));
    blurred += sampleCover(v_TexCoord + vec2(0.024173245, 0.067036240));
    blurred += sampleCover(v_TexCoord + vec2(-0.067036240, 0.024173245));
    blurred += sampleCover(v_TexCoord + vec2(-0.024173245, -0.067036240));
    blurred += sampleCover(v_TexCoord + vec2(-0.035230010, 0.067164568));
    blurred += sampleCover(v_TexCoord + vec2(-0.067164568, -0.035230010));
    blurred += sampleCover(v_TexCoord + vec2(0.035230010, -0.067164568));
    blurred += sampleCover(v_TexCoord + vec2(0.067164568, 0.035230010));
    blurred += sampleCover(v_TexCoord + vec2(-0.020899920, -0.079026183));
    blurred += sampleCover(v_TexCoord + vec2(0.079026183, -0.020899920));
    blurred += sampleCover(v_TexCoord + vec2(0.020899920, 0.079026183));
    blurred += sampleCover(v_TexCoord + vec2(-0.079026183, 0.020899920));
    blurred += sampleCover(v_TexCoord + vec2(0.076158899, 0.048881894));
    blurred += sampleCover(v_TexCoord + vec2(-0.048881894, 0.076158899));
    blurred += sampleCover(v_TexCoord + vec2(-0.076158899, -0.048881894));
    blurred += sampleCover(v_TexCoord + vec2(0.048881894, -0.076158899));
    vec3 cover = blurred.rgb * (1.0 / 128.0);

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
