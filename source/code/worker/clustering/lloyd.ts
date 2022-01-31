import {
    FinishedData,
    KMeansOptions,
    MessageData,
    StartData,
} from './interface';
import {
    Float32Chunk,
    Float32Column,
    rebuildChunk,
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

type Entry = {
    chunk: number,
    row: number
}

type Pos = [number, number, number];

function process(data: StartData): FinishedData {
    const cols = data.columns.map((c) => rebuildColumn(c) as Float32Column);
    cols.forEach((col) => col.chunks.forEach(
        (chunk, i, chunks) => chunks[i] = rebuildChunk(chunk) as Float32Chunk));
    while(cols.length < 3) {
        cols.push(FakeColumn.fromActualColumn(cols[0]));
    }
    const options = data.options as KMeansOptions;

    let clusters = init(cols, options.clusters);
    let selections = assign(cols, clusters);

    for(let i = 0; i < options.maxIterations; i++) {
        const old = clusters;
        clusters = update(cols, selections);
        selections = assign(cols, clusters);
        const change = Math.max(...compare(old, clusters));
        if(change < options.minChange) {
            console.log(
                `k-means: early break after ${i} iterations, ` +
                `last change: ${change.toPrecision(3)} < ${options.minChange}`);
            break;
        }
    }

    return {
        clusterIds: selectionsToIds(cols[0], selections),
        clusterInfo: buildClusterInfo(cols, selections)
    };
}

function init(cols: Float32Column[], clusters: number): Pos[] {
    if(clusters > cols[0].length) {
        console.log('too many clusters!');
        return [[0, 0, 0]];
    }
    const selection: Entry[] = [];
    while(selection.length < clusters) {
        const chunk = Math.floor(Math.random() * cols[0].chunkCount);
        const row = Math.floor(Math.random() * cols[0].getChunk(chunk).length);

        if(!selection.some((s) => s.chunk === chunk && s.row === row)) {
            selection.push({chunk, row});
        }
    }
    return selection.map(
        (s) => [0, 1, 2].map(
            (i) => {
                return new Float32Array(cols[i].getChunk(s.chunk).data)[s.row];
            }) as Pos);
}

function assign(
    cols: Float32Column[], clusters: Pos[]
): Entry[][] {
    const selections = clusters.map(() => new Array<Entry>());
    for(let i = 0; i < cols[0].chunkCount; i++) {
        const chunks = cols.map((c) => c.getChunk(i));
        for(let j = 0; j < chunks[0].length; j++) {
            const v = chunks.map((c) => c.get(j));
            let minDist = Number.POSITIVE_INFINITY;
            let index = -1;
            for(let k = 0; k < clusters.length; k++) {
                const c = clusters[k];
                const d = [0, 1, 2].map((i) => Math.abs(c[i] - v[i]));
                const dist = d.reduce(
                    (p, c) => Number.isNaN(c) ? p : p + c * c, 0);
                if(dist < minDist) {
                    minDist = dist;
                    index = k;
                }
            }
            selections[index].push({chunk: i, row: j});
        }
    }
    return selections;
}

function update(cols: Float32Column[], selections: Entry[][]): Pos[] {
    return selections.map(
        (s) => {
            const sum: Pos = [0, 0, 0];
            s.forEach((e) => {
                const pos = toPos(e, cols);
                [0, 1, 2].forEach((i) => sum[i] += pos[i]);
            });
            return sum.map((p) => p / s.length) as Pos;
        });
}

function toPos(entry: Entry, cols: Float32Column[]): Pos {
    return [0, 1, 2].map(
        (i) => {
            return cols[i].getChunk(entry.chunk).get(entry.row);
        }) as Pos;
}

function compare(oldPos: Pos[], newPos: Pos[]): number[] {
    return oldPos.map((o, i) => {
        const n = newPos[i];
        return Math.sqrt([0, 1, 2]
            .map((i) => Math.pow(o[i] - n[i], 2))
            .reduce((p, c) => p + c));
    });
}

function selectionsToIds(
    exampleColumn: Float32Column, selections: Entry[][]
): Float32Chunk[] {
    const result = exampleColumn.getChunks().map(
        (chunk) => new Float32Chunk(chunk.length, 0));
    selections.forEach((cluster, id) => {
        cluster.forEach((entry) => result[entry.chunk].set(entry.row, id));
    });
    return result;
}

function buildClusterInfo(
    cols: Float32Column[], selections: Entry[][]
): { center: number[], extents: number[][] }[] {
    return selections.map((cluster) => cluster.reduce(
        (prev, curr) => {
            const pos = toPos(curr, cols);
            return {
                center: pos.map((p, i) =>
                    prev.center[i] ?
                        p / cluster.length + prev.center[i] :
                        p / cluster.length),
                extents: pos.map((p, i) =>
                    prev.extents[i] ?
                        [
                            Math.min(prev.extents[i][0], p),
                            Math.max(prev.extents[i][1], p)
                        ] :
                        [p, p]
                )
            };
        },
        { center: [] as number[], extents: [] as number[][]}));
}
