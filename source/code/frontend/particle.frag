
precision lowp float;
precision lowp int;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
#else
    #define varying in
    #define gl_FragColor fragColor
    layout(location = 0) out vec4 fragColor;
#endif

uniform vec3 u_lightDir;
uniform bool u_useDiscard;

varying vec3 v_pos;

void main()
{
    vec2 dir = gl_PointCoord * 2.0 + vec2(-1.0);
    float radius = length(dir);
    float edge = 0.95;
    float feather = fwidth(radius) / 2.0;
    float alpha = 1.0 - smoothstep(
        edge - feather,edge + feather, radius);

    if(u_useDiscard) {
        if(alpha < 0.5) discard;
        alpha = 1.0;
    }

    gl_FragColor = vec4(v_pos + 0.5, alpha);
}