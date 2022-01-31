float aa(float center, float value, float width) {
    float df = fwidth(value) * width;
    float lower = smoothstep(center - df, center, value);
    float upper = 1.0 - smoothstep(center, center + df, value);
    return lower * upper;
}
