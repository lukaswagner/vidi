import { BinningOptions, MessageData, StartData } from 'interface';
import { ColorChunk, NumberChunk } from 'shared/column/chunk';
import { NumberColumn, rebuildColumn } from 'shared/column/column';
import { MessageType } from 'shared/types/messageType';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const result = process(message.data as StartData);
        const d: MessageData = {
            type: MessageType.Finished,
            data: { colors: result }
        };
        postMessage(d);
    }
});

function process(data: StartData): ColorChunk[] {
    const cols = data.columns.map((c) => rebuildColumn(c) as NumberColumn);
    const options = data.options as BinningOptions;

    const result =  new Array<ColorChunk>();
    const limits = cols.map((c) => [c.min, c.max]);
    for(let i = 0; i < cols[0].chunkCount; i++) {
        result.push(processChunks(
            cols.map((c) => c.getChunk(i) as NumberChunk),
            limits,
            options.resolution));
    }
    return result;
}

function processChunks(
    input: NumberChunk[], limits: number[][], resolution: number[]
): ColorChunk {
    const rows = input[0].length;
    const result = new ColorChunk(rows);
    const map = (
        value: number, limits: number[], res: number
    ): number => {
        const t = (value - limits[0]) / (limits[1] - limits[0]);
        const bin = Math.min(Math.floor(t * res), res - 1);
        return bin / (res - 1);
    };
    for(let i = 0; i < rows; i++) {
        const c = [0, 1, 2]
            .map((j) => input[j] ? map(
                input[j].get(i),
                limits[j],
                resolution[j]) : 0
            );
        result.set(i, [c[0], c[1], c[2], 1]);
    }
    return result;
}
