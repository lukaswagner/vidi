export function mfAlpha(frameNumber: number): number {
    const strength = 1 / (frameNumber + 1);
    const signScale = -(frameNumber % 2) + 0.5; // 0 -> 0.5, 1 -> -0.5
    return 0.5 + strength * signScale;
}
