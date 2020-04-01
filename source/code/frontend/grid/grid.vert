precision lowp float;

#if __VERSION__ == 100
    attribute vec3 a_position;
    attribute vec2 a_uv;
    attribute mat4 a_transform;
    attribute float a_offset;
    attribute vec2 a_quadLowerBounds;
    attribute vec2 a_quadUpperBounds;
    attribute vec2 a_dataLowerBounds;
    attribute vec2 a_dataUpperBounds;
    attribute vec2 a_gridSubdivisions;
#else
    #define varying out
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec2 a_uv;
    layout(location = 2) in mat4 a_transform;
    layout(location = 6) in float a_offset;
    layout(location = 7) in vec2 a_quadLowerBounds;
    layout(location = 8) in vec2 a_quadUpperBounds;
    layout(location = 9) in vec2 a_dataLowerBounds;
    layout(location = 10) in vec2 a_dataUpperBounds;
    layout(location = 11) in vec2 a_gridSubdivisions;
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
varying vec2 v_gridSubdivisions;

varying vec2 v_dataLowerBoundsUV;
varying vec2 v_dataUpperBoundsUV;
varying vec2 v_dataRangeUV;
varying vec2 v_gridSubdivisionsUV;
varying vec2 v_gridSubdivisionsUVInv;

varying vec2 v_gridSubdivisionsScaled;

void main()
{
    v_uv = a_uv;

    v_quadLowerBounds = a_quadLowerBounds;
    v_quadUpperBounds = a_quadUpperBounds;
    v_quadRange = a_quadUpperBounds - a_quadLowerBounds;
    v_dataLowerBounds = a_dataLowerBounds;
    v_dataUpperBounds = a_dataUpperBounds;
    v_dataRange = a_dataUpperBounds - a_dataLowerBounds;
    v_gridSubdivisions = a_gridSubdivisions;

    v_dataLowerBoundsUV = (v_dataLowerBounds - v_quadLowerBounds) / v_quadRange;
    v_dataUpperBoundsUV = (v_dataUpperBounds - v_quadLowerBounds) / v_quadRange;
    v_dataRangeUV = v_dataRange / v_quadRange;
    v_gridSubdivisionsUV = v_gridSubdivisions / v_quadRange;
    v_gridSubdivisionsUVInv = 1.0 / v_gridSubdivisionsUV;
    v_gridSubdivisionsScaled = v_gridSubdivisions / v_dataRangeUV;

    vec4 offsetted = vec4(a_position.x, a_position.y, a_offset, 1.0);
    vec4 vertex = u_viewProjection * a_transform * offsetted;
    vertex.xy = u_ndcOffset * vec2(vertex.w) + vertex.xy;
    gl_Position = vertex;
}
