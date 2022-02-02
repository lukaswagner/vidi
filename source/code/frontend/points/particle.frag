precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;
layout(location = 1) out uvec3 f_indexHigh;
layout(location = 2) out uvec3 f_indexLow;

const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

uniform bool u_useDiscard;
uniform vec3 u_cameraPosition;
uniform vec3 u_cutoffPosition;
uniform vec3 u_cutoffPositionMask;
uniform uint u_idOffset;

in vec3 v_pos;
in vec3 v_color;
in vec2 v_uv;
in vec3 v_fragPos;
flat in int v_instanceId;

void main()
{
    float radius = length(v_uv);
    float edge = 0.95;
    float feather = fwidth(radius) / 2.0;
    float alpha = 1.0 - smoothstep(
        edge - feather,edge + feather, radius);

    if(u_useDiscard) {
        if(alpha < 0.5) discard;
        alpha = 1.0;
    }

    vec3 faded = mix(v_color, u_invisColor, 0.7);
    vec3 fadeVec = mix(
        step(v_fragPos, u_cutoffPosition),
        step(u_cutoffPosition, v_fragPos),
        step(u_cutoffPosition, u_cameraPosition)
    );
    vec3 fadeMask = step(u_cutoffPositionMask, fadeVec * u_cutoffPositionMask);
    float fadeFactor = step(3.0, dot(fadeMask, vec3(1.0)));
    vec3 color = mix(faded, v_color, fadeFactor);

    f_color = vec4(color, alpha);
    uint id = u_idOffset + uint(v_instanceId);
    f_indexHigh = uvec3(
        1u << 7, // set lowest bit to mark points
        0u,
        (id >> 24) & 255u
    );
    f_indexLow = uvec3(
        (id >> 16) & 255u,
        (id >> 8) & 255u,
        id & 255u
    );
}
