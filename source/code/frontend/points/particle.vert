precision lowp float;

@import ../shared/ndcoffset;
#line 5

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec3 a_localPos;
    attribute vec3 a_globalPos;
#else
    #define varying out
    layout(location = 0) in vec3 a_localPos;
    layout(location = 1) in vec3 a_globalPos;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

uniform float u_frameSize;
uniform float u_pointSize;

varying vec3 v_pos;

void main()
{
    v_pos = a_localPos + a_globalPos;
    vec4 vertex = u_viewProjection * vec4(v_pos, 1.0);
    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
    gl_PointSize = u_frameSize * u_pointSize / gl_Position.z;
}