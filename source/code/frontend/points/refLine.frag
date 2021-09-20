precision lowp float;
precision lowp int;

layout(location = 0) out vec4 fragColor;

const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

uniform bool u_useDiscard;
uniform vec3 u_cameraPosition;

in vec2 v_uv;

void main()
{
    float f = v_uv.x ;
    float df = fwidth(f) * 1.0;
    float lower = smoothstep(-df, 0.0, f);
    float upper = 1.0 - smoothstep(0.0, df, f);

    float alpha = lower * upper;
    fragColor = vec4(vec3(0), alpha);
}
