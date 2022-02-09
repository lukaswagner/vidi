import { vec3, vec4 } from 'webgl-operate';
import { Interaction } from 'frontend/globals';

export function intersectLinePlane(
    pointOnLine: vec3, lineDir: vec3, pointOnPlane: vec3, planeNormal: vec3
): vec3 {
    const dividend = vec3.dot(
        vec3.sub(vec3.create(), pointOnPlane, pointOnLine),
        planeNormal);
    const divisor = vec3.dot(lineDir, planeNormal);
    const parallel = divisor === 0;
    if (parallel) {
        const contained = dividend === 0;
        if(contained) return vec3.clone(pointOnLine);
        else return undefined;
    }
    const d = dividend / divisor;
    return vec3.scaleAndAdd(vec3.create(), pointOnLine, lineDir, d);
}

export function clipToWorld(pos: vec3): vec3 {
    const p4 = vec4.fromValues(pos[0], pos[1], pos[2], 1);
    vec4.transformMat4(p4, p4, Interaction.camera.viewProjectionInverse);
    vec4.scale(p4, p4, 1 / p4[3]);
    return vec3.fromValues(p4[0], p4[1], p4[2]);
}
