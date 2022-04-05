precision highp float;

layout(location = 0) in vec2 a_uv;
layout(location = 1) in float a_xCoord;
layout(location = 2) in float a_yCoord;
layout(location = 3) in float a_zCoord;
layout(location = 4) in float a_selected;

uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform mat4 u_viewProjectionInverse;
uniform vec2 u_ndcOffset;
uniform int u_baseAxis;
uniform float u_baseValue;

out vec2 v_uv;

void main()
{
    vec4 pointPos = vec4(a_xCoord, a_yCoord, a_zCoord, 1.0);

    pointPos = u_model * pointPos;
    pointPos = pointPos / pointPos.w;

    vec4 basePos = pointPos;
    basePos[u_baseAxis] = u_baseValue;

    vec4 viewPointPos = u_viewProjection * pointPos;
    viewPointPos = viewPointPos / viewPointPos.w;
    vec4 viewBasePos = u_viewProjection * basePos;
    viewBasePos = viewBasePos / viewBasePos.w;

    vec2 lineDir = normalize(viewPointPos.xy - viewBasePos.xy);
    vec2 ortho = vec2(-lineDir.y, lineDir.x);

    vec4 position = mix(viewBasePos, viewPointPos, (a_uv.y * 0.5 + 0.5));

    float width = 0.005;
    vec2 offset = ortho * width * (a_uv.x - 0.5);
    position.xy += offset;
    position.xy = position.xy + u_ndcOffset * vec2(position.w);

    v_uv = a_uv;
    gl_Position = position;
}
