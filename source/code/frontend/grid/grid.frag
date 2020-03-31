#extension GL_OES_standard_derivatives : enable

precision lowp float;
precision lowp int;

#if __VERSION__ != 100
    #define varying in
    #define gl_FragColor fragColor
    layout(location = 0) out vec4 fragColor;
#endif

const vec3 u_color = vec3(0.0, 0.0, 0.0);

const float u_innerIntensity = 1.0;
const float u_outerIntensity = 0.15;
const float u_invisIntensity = 0.0;

const float u_innerFeather = 0.1;
const float u_outerFeather = 1.1;

const float u_gridWidth = 0.02;

const float u_aaStepScale = 0.7;

varying vec2 v_uv;

varying vec2 v_quadLowerBounds;
varying vec2 v_quadUpperBounds;
varying vec2 v_quadRange;
varying vec2 v_dataLowerBounds;
varying vec2 v_dataUpperBounds;
varying vec2 v_dataRange;
varying vec2 v_gridSubdivisions;

varying vec2 v_dataLowerBoundsUV;
varying vec2 v_dataUpperBoundsUV;
varying vec2 v_dataRangeUV;
varying vec2 v_gridSubdivisionsUV;
varying vec2 v_gridSubdivisionsUVInv;

varying vec2 v_gridSubdivisionsScaled;

float grid() {
    vec2 scaled = (v_uv - v_dataLowerBoundsUV) * v_gridSubdivisionsScaled;
    vec2 f = fract(scaled);
    vec2 df = fwidth(scaled) * u_aaStepScale;
    vec2 lower = smoothstep(vec2(0.0), df, f);
    vec2 upper = 1.0 - smoothstep(1.0 - df, vec2(1.0), f);
    vec2 nearest = min(lower, upper);
    return 1.0 - min(nearest.x, nearest.y);
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

    float intensity = distIntensity * grid();
    gl_FragColor = vec4(u_color, intensity);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
