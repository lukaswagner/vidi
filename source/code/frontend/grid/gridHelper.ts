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
        columns: string[],
        extents: Extents[],
        subdivisions: number,
        force2D: boolean
    ): GridInfo[] {
        const invalid = '__NONE__';
        const valid = columns.map((c) => c !== invalid);

        const directions = [
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, 1, 0),
        ];
        const axes = valid.map((v, i) => {
            if(!v) {
                return undefined;
            }
            return {
                name: columns[i],
                direction: directions[i],
                extents: extents[i],
                subdivisions: subdivisions
            };
        });

        const result: GridInfo[] = [];

        if(valid[0] && valid[1]) {
            result.push({
                firstAxis: axes[0],
                secondAxis: axes[1],
                normal: vec3.fromValues(0, 1, 0),
                offsets: this.getOffsets(axes[2])
            });
        }

        if(valid[0] && valid[2] && !force2D) {
            result.push({
                firstAxis: axes[0],
                secondAxis: axes[2],
                normal: vec3.fromValues(0, 0, 1),
                offsets: this.getOffsets(axes[1])
            });
        }

        if(valid[1] && valid[2] && !force2D) {
            result.push({
                firstAxis: axes[1],
                secondAxis: axes[2],
                normal: vec3.fromValues(-1, 0, 0),
                offsets: this.getOffsets(axes[0])
            });
        }

        return result;
    }

    protected static getOffsets(axis: AxisInfo): [number, number] {
        if(axis === undefined) {
            return [0, 0];
        }
        return [axis.extents.min, axis.extents.max];
    }
}
