precision lowp float;

@import ../shared/ndcoffset;

#if __VERSION__ == 100
    attribute vec3 a_pos;
#else
    #define varying out
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec2 a_uv;
    layout(location = 2) in mat4 a_transform;
    layout(location = 6) in vec2 a_quadLowerBounds;
    layout(location = 7) in vec2 a_quadUpperBounds;
    layout(location = 8) in vec2 a_dataLowerBounds;
    layout(location = 9) in vec2 a_dataUpperBounds;
    layout(location = 10) in vec2 a_gridResolution;
#endif

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

varying vec2 v_uv;

varying vec2 v_quadLowerBounds;
varying vec2 v_quadUpperBounds;
varying vec2 v_quadRange;
varying vec2 v_dataLowerBounds;
varying vec2 v_dataUpperBounds;
varying vec2 v_dataRange;
varying vec2 v_gridResolution;

varying vec2 v_dataLowerBoundsUV;
varying vec2 v_dataUpperBoundsUV;
varying vec2 v_dataRangeUV;
varying vec2 v_gridResolutionUV;

void main()
{
    v_uv = a_uv;

    v_quadLowerBounds = a_quadLowerBounds;
    v_quadUpperBounds = a_quadUpperBounds;
    v_quadRange = a_quadUpperBounds - a_quadLowerBounds;
    v_dataLowerBounds = a_dataLowerBounds;
    v_dataUpperBounds = a_dataUpperBounds;
    v_dataRange = a_dataUpperBounds - a_dataLowerBounds;
    v_gridResolution = a_gridResolution;

    v_dataLowerBoundsUV = (v_dataLowerBounds - v_quadLowerBounds) / v_quadRange;
    v_dataUpperBoundsUV = (v_dataUpperBounds - v_quadLowerBounds) / v_quadRange;
    v_dataRangeUV = v_dataRange / v_quadRange;
    v_gridResolutionUV = v_gridResolution / v_quadRange;

    vec4 vertex = u_viewProjection * a_transform * vec4(a_position, 1.0);
    ndcOffset(vertex, u_ndcOffset);
    gl_Position = vertex;
}
