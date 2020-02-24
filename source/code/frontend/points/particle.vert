precision lowp float;
precision lowp int;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec3 a_localPos;
    attribute vec3 a_globalPos;
#else
    #define varying out
    layout(location = 0) in vec3 a_localPos;
    layout(location = 1) in vec3 a_globalPos;
#endif

uniform mat4 u_view;
uniform mat4 u_viewProjection;

uniform float u_frameSize;
uniform float u_pointSize;

varying vec3 v_pos;

void main()
{
    v_pos = a_localPos + a_globalPos;
    gl_Position = u_viewProjection * vec4(v_pos, 1.0);
    gl_PointSize = u_frameSize * u_pointSize / gl_Position.z;
}