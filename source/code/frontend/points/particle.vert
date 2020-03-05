precision lowp float;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec3 a_localPos;
    attribute vec3 a_globalPos;
    attribute vec3 a_pointColor;
#else
    #define varying out
    layout(location = 0) in vec3 a_localPos;
    layout(location = 1) in vec3 a_globalPos;
    layout(location = 2) in vec3 a_pointColor;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;
uniform float u_frameSize;
uniform float u_pointSize;

const int COLOR_MODE_SINGLE_COLOR = 0;
const int COLOR_MODE_POSITION_BASED = 1;
const int COLOR_MODE_VERTEX_COLOR = 2;
const int COLOR_MODE_AGGREGATION_BASED = 3;
const int u_colorMode = 1;

const vec3 u_pointColor = vec3(1.0, 0.0, 0.0);

varying vec3 v_pos;
varying vec3 v_color;

vec3 color()
{
    if (u_colorMode == COLOR_MODE_SINGLE_COLOR) {
        return u_pointColor;
    } else if (u_colorMode == COLOR_MODE_POSITION_BASED) {
        return v_pos + 0.5;
    } else if (u_colorMode == COLOR_MODE_VERTEX_COLOR) {
        return a_pointColor;
    }
}

void main()
{
    v_pos = a_localPos + a_globalPos;
    v_color = color();

    vec4 vertex = u_viewProjection * vec4(v_pos, 1.0);
    vertex.xy = u_ndcOffset * vec2(vertex.w) + vertex.xy;
    gl_Position = vertex;
    gl_PointSize = u_frameSize * u_pointSize / gl_Position.z;
}
