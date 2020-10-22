precision lowp float;

layout (location = 0) in vec2 a_vertex;
layout (location = 1) in vec3 a_position;
layout (location = 2) in vec3 a_size;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

const float c_halfPi = 1.57079632679;
const float c_pi = 3.14159265359;
const float c_twoPi = 6.28318530718;

out vec2 v_uv;
out vec3 v_normal;
out vec4 v_vertex;

void main()
{
    v_uv = vec2(a_vertex.x, 1.0 - a_vertex.y);

    float longitude = a_vertex.x * c_twoPi - c_pi;
    float latitude = a_vertex.y * c_pi - c_halfPi;

    vec3 sphere = a_size * vec3(
        cos(latitude) * cos(longitude),
        sin(latitude),
        cos(latitude) * sin(longitude));
    v_normal = normalize(sphere);
    v_vertex = vec4(a_position + sphere, 1.0);

    v_vertex = u_model * v_vertex;
    gl_Position = u_viewProjection * v_vertex;
}
