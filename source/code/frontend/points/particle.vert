precision highp float;

layout(location = 0) in vec2 a_uv;
layout(location = 1) in float a_xCoord;
layout(location = 2) in float a_yCoord;
layout(location = 3) in float a_zCoord;
layout(location = 4) in vec4 a_vertexColor;
layout(location = 5) in float a_variablePointSize;
layout(location = 6) in float a_clusterId;
layout(location = 7) in float a_selected;

uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform mat4 u_viewProjectionInverse;
uniform vec2 u_ndcOffset;
uniform float u_aspectRatio;
uniform float u_pointSize;
uniform float u_variablePointSizeStrength;
uniform vec3 u_variablePointSizeInputRange;
uniform vec3 u_variablePointSizeOutputRange;
uniform float u_numClusters;

const int COLOR_MODE_SINGLE_COLOR = 0;
const int COLOR_MODE_POSITION_BASED = 1;
const int COLOR_MODE_VERTEX_COLOR = 2;
const int COLOR_MODE_CLUSTER_COLOR = 3;
uniform int u_colorMode;

const int COLOR_MAPPING_RGB_CUBE = 0;
const int COLOR_MAPPING_HSL_CYLINDER = 1;
uniform int u_colorMapping;

uniform uint u_idOffset;
uniform uint u_selected;
uniform vec3 u_limits[2];

const vec3 u_pointColor = vec3(1.0, 0.0, 0.0);

const float TWO_PI_INV = 0.15915494309;

out vec3 v_pos;
out vec3 v_color;
out vec2 v_uv;
out vec3 v_fragPos;
flat out uint v_instanceId;

@import ../clustering/clusterColor;
#line 54

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
            vec3(atan(v_pos.y, v_pos.x) * TWO_PI_INV,
            length(vec2(v_pos.y, v_pos.x)),
            v_pos.z * 0.25 + 0.5)
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
        return a_vertexColor.rgb;
    } else if (u_colorMode == COLOR_MODE_CLUSTER_COLOR) {
        return clusterColor(a_clusterId, u_numClusters);
    }
}

void main()
{
    vec4 pos = u_model * vec4(a_xCoord, a_yCoord, a_zCoord, 1.0);
    v_pos = pos.xyz / pos.w;
    v_color = color();
    v_uv = a_uv;
    v_instanceId =  u_idOffset + uint(gl_InstanceID);

    vec4 position = u_viewProjection * pos;

    // manual clipping - needs optimization
    if(position.z < 0.1) return;

    v_color = mix(vec3(1, 0, 0), vec3(0, 1, 0), step(0.5, a_selected));

#line 98
    float limited = step(3.0, dot(
        step(u_limits[0], v_pos.xyz),
        step(v_pos.xyz, u_limits[1])));
    if(limited < 0.1) return;

    float variablePointSize =
        pow(
            (a_variablePointSize - u_variablePointSizeInputRange.x) *
            u_variablePointSizeInputRange.z,
            0.3) *
        u_variablePointSizeOutputRange.z +
        u_variablePointSizeOutputRange.x;
    vec2 pointSize =
        vec2(u_pointSize * u_aspectRatio, u_pointSize) *
        mix(1.0, variablePointSize, u_variablePointSizeStrength) /
        position.z;
    if(v_instanceId == u_selected) pointSize *= 1.5;
    position.xy = position.xy + a_uv * pointSize * vec2(position.w);
    position.xy = position.xy + u_ndcOffset * vec2(position.w);

    v_fragPos = (u_viewProjectionInverse * position).xyz;
    gl_Position = position;
}
