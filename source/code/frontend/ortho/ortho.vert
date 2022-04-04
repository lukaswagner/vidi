precision highp float;

layout(location = 1) in float a_xCoord;
layout(location = 2) in float a_yCoord;
layout(location = 3) in float a_zCoord;
layout(location = 5) in float a_variablePointSize;

uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform vec3 u_limits[2];

const float TWO_PI_INV = 0.15915494309;

void main()
{
    vec4 pos = u_model * vec4(a_xCoord, a_yCoord, a_zCoord, 1.0);
    pos /= pos.w;

    float limited = step(3.0, dot(
        step(u_limits[0], pos.xyz),
        step(pos.xyz, u_limits[1])));
    // if(limited < 0.1) return;

    gl_Position = u_viewProjection * pos;
    gl_PointSize = 10.;
}
