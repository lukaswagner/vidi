precision lowp float;
precision highp int;

layout(location = 0) out vec4 fragColor;

in vec2 v_uv;
in vec3 v_normal;
in vec4 v_vertex;
in vec3 v_color;

void main(void)
{
    fragColor = vec4(v_color, 0.5);
}
