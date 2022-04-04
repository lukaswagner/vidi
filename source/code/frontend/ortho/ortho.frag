precision highp float;
precision highp int;

layout(location = 0) out vec3 f_color;

uniform uint u_channel;
uniform float u_factor;

void main()
{
    float radius = length(gl_PointCoord * 2.0 - 1.0);
    if(radius > 1.0) discard;
    vec3 color;
    color[u_channel] = 1.0;
    f_color = u_factor * (1.0 - radius) * color;
}
