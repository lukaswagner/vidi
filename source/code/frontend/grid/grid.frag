precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;

const vec3 u_color = vec3(0.0, 0.0, 0.0);

const float u_innerIntensity = 1.0;
const float u_outerIntensity = 0.15;
const float u_invisIntensity = 0.0;

const float u_innerFeather = 0.1;
const float u_outerFeather = 1.1;

const float u_gridWidth = 0.02;

const float u_aaStepScale = 0.7;

in vec2 v_uv;

in vec2 v_quadLowerBounds;
in vec2 v_quadUpperBounds;
in vec2 v_quadRange;
in vec2 v_dataLowerBounds;
in vec2 v_dataUpperBounds;
in vec2 v_dataRange;
in vec2 v_gridSubdivisions;

in vec2 v_dataLowerBoundsUV;
in vec2 v_dataUpperBoundsUV;
in vec2 v_dataRangeUV;
in vec2 v_gridSubdivisionsUV;
in vec2 v_gridSubdivisionsUVInv;

in vec2 v_gridSubdivisionsScaled;

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
    f_color = vec4(u_color, intensity);
}
