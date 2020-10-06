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
        subdivisions: number
    ): GridInfo[] {
        const invalid = '__NONE__';
        const valid = columns.map((c) => c !== invalid);

        const directions = [
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(0, 0, 1)
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

        return [0, 1, 2].map(
            (i) => {
                return {
                    enabled: valid[i] && valid[(i + 1) % 3],
                    firstAxis: axes[i],
                    secondAxis: axes[(i + 1) % 3],
                    normal: directions[(i + 2) % 3],
                    offsets: this.getOffsets(axes[(i + 2) % 3])
                };
            }
        );
    }

    protected static getOffsets(axis: AxisInfo): [number, number] {
        if(axis === undefined) {
            return [0, 0];
        }
        return [axis.extents.min, axis.extents.max];
    }
}
