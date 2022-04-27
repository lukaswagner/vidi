precision highp float;
precision highp int;
precision highp usampler2D;

layout(location = 0) out vec4 f_color;

uniform sampler2D u_color;
uniform usampler2D u_index;
uniform sampler2D u_depth;

uniform int u_texture;
uniform int u_channel;

in vec2 v_uv;

const float c_uintMax = 255.0;

void main()
{
    vec3 result;
    if(u_texture == 0) {
        result = texture(u_color, v_uv).rgb;
    } else if(u_texture == 1) {
        result = vec3(texture(u_index, v_uv).rgb) / c_uintMax;
    } else if(u_texture == 2) {
        result = vec3(texture(u_depth, v_uv).r);
        result = pow(result, vec3(10.0));
    }

    if(u_channel > 0) result = vec3(result[u_channel - 1]);
    f_color = vec4(result, 1.0);
}
