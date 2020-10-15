import { ColorChunk, NumberChunk, rebuildChunk } from 'shared/column/chunk';
import { MessageData, StartData } from 'interface';
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

function process(data: StartData): ColorChunk {
    const chunks = data.chunks.map((c) => rebuildChunk(c) as NumberChunk);
    const rows = chunks[0].length;
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
            .map((j) => chunks[j] ? map(
                chunks[j].get(i),
                data.options.limits[j],
                data.options.resolution[j]) : 0
            );
        result.set(i, [c[0], c[1], c[2], 1]);
    }
    return result;
}
