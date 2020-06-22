import { FinishedData, MessageData, MessageType, StartData } from './interface';
import { Column, columnFromType, inferType } from '../../../frontend/data/column';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const data = load(message.data as StartData);
        // const d: MessageData = {
        //     type: MessageType.Finished,
        //     data: columns
        // };
        // const transfer: Array<Transferable> = [];
        // columns.forEach((c) => transfer.push(...c.transferable));
        // postMessage(d, { transfer });
    }
});

function load(data: StartData): FinishedData {
    const remainderInfo = detectRemainders(data.chunks);
    // const lines = parse(data.data);
    // const columns = prepareColumns(
    //     lines[0], lines[1], data.options.delimiter, lines.length - 1);
}

function detectRemainders(chunks: ArrayBuffer[]): {
    startChunk: number, startChar: number, endChunk: number, endChar: number
} {
    const lf = 0x0A;
    const cr = 0x0D;

    let startChunk: number;
    let startChar: number;
    let endChunk: number;
    let endChar: number;

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
                startRemainder =
                    new Uint8Array(remainderLength + j + crFix);
                done = true;
            }
        }
        remainderLength += chunk.length;
    }

    done = false;
    let remainderIndex = 0;
    remainderLength = startRemainder.length;
    for(let i = 0; i < chunks.length && !done; i++) {
        const chunk = new Uint8Array(chunks[i]);
        if(chunk.length <= remainderLength - 1 - remainderIndex) {
            startRemainder.set(chunk, remainderIndex);
            remainderIndex += chunk.length;
        } else {
            const sub = chunk.subarray(0, remainderLength - remainderIndex);
            startRemainder.set(sub, remainderIndex);
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
                endRemainder =
                    new Uint8Array(remainderLength + chunk.length - 1 - j);
                done = true;
            }
        }
        remainderLength += chunk.length;
    }

    done = false;
    remainderIndex = endRemainder.length - 1;
    remainderLength = endRemainder.length;
    for(let i = chunks.length - 1; i >= 0 && !done; i--) {
        if(remainderLength === 0) break;
        const chunk = new Uint8Array(chunks[i]);
        if(chunk.length <= remainderIndex) {
            endRemainder.set(
                chunk, remainderIndex - chunk.length + 1);
            remainderIndex -= chunk.length;
        } else {
            const sub = chunk.subarray(chunk.length - remainderIndex - 1);
            endRemainder.set(sub, remainderIndex - sub.length + 1);
            remainderIndex -= sub.length;
        }
        if(remainderIndex < 0) {
            done = true;
        }
    }
}

// function parse(chunks: ArrayBuffer[]): string[] {
//     const decoder = new TextDecoder();
//     const lines = new Array<string>();

//     const progressThreshold = chunks.length / 10;
//     let progress = 0;

//     let remainder = '';
//     chunks.forEach((c, i) => {
//         const str = decoder.decode(c, { stream: i < chunks.length - 1 });
//         remainder = parseChunk(str, lines, remainder);
//         progress++;
//         if(progress >= progressThreshold) {
//             progress(1, progress);
//             progress = 0;
//         }
//     });
//     if(progress > 0) {
//         progress(1, progress);
//     }

//     return lines;
// }

// function parseChunk(chunk: string, lines: string[], rem: string): string {
//     let start = 0;
//     let newLine: number; 

//     while ((newLine = chunk.indexOf('\n', start)) !== -1) {
//         const hasReturn = chunk.charAt(newLine - 1) === '\r';
//         const str = chunk.substring(start, newLine - (hasReturn ? 1 : 0));
//         if(start === 0) {
//             lines.push(rem + str);
//         } else {
//             lines.push(str);
//         }
//         start = newLine + 1;
//     }

//     return chunk.substring(start);
// }

// function prepareColumns(
//     header: string, firstLine: string, delimiter: string, length: number
// ): Column[] {
//     const h = splitLine(header, delimiter);
//     const f = splitLine(firstLine, delimiter);

//     return h.map((c, i) => {
//         const data = f[i];
//         const type = inferType(data);
//         return columnFromType(header, type, length);
//     });
// }

// function splitLine(line: string, delimiter: string): Array<string> {
//     const cells = new Array<string>();

//     let start = 0;
//     let quote = false;
//     let quoteActive = false;

//     const push = (end: number): void => {
//         cells.push(line.substring(
//             quote ? start + 1 : start,
//             quote ? end - 1 : end));
//     };

//     for (let i = 0; i < line.length; i++) {
//         const char = line.charAt(i);
//         if (char === '"') {
//             quoteActive = !quoteActive;
//             quote = true;
//             continue;
//         }
//         if (quoteActive) {
//             continue;
//         }
//         const { end, skip } = cellEnd(line, i, delimiter);
//         if (end) {
//             push(i);
//             start = i + skip;
//             quote = false;
//         }
//     }
//     push(undefined);

//     return cells;
// }

// function cellEnd(line: string, index: number, delimiter: string): {
//     end: boolean, skip: number
// } {
//     const char = line.charAt(index);
//     switch (char) {
//         case delimiter:
//         case '\n':
//             return { end: true, skip: 1 };
//         case '\r':
//             if (line.charAt(index + 1) === '\n') {
//                 return { end: true, skip: 2 };
//             }
//         // eslint-disable-next-line no-fallthrough
//         default:
//             return { end: false, skip: 0 };
//     }
// }
