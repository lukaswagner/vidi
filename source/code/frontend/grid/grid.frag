#line 2 1338
precision lowp float;
precision lowp int;

#if __VERSION__ != 100
    #define varying in
    #define gl_FragColor fragColor
    layout(location = 0) out vec4 fragColor;
#endif

const vec4 u_innerColor = vec4(0.0, 0.0, 0.0, 1.0);
const vec4 u_outerColor = vec4(0.8, 0.8, 0.8, 1.0);
const vec4 u_invisColor = vec4(248.0/255.0, 249.0/255.0, 250.0/255.0, 1.0);

const float u_innerFeather = 0.1;
const float u_outerFeather = 0.5;

varying vec2 v_uv;

varying vec2 v_quadLowerBounds;
varying vec2 v_quadUpperBounds;
varying vec2 v_quadRange;
varying vec2 v_dataLowerBounds;
varying vec2 v_dataUpperBounds;
varying vec2 v_dataRange;
varying vec2 v_gridResolution;

varying vec2 v_dataLowerBoundsUV;
varying vec2 v_dataUpperBoundsUV;
varying vec2 v_dataRangeUV;
varying vec2 v_gridResolutionUV;

void main()
{
    vec2 dist2 = clamp(mix(
        (v_dataLowerBoundsUV - v_uv) / v_dataLowerBoundsUV,
        (v_uv - v_dataUpperBoundsUV) / (1.0 - v_dataUpperBoundsUV),
        step((v_dataLowerBoundsUV + v_dataUpperBoundsUV) / 2.0, v_uv)
    ), 0.0, 1.0);
    float dist = length(dist2);

    float invisOuterMix = smoothstep(
        1.0, 1.0 - u_outerFeather, dist);
    float outerInnerMix = smoothstep(
        u_innerFeather, 0.0, dist);

    vec4 color = u_invisColor;
    color = mix(color, u_outerColor, invisOuterMix);
    color = mix(color, u_innerColor, outerInnerMix);

    vec2 grid2 = fract(v_uv / v_gridResolutionUV);
    float grid = step(0.05, grid2.x) * step(0.05, grid2.y);

    gl_FragColor = color * (1.0 - grid);
}
