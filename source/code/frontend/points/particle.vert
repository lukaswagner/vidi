precision lowp float;

#if __VERSION__ == 100
    #define texture(sampler, coord) texture2D(sampler, coord)
    attribute vec2 a_uv;
    attribute float a_xCoord;
    attribute float a_yCoord;
    attribute float a_zCoord;
    attribute vec3 a_vertexColor;
    attribute float a_variablePointSize;
#else
    #define varying out
    layout(location = 0) in vec2 a_uv;
    layout(location = 1) in float a_xCoord;
    layout(location = 2) in float a_yCoord;
    layout(location = 3) in float a_zCoord;
    layout(location = 4) in vec3 a_vertexColor;
    layout(location = 5) in float a_variablePointSize;
#endif

uniform mat2x3 u_posLimits;
uniform mat4 u_viewProjection;
uniform mat4 u_viewProjectionInverse;
uniform vec2 u_ndcOffset;
uniform float u_aspectRatio;
uniform float u_pointSize;
uniform float u_variablePointSizeStrength;

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
varying vec2 v_uv;
varying vec3 v_fragPos;

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
    vec3 pos = vec3(a_xCoord, a_yCoord, a_zCoord);
    pos -= u_posLimits[0];
    pos /= u_posLimits[1];
    pos *= 2.0;
    pos -= 1.0;
    v_pos = pos;
    v_color = color();
    v_uv = a_uv;

    vec4 position = u_viewProjection * vec4(pos, 1.0);

    // manual clipping - needs optimization
    if(position.z < 0.1) return;

    vec2 pointSize =
        vec2(u_pointSize, u_pointSize / u_aspectRatio) *
        mix(1.0, a_variablePointSize, u_variablePointSizeStrength) /
        position.z;
    position.xy = position.xy + a_uv * pointSize * vec2(position.w);
    position.xy = position.xy + u_ndcOffset * vec2(position.w);

    v_fragPos = (u_viewProjectionInverse * position).xyz;
    gl_Position = position;
}
