#include "common.h"

uniform sampler2D g_Texture0; // {"material":"previous","hidden":true}
varying vec2 v_TexCoord;

void main() {
    vec2 offset = vec2(0.014, 0.014);
    vec4 color = texSample2D(g_Texture0, v_TexCoord) * 0.16;
    color += texSample2D(g_Texture0, v_TexCoord + vec2(-offset.x, -offset.y)) * 0.10;
    color += texSample2D(g_Texture0, v_TexCoord + vec2( offset.x, -offset.y)) * 0.10;
    color += texSample2D(g_Texture0, v_TexCoord + vec2(-offset.x,  offset.y)) * 0.10;
    color += texSample2D(g_Texture0, v_TexCoord + vec2( offset.x,  offset.y)) * 0.10;
    color += texSample2D(g_Texture0, v_TexCoord + vec2(-offset.x, 0.0)) * 0.11;
    color += texSample2D(g_Texture0, v_TexCoord + vec2( offset.x, 0.0)) * 0.11;
    color += texSample2D(g_Texture0, v_TexCoord + vec2(0.0, -offset.y)) * 0.11;
    color += texSample2D(g_Texture0, v_TexCoord + vec2(0.0,  offset.y)) * 0.11;
    gl_FragColor = color;
}
