import { vec3 } from 'webgl-operate';

export type AxisInfo = {
    name: string,
    direction: vec3,
    extents: { min: number, max: number },
    subdivisions: number
}

export type GridInfo = {
    firstAxis: AxisInfo,
    secondAxis: AxisInfo,
    normal: vec3,
    offsets: [number, number]
}

export type ExtendedAxisInfo = {
    name: string,
    direction: vec3,
    extents: { min: number, max: number, center: number },
    extentPositions: { min: vec3, max: vec3, center: vec3 },
    subdivisions: number,
    labelPosition: vec3
}

export type ExtendedGridInfo = {
    firstAxis: ExtendedAxisInfo,
    secondAxis: ExtendedAxisInfo,
    normal: vec3,
    offsets: [number, number]
}

type ExtendedExtents = {
    center: number,
    extentPositions: { min: vec3, max: vec3, center: vec3 }
}

function calcExtendedExtents(self: AxisInfo): ExtendedExtents {
    const min = vec3.scale(
        vec3.create(), self.direction, self.extents.min);
    const max = vec3.scale(
        vec3.create(), self.direction, self.extents.max);
    const centerNum = (self.extents.min + self.extents.max) / 2;
    const center = vec3.scale(
        vec3.create(), self.direction, centerNum);

    return {
        center: centerNum,
        extentPositions: { min, max, center }
    };
}

const labelOffset = 0.1;
function calcLabelPosition(
    other: AxisInfo,
    selfExtents: ExtendedExtents, otherExtents: ExtendedExtents,
    normPos: vec3,
    invertFactor: number
): vec3 {
    const offset = vec3.scale(
        vec3.create(), other.direction, -labelOffset);
    const pos = vec3.add(
        vec3.create(),
        vec3.add(
            vec3.create(),
            selfExtents.extentPositions.center,
            normPos),
        vec3.scale(
            vec3.create(),
            vec3.add(
                vec3.create(),
                offset,
                otherExtents.extentPositions.min
            ),
            invertFactor
        )
    );
    return pos;
}

export function calculateExtendedGridInfo(grid: GridInfo): ExtendedGridInfo {
    const first = grid.firstAxis;
    const second = grid.secondAxis;

    // const normPos = vec3.scale(
    //     vec3.create(), grid.normal, grid.position);

    const firstExtendedExtents = calcExtendedExtents(first);
    const secondExtendedExtents = calcExtendedExtents(second);

    // const firstLabelPosition = calcLabelPosition(
    //     second, firstExtendedExtents, secondExtendedExtents, normPos, -1);
    // const secondLabelPosition = calcLabelPosition(
    //     first, secondExtendedExtents, firstExtendedExtents, normPos, 1);
    const firstLabelPosition = vec3.create();
    const secondLabelPosition = vec3.create();

    return {
        firstAxis: {
            name: first.name,
            direction: first.direction,
            extents: {
                min: first.extents.min,
                max: first.extents.max,
                center: firstExtendedExtents.center
            },
            extentPositions: firstExtendedExtents.extentPositions,
            subdivisions: first.subdivisions,
            labelPosition: firstLabelPosition
        },
        secondAxis: {
            name: second.name,
            direction: second.direction,
            extents: {
                min: second.extents.min,
                max: second.extents.max,
                center: secondExtendedExtents.center
            },
            extentPositions: secondExtendedExtents.extentPositions,
            subdivisions: second.subdivisions,
            labelPosition: secondLabelPosition
        },
        normal: grid.normal,
        offsets: grid.offsets
    };
}
