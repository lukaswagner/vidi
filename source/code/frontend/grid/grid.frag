precision lowp float;
precision lowp int;

#if __VERSION__ != 100
    #define gl_FragColor fragColor
    layout(location = 0) out vec4 fragColor;
#endif

uniform vec3 u_color;

void main()
{
    gl_FragColor = vec4(u_color, 1.0);
}
