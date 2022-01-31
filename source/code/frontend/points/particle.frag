precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;
layout(location = 1) out uvec4 f_index;

const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

uniform bool u_useDiscard;
uniform vec3 u_cameraPosition;
uniform vec3 u_cutoffPosition;
uniform vec3 u_cutoffPositionMask;

in vec3 v_pos;
in vec3 v_color;
in vec2 v_uv;
in vec3 v_fragPos;

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
    f_index = uvec4(0);
}
