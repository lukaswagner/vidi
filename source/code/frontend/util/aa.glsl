float aa(float center, float value, float width) {
    float df = fwidth(value);
    float lower = smoothstep(center - width - df, center - width, value);
    float upper = 1.0 - smoothstep(center + width, center + width + df, value);
    return lower * upper;
}
