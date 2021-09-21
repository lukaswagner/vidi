uniform float u_mfAlpha;

void mfAlpha(float origAlpha, float alphaFac, float edge) {
    if(origAlpha * alphaFac < edge) discard;
}

void mfAlpha(float origAlpha, float alphaFac) {
    mfAlpha(origAlpha, alphaFac, 0.5);
}

void mfAlpha(float origAlpha) {
    mfAlpha(origAlpha, u_mfAlpha);
}
