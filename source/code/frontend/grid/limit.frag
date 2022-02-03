precision highp float;
precision highp int;

layout(location = 0) out vec4 f_color;
layout(location = 1) out uvec3 f_indexHigh;
layout(location = 2) out uvec3 f_indexLow;

uniform uint u_selected;

flat in uint v_id;

void main()
{
    vec3 color = vec3(0);
    if(v_id == u_selected) color += 0.3;
    f_color = vec4(color, 1);
    f_indexHigh = uvec3(
        1u << 6, // set second-lowest bit to mark limit handlers
        0u,
        v_id & 255u
    );
    f_indexLow = uvec3(
        0u,
        0u,
        0u
    );
}
