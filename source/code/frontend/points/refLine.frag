precision lowp float;
precision lowp int;

layout(location = 0) out vec4 fragColor;

const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

uniform bool u_useDiscard;
uniform vec3 u_cameraPosition;
uniform float u_mfAlpha;

in vec2 v_uv;

@import ../util/aa;
@import ../util/mfAlpha;

void main()
{
    float alpha = aa(0.5, v_uv.x, 2.0);
    alpha = mfAlpha(alpha, u_mfAlpha, 0.52);

    fragColor = vec4(vec3(0), alpha);
}
