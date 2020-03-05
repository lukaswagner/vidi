precision lowp float;
precision lowp int;

#extension GL_OES_standard_derivatives : enable

#if __VERSION__ != 100
    #define varying in
    #define gl_FragColor fragColor
    layout(location = 0) out vec4 fragColor;
#endif

const vec3 u_innerColor = vec3(0.0, 0.0, 0.0);
const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

const float u_innerIntensity = 1.0;
const float u_outerIntensity = 0.15;
const float u_invisIntensity = 0.0;

const float u_innerFeather = 0.1;
const float u_outerFeather = 1.1;

const float u_gridWidth = 0.02;

const float u_aaStepScale = 0.5;

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

float aastep(float t, float value)
{
    float afwidth = fwidth(value) * u_aaStepScale;
    return smoothstep(t - afwidth, t + afwidth, value);
}

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

    float distIntensity = u_invisIntensity;
    distIntensity = mix(distIntensity, u_outerIntensity, invisOuterMix);
    distIntensity = mix(distIntensity, u_innerIntensity, outerInnerMix);

    vec2 grid2 = fract(v_uv / v_gridResolutionUV);
    float halfWidth = u_gridWidth * 0.5;
    vec2 a = 0.5 - abs(grid2 - 0.5);
    float grid = 1.0 - (aastep(halfWidth, a.x) * aastep(halfWidth, a.y));

    float intensity = distIntensity * grid;

    vec3 color = mix(u_invisColor, u_innerColor, intensity);

    gl_FragColor = vec4(color, 1.0);
}
