import { vec3 } from 'webgl-operate';

export type AxisInfo = {
    name: string;
    direction: vec3;
    extents: { min: number; max: number };
    subdivisions: number;
}

export type GridInfo = {
    enabled: boolean;
    firstAxis: AxisInfo;
    secondAxis: AxisInfo;
    normal: vec3;
    offsets: [number, number];
}

export type ExtendedAxisInfo = {
    name: string;
    direction: vec3;
    extents: { min: number; max: number; center: number };
    extentPositions: { min: vec3; max: vec3; center: vec3 };
    subdivisions: number;
}

export type ExtendedGridInfo = {
    enabled: boolean;
    firstAxis: ExtendedAxisInfo;
    secondAxis: ExtendedAxisInfo;
    normal: vec3;
    offsets: [number, number];
}

export type ExtendedExtents = {
    center: number;
    extentPositions: { min: vec3; max: vec3; center: vec3 };
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

export function calculateExtendedGridInfo(grid: GridInfo): ExtendedGridInfo {
    if(!grid.enabled) {
        return {
            enabled: false,
            firstAxis: undefined,
            secondAxis: undefined,
            normal: undefined,
            offsets: undefined,
        };
    }

    const first = grid.firstAxis;
    const second = grid.secondAxis;

    const firstExtendedExtents = calcExtendedExtents(first);
    const secondExtendedExtents = calcExtendedExtents(second);

    return {
        enabled: true,
        firstAxis: {
            name: first.name,
            direction: first.direction,
            extents: {
                min: first.extents.min,
                max: first.extents.max,
                center: firstExtendedExtents.center
            },
            extentPositions: firstExtendedExtents.extentPositions,
            subdivisions: first.subdivisions
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
            subdivisions: second.subdivisions
        },
        normal: grid.normal,
        offsets: grid.offsets
    };
}
