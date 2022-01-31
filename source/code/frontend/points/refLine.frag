precision lowp float;
precision lowp int;

layout(location = 0) out vec4 fragColor;

const vec3 u_invisColor = vec3(248.0/255.0, 249.0/255.0, 250.0/255.0);

uniform bool u_useDiscard;
uniform vec3 u_cameraPosition;

const int ALPHA_TEMPORAL = 3;
uniform int u_alphaMode;

in vec2 v_uv;

@import ../util/aa;
@import ../util/mfAlpha;

const float c_maxAlpha = 0.6;

void main()
{
    float alpha = aa(0.5, v_uv.x, 1.0) * c_maxAlpha;

    if(u_alphaMode == ALPHA_TEMPORAL)
        mfAlpha(alpha, u_mfAlpha, c_maxAlpha * 0.5);

    fragColor = vec4(vec3(0), alpha);
}
