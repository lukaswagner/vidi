precision highp float;

layout(location = 0) in vec2 a_position;

flat out uint v_id;

uniform mat4 u_viewProjection;
uniform vec2 u_ndcOffset;

uniform vec3 u_dir;
uniform vec3 u_up;
uniform vec3 u_pos;
uniform float u_factor;
uniform uint u_selected;
uniform float u_handlePositions[6];

void main()
{
    vec3 dir = abs(u_dir);
    v_id =
        uint(u_factor) << 3 |
        uint(dir.z) << 2 |
        uint(dir.y) << 1 |
        uint(dir.x);

    vec4 vertex = vec4(a_position.xy, 0.0, 1.0);
    if(v_id == u_selected){
        vertex.x += 0.75;
        vertex.xy *= 1.5;
        vertex.x -= 0.75;
    }
    vertex.xy *= 0.1;

    vec3 norm = normalize(cross(dir, u_up));
    mat4 mat = mat4(
        u_up[0], dir[0], norm[0], 0,
        u_up[1], dir[1], norm[1], 0,
        u_up[2], dir[2], norm[2], 0,
        0, 0, 0, 1
    );
    vertex *= mat;
    vertex.xyz += u_pos;
    uint index = uint(u_factor) * 3u;
    index += uint(dir.y);
    index += uint(dir.z) * 2u;
    vertex.xyz += dir * u_handlePositions[index];

    vertex = u_viewProjection * vertex;
    vertex.xy = u_ndcOffset * vec2(vertex.w) + vertex.xy;
    gl_Position = vertex;
}
