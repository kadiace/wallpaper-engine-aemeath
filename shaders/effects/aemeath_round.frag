#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
varying vec2 v_TexCoord;

void main() {
    vec2 distanceToCorner = abs(v_TexCoord - vec2(0.5, 0.5)) - vec2(0.41, 0.41);
    float distanceToEdge = length(max(distanceToCorner, 0.0))
        + min(max(distanceToCorner.x, distanceToCorner.y), 0.0) - 0.09;
    float opacity = 1.0 - smoothstep(-0.008, 0.008, distanceToEdge);
    vec4 color = texSample2D(g_Texture0, v_TexCoord);
    gl_FragColor = vec4(color.rgb, color.a * opacity);
}
