import {
    FinishedData,
    MessageData,
    MessageType,
    StartData
} from './interface';
import { buildChunk } from 'shared/column/chunk';
import { fillColumns } from 'shared/csvLoader/fillColumns';
import { parseChunk } from 'shared/csvLoader/parseChunk';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const data = load(message.data as StartData);
        const d: MessageData = {
            type: MessageType.Finished,
            data: data
        };
        const transfer: Array<Transferable> = [];
        data.columns.forEach((c) => transfer.push(...c.transferable));
        postMessage(d, { transfer });
    }
});

function load(data: StartData): FinishedData {
    const remainderInfo = detectRemainders(data.chunks);
    const lines = parse(data.chunks, remainderInfo);
    const columns = data.types.map((t) => buildChunk(t, lines.length));
    fillColumns(lines, data.options.delimiter, columns, () => {});

    return {
        columns,
        startRemainder: remainderInfo.start,
        endRemainder: remainderInfo.end
    };
}

type RemainderInfo = {
    start: Uint8Array, startChunk: number, startChar: number,
    end: Uint8Array, endChunk: number, endChar: number
}

function detectRemainders(chunks: ArrayBuffer[]): RemainderInfo {
    const lf = 0x0A;
    const cr = 0x0D;

    let startChunk: number;
    let startChar: number;
    let endChunk: number;
    let endChar: number;

    let start: Uint8Array;
    let end: Uint8Array;

    let done = false;
    let remainderLength = 0;
    for(let i = 0; i < chunks.length && !done; i++) {
        const chunk = new Uint8Array(chunks[i]);
        for(let j = 0; j < chunk.length && !done; j++) {
            if(chunk[j] === lf) {
                if(j < chunk.length - 1) {
                    startChunk = i;
                    startChar = j + 1;
                } else {
                    startChunk = i + 1;
                    startChar = 0;
                }
                const crFix = chunk[j - 1] === cr ? -1 : 0;
                start = new Uint8Array(remainderLength + j + crFix);
                done = true;
            }
        }
        remainderLength += chunk.length;
    }

    done = false;
    let remainderIndex = 0;
    remainderLength = start.length;
    for(let i = 0; i < chunks.length && !done; i++) {
        const chunk = new Uint8Array(chunks[i]);
        if(chunk.length <= remainderLength - 1 - remainderIndex) {
            start.set(chunk, remainderIndex);
            remainderIndex += chunk.length;
        } else {
            const sub = chunk.subarray(0, remainderLength - remainderIndex);
            start.set(sub, remainderIndex);
            remainderIndex += sub.length;
        }
        if(remainderIndex >= remainderLength) {
            done = true;
        }
    }

    done = false;
    remainderLength = 0;
    for(let i = chunks.length - 1; i >= 0 && !done; i--) {
        const chunk = new Uint8Array(chunks[i]);
        for(let j = chunk.length - 1; j >= 0 && !done; j--) {
            if(chunk[j] === lf) {
                endChunk = i;
                endChar = j;
                end = new Uint8Array(remainderLength + chunk.length - 1 - j);
                done = true;
            }
        }
        remainderLength += chunk.length;
    }

    done = false;
    remainderIndex = end.length - 1;
    remainderLength = end.length;
    for(let i = chunks.length - 1; i >= 0 && !done; i--) {
        if(remainderLength === 0) break;
        const chunk = new Uint8Array(chunks[i]);
        if(chunk.length <= remainderIndex) {
            end.set(
                chunk, remainderIndex - chunk.length + 1);
            remainderIndex -= chunk.length;
        } else {
            const sub = chunk.subarray(chunk.length - remainderIndex - 1);
            end.set(sub, remainderIndex - sub.length + 1);
            remainderIndex -= sub.length;
        }
        if(remainderIndex < 0) {
            done = true;
        }
    }

    return {
        start, startChunk, startChar, end, endChunk, endChar
    };
}

function parse(chunks: ArrayBuffer[], ri: RemainderInfo): string[] {
    const dec = new TextDecoder();
    const lines = new Array<string>();
    let remainder = '';

    if(ri.startChunk === ri.endChunk) {
        const chunk = new Uint8Array(
            chunks[ri.startChunk],
            ri.startChar, ri.endChar - ri.startChar + 1);
        remainder = parseChunk(dec.decode(chunk), lines, remainder);
        return lines;
    }
    let chunk = new Uint8Array(
        chunks[ri.startChunk], ri.startChar);
    remainder = parseChunk(
        dec.decode(chunk, { stream: true }), lines, remainder);
    for(let i = ri.startChunk + 1; i < ri.endChunk; i++) {
        remainder = parseChunk(
            dec.decode(chunks[i], { stream: true }), lines, remainder);
    }
    chunk = new Uint8Array(
        chunks[ri.endChunk], 0, ri.endChar);
    remainder = parseChunk(dec.decode(chunk), lines, remainder);
    // last chunk does not end with newline
    lines.push(remainder);
    return lines;
}
