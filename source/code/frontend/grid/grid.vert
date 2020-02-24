precision lowp float;

#if __VERSION__ == 100
    attribute vec3 a_pos;
#else
    layout(location = 0) in vec3 a_pos;
#endif

uniform mat4 u_viewProjection;

void main()
{
    gl_Position = u_viewProjection * vec4(a_pos, 1.0);
}
