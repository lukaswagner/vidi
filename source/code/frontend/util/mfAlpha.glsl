float mfAlpha(float origAlpha, float alphaFac, float edge) {
    return step(edge, origAlpha * alphaFac);
}

float mfAlpha(float origAlpha, float alphaFac) {
    return mfAlpha(origAlpha, alphaFac, 0.5);
}

float mfAlpha(float origAlpha) {
    return mfAlpha(origAlpha, u_mfAlpha);
}
