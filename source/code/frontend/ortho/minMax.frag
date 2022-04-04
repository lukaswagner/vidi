precision highp float;
precision highp int;
precision highp usampler2D;

layout(location = 0) out vec2 f_color;

const int c_res = RESOLUTION;

uniform sampler2D u_texture;
uniform int u_level;
uniform float u_res;

in vec2 v_uv;

void main()
{
    vec2 uv = v_uv * u_res / (u_res + 1.);
    float minimum = 1.;
    float maximum = 0.;

    for(int x = 0; x < c_res; x++)
    {
        for(int y = 0; y < c_res; y++)
        {
            ivec2 global = ivec2(uv * u_res);
            ivec2 local = ivec2(x, y);
            ivec2 coord = global + local;
            vec3 value = texelFetch(u_texture, coord, 0).rgb;
            if (u_level == 0)
            {
                minimum = min(min(minimum, value.r), min(value.g, value.b));
                maximum = max(max(maximum, value.r), max(value.g, value.b));
            }
            else
            {
                minimum = min(minimum, value.r);
                maximum = max(maximum, value.g);
            }
        }
    }

    f_color = vec2(minimum, maximum);
}
