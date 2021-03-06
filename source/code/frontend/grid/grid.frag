precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;
layout(location = 1) out uvec3 f_indexHigh;
layout(location = 2) out uvec3 f_indexLow;

uniform sampler2D u_orthoViews;
uniform vec2 u_orthoRange;
uniform float u_orthoFactor;
uniform float u_orthoGamma;
uniform bool u_orthoHeatmap;
uniform sampler2D u_colorScheme;

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

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
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

    if(u_orthoHeatmap) {
        vec3 g_rgb = u_color;
        float g_a = distIntensity * grid();
        vec3 o_rgb = texture(u_colorScheme, vec2(ortho, 0.5)).rgb;
        float o_a = smoothstep(0.01, 0.01 + fwidth(ortho), ortho);
        float t = smoothstep(0.01, 0.011, g_a);
        f_color = mix(vec4(o_rgb, o_a), vec4(g_rgb, g_a), t);
    } else {
        float intensity = distIntensity * grid() + ortho;
        f_color = vec4(u_color, intensity);
    }

    uint unsignedIndex = uint(v_index) & 255u; // 0 to 2
    uint unsignedInside = uint(inside) << 7;
    f_indexHigh = uvec3(
        1u << 5, // set third-lowest bit to mark grids
        0u,
        unsignedIndex | unsignedInside
    );
    uvec2 unsignedUv = uvec2(clamp(uv, 0., 1.) * 4095.) & 4095u;
    uvec2 unsignedUvTop = (unsignedUv >> 8) & 15u; // top 4 bits
    f_indexLow = uvec3(
        unsignedUv.x & 255u,
        unsignedUv.y & 255u,
        unsignedUvTop.x << 4 | unsignedUvTop.y
    );
}
