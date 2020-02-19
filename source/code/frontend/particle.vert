precision lowp float;
precision lowp int;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec3 a_position;
#else
    #define varying out
    in vec3 a_position;
#endif

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_viewProjection;

uniform float u_frameSize;
uniform float u_pointSize;

void main()
{
    vec4 p  = u_model * vec4(a_position, 1.0);
    gl_Position = u_viewProjection * p;
    gl_PointSize = u_frameSize * 0.25 * u_pointSize;
}