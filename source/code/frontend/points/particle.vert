precision lowp float;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec3 a_localPos;
    attribute vec3 a_globalPos;
    attribute vec3 a_vertexColor;
#else
    #define varying out
    layout(location = 0) in vec3 a_localPos;
    layout(location = 1) in vec3 a_globalPos;
    layout(location = 2) in vec3 a_vertexColor;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;
uniform float u_frameSize;
uniform float u_pointSize;

const int COLOR_MODE_SINGLE_COLOR = 0;
const int COLOR_MODE_POSITION_BASED = 1;
const int COLOR_MODE_VERTEX_COLOR = 2;
const int COLOR_MODE_AGGREGATION_BASED = 3;
uniform int u_colorMode;

const int COLOR_MAPPING_RGB_CUBE = 0;
const int COLOR_MAPPING_HSL_CYLINDER = 1;
uniform int u_colorMapping;

const vec3 u_pointColor = vec3(1.0, 0.0, 0.0);

const float TWO_PI_INV = 0.15915494309;

varying vec3 v_pos;
varying vec3 v_color;

vec3 hsl2rgb(vec3 c)
{
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
    return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

vec3 positionBasedColor()
{
    if (u_colorMapping == COLOR_MAPPING_RGB_CUBE) {
        return v_pos + 0.5;
    } else if (u_colorMapping == COLOR_MAPPING_HSL_CYLINDER) {
        return hsl2rgb(
            vec3(atan(v_pos.z, v_pos.x) * TWO_PI_INV,
            length(vec2(v_pos.z, v_pos.x)),
            v_pos.y * 0.25 + 0.5)
        );
    }
}

vec3 color()
{
    if (u_colorMode == COLOR_MODE_SINGLE_COLOR) {
        return u_pointColor;
    } else if (u_colorMode == COLOR_MODE_POSITION_BASED) {
        return positionBasedColor();
    } else if (u_colorMode == COLOR_MODE_VERTEX_COLOR) {
        return a_vertexColor;
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
