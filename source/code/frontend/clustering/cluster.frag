precision lowp float;
precision highp int;

layout(location = 0) out vec4 fragColor;

in vec2 v_uv;
in vec3 v_normal;
in vec4 v_vertex;

void main(void)
{
    fragColor = vec4(0.7, 0.1, 0.1, 0.5);
}
