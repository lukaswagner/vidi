import { 
    AxisInfo,
    GridInfo,
} from './gridInfo';
import { vec3 } from 'webgl-operate';

interface Extents {
    min: number;
    max: number;
}

export class GridHelper {
    public static buildGrid(
        columns: string[], extents: Extents[], subdivisions: number
    ): GridInfo[] {
        const firstAxis = {
            name: 'xxxxx',
            direction: vec3.fromValues(1, 0, 0),
            extents: { min: -4, max: 1 },
            subdivisions: subdivisions
        };
        const secondAxis = {
            name: 'yyyyy',
            direction: vec3.fromValues(0, 0, 1),
            extents: { min: -3, max: 2 },
            subdivisions: subdivisions
        };
        const thirdAxis = {
            name: 'zzzzz',
            direction: vec3.fromValues(0, 1, 0),
            extents: { min: -1, max: 3 },
            subdivisions: subdivisions
        };

        return [].concat(
            this.buildFirstSecondConst(firstAxis, secondAxis),
            this.buildFirstThirdConst(firstAxis, thirdAxis),
            this.buildSecondThirdConst(secondAxis, thirdAxis)
        );
    }

    // protected static buildXY(
    //     columns: string[], extents: Extents[], subdivisions: number
    // ): GridInfo[] {
    //     const firstAxis = {
    //         name: columns[0],
    //         direction: vec3.fromValues(1, 0, 0),
    //         extents: extents[0],
    //         subdivisions: subdivisions
    //     };
    //     const secondAxis = {
    //         name: columns[1],
    //         direction: vec3.fromValues(0, 0, 1),
    //         extents: extents[1],
    //         subdivisions: subdivisions
    //     };
    //     return [
    //         {
    //             firstAxis,
    //             secondAxis,
    //             normal: vec3.fromValues(0, 1, 0),
    //             position: 0
    //         },
    //         {
    //             firstAxis,
    //             secondAxis,
    //             normal: vec3.fromValues(0, -1, 0),
    //             position: 0
    //         }
    //     ];
    // }

    // protected static buildXZ(
    //     columns: string[], extents: Extents[], subdivisions: number
    // ): GridInfo[] {
    //     const firstAxis = {
    //         name: columns[0],
    //         direction: vec3.fromValues(1, 0, 0),
    //         extents: extents[0],
    //         subdivisions: subdivisions
    //     };
    //     const secondAxis = {
    //         name: columns[2],
    //         direction: vec3.fromValues(0, 0, 1),
    //         extents: extents[2],
    //         subdivisions: subdivisions
    //     };
    //     return [
    //         {
    //             firstAxis,
    //             secondAxis,
    //             normal: vec3.fromValues(0, 0, 1),
    //             position: 0
    //         },
    //         {
    //             firstAxis,
    //             secondAxis,
    //             normal: vec3.fromValues(0, 0, -1),
    //             position: 0
    //         }
    //     ];
    // }
    
    protected static buildFirstSecondConst(
        firstAxis: AxisInfo, secondAxis: AxisInfo
    ): GridInfo[] {
        const normal = vec3.fromValues(0, 1, 0);
        return [
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: false
            },
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: true
            }
        ];
    }

    protected static buildFirstThirdConst(
        firstAxis: AxisInfo, secondAxis: AxisInfo
    ): GridInfo[] {
        const normal = vec3.fromValues(0, 0, 1);
        return [
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: false
            },
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: true
            }
        ];
    }

    protected static buildSecondThirdConst(
        firstAxis: AxisInfo, secondAxis: AxisInfo
    ): GridInfo[] {
        const normal = vec3.fromValues(1, 0, 0);
        return [
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: false
            },
            {
                firstAxis,
                secondAxis,
                normal,
                position: 0,
                backFace: true
            }
        ];
    }

    protected static offsetExtents(extents: Extents, offset: number): Extents {
        return {
            min: extents.min + offset,
            max: extents.max + offset,
        };
    }
}
