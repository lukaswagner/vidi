precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in float a_index;
layout(location = 3) in mat4 a_transform;
layout(location = 7) in float a_offset;
layout(location = 8) in vec2 a_quadLowerBounds;
layout(location = 9) in vec2 a_quadUpperBounds;
layout(location = 10) in vec2 a_dataLowerBounds;
layout(location = 11) in vec2 a_dataUpperBounds;
layout(location = 12) in vec2 a_gridSubdivisions;

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

out vec2 v_uv;

out vec2 v_quadLowerBounds;
out vec2 v_quadUpperBounds;
out vec2 v_quadRange;
out vec2 v_dataLowerBounds;
out vec2 v_dataUpperBounds;
out vec2 v_dataRange;
out vec2 v_gridSubdivisions;

out vec2 v_dataLowerBoundsUV;
out vec2 v_dataUpperBoundsUV;
out vec2 v_dataRangeUV;
out vec2 v_gridSubdivisionsUV;
out vec2 v_gridSubdivisionsUVInv;

out vec2 v_gridSubdivisionsScaled;

flat out int v_index;

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

    v_index = int(a_index);
}
