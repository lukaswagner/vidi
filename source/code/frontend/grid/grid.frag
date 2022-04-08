precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;

uniform sampler2D u_orthoViews;
uniform vec2 u_orthoRange;
uniform float u_orthoFactor;
uniform float u_orthoGamma;

const vec3 u_color = vec3(0.0, 0.0, 0.0);

const float u_innerIntensity = 0.35;
const float u_outerIntensity = 0.1;
const float u_invisIntensity = 0.0;

const float u_innerFeather = 0.1;
const float u_outerFeather = 1.1;

const float u_gridWidth = 0.02;

const float u_aaStepScale = 1.2;

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

flat in int v_index;

float grid()
{
    vec2 scaled = (v_uv - v_dataLowerBoundsUV) * v_gridSubdivisionsScaled;
    vec2 f = fract(scaled);
    vec2 df = fwidth(scaled) * u_aaStepScale;
    vec2 lower = smoothstep(vec2(0.0), df, f);
    vec2 upper = 1.0 - smoothstep(1.0 - df, vec2(1.0), f);
    vec2 nearest = min(lower, upper);
    return 1.0 - min(nearest.x, nearest.y);
}

float map(float v, float i0, float i1, float o0, float o1)
{
    float t = (v - i0) / (i1 - i0);
    return mix(o0, o1, t);
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

    vec2 uv = (v_uv - v_dataLowerBoundsUV) / (v_dataUpperBoundsUV - v_dataLowerBoundsUV);
    float inside = step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
    float ortho = texture(u_orthoViews, uv)[v_index];
    ortho = map(ortho, u_orthoRange[0], u_orthoRange[1], 0., 1.);
    ortho = pow(ortho, u_orthoGamma);
    ortho *= u_orthoFactor;
    ortho = clamp(ortho, 0., 1.);
    ortho *= inside;

    float intensity = distIntensity * grid() + ortho;
    f_color = vec4(u_color, intensity);
}
