
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

void main()
{
    vec2 dir = gl_PointCoord * 2.0 + vec2(-1.0);
    float alpha = step(length(dir), 1.0);

    if(alpha < 0.5) discard;

    gl_FragColor = vec4(1.0);
}