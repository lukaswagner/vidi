import {
    BinningOptions,
    ClusterInfo,
    FinishedData,
    MessageData,
    StartData,
} from './interface';
import {
    Float32Chunk,
    Float32Column,
    rebuildColumn,
} from '@lukaswagner/csv-parser';

import { FakeColumn } from './fakeColumn';
import { MessageType } from 'shared/types/messageType';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const result = process(message.data as StartData);
        const d: MessageData = {
            type: MessageType.Finished,
            data: result
        };
        postMessage(d);
    }
});

function process(data: StartData): FinishedData {
    const cols = data.columns.map((c) => rebuildColumn(c) as Float32Column);
    while(cols.length < 3) {
        cols.push(FakeColumn.fromActualColumn(cols[0]));
    }
    const options = data.options as BinningOptions;

    const result =  new Array<Float32Chunk>();
    const limits = cols.map((c) => [c.min, c.max]);
    for(let i = 0; i < cols[0].chunkCount; i++) {
        result.push(processChunks(
            cols.map((c) => c.getChunk(i) as Float32Chunk),
            limits,
            options.resolution));
    }
    return {
        clusterIds: result,
        clusterInfo: buildClusterInfo(limits, options.resolution)
    };
}

function processChunks(
    input: Float32Chunk[], limits: number[][], resolution: number[]
): Float32Chunk {
    const rows = input[0].length;
    const result = new Float32Chunk(rows, 0);
    const map = (
        value: number, limits: number[], res: number
    ): number => {
        const t = (value - limits[0]) / (limits[1] - limits[0]);
        return Math.min(Math.floor(t * res), res - 1);
    };
    for(let i = 0; i < rows; i++) {
        const c = [0, 1, 2]
            .map((j) => input[j] ? map(
                input[j].get(i),
                limits[j],
                resolution[j]) : 0
            );
        result.set(i,
            c[0] +
            c[1] * resolution[0] +
            c[2] * resolution[0] * resolution[1]);
    }
    return result;
}

function buildClusterInfo(
    limits: number[][], resolution: number[]
): ClusterInfo[] {
    const perAxis = resolution.map((r, i) => {
        const res = [];
        const step = (limits[i][1] - limits[i][0]) / r;
        for(let j = 0; j < r; j++) {
            res.push({
                center: limits[i][0] + step * (j + 0.5),
                extents: [
                    limits[i][0] + step * j,
                    limits[i][0] + step * (j + 1)
                ]
            });
        }
        return res;
    });
    const result: ClusterInfo[] = [];
    for(let z = 0; z < resolution[2]; z++) {
        for(let y = 0; y < resolution[1]; y++) {
            for(let x = 0; x < resolution[0]; x++) {
                result.push({
                    center: [
                        perAxis[0][x].center,
                        perAxis[1][y].center,
                        perAxis[2][z].center
                    ],
                    extents: [
                        perAxis[0][x].extents,
                        perAxis[1][y].extents,
                        perAxis[2][z].extents
                    ]
                });
            }
        }
    }
    return result;
}
