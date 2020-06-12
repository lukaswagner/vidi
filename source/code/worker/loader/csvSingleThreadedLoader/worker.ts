import { MessageData, MessageType, StartData, FinishedData } from './interface';
import { Column, inferType, columnFromType } from '../../../frontend/data/column';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const columns = load(message.data as StartData);
        const d: MessageData = {
            type: MessageType.Finished,
            data: columns
        };
        const transfer: Array<Transferable> = [];
        columns.forEach((c) => transfer.push(...c.transferable));
        postMessage(d, { transfer });
    }
});

function load(data: StartData) : Column[] {
    const lines = parse(data.data);
    const columns = prepareColumns(
        lines[0], lines[1], data.options.delimiter, lines.length - 1);
}

function parse(chunks: ArrayBuffer[]): string[] {
    const decoder = new TextDecoder();
    const lines = new Array<string>();

    const progressThreshold = chunks.length / 10;
    let progress = 0;

    let remainder = '';
    chunks.forEach((c, i) => {
        const str = decoder.decode(c, { stream: i < chunks.length - 1 });
        remainder = parseChunk(str, lines, remainder);
        progress++;
        if(progress >= progressThreshold) {
            progress(1, progress);
            progress = 0;
        }
    });
    if(progress > 0) {
        progress(1, progress);
    }

    return lines;
}

function parseChunk(chunk: string, lines: string[], rem: string): string {
    let start = 0;
    let newLine: number; 

    while ((newLine = chunk.indexOf('\n', start)) !== -1) {
        const hasReturn = chunk.charAt(newLine - 1) === '\r';
        const str = chunk.substring(start, newLine - (hasReturn ? 1 : 0));
        if(start === 0) {
            lines.push(rem + str);
        } else {
            lines.push(str);
        }
        start = newLine + 1;
    }

    return chunk.substring(start);
}

function prepareColumns(
    header: string, firstLine: string, delimiter: string, length: number
): Column[] {
    const h = splitLine(header, delimiter);
    const f = splitLine(firstLine, delimiter);

    return h.map((c, i) => {
        const data = f[i];
        const type = inferType(data);
        return columnFromType(header, type, length);
    });
}

function splitLine(line: string, delimiter: string): Array<string> {
    const cells = new Array<string>();

    let start = 0;
    let quote = false;
    let quoteActive = false;

    const push = (end: number): void => {
        cells.push(line.substring(
            quote ? start + 1 : start,
            quote ? end - 1 : end));
    };

    for (let i = 0; i < line.length; i++) {
        const char = line.charAt(i);
        if (char === '"') {
            quoteActive = !quoteActive;
            quote = true;
            continue;
        }
        if (quoteActive) {
            continue;
        }
        const { end, skip } = cellEnd(line, i, delimiter);
        if (end) {
            push(i);
            start = i + skip;
            quote = false;
        }
    }
    push(undefined);

    return cells;
}

function cellEnd(line: string, index: number, delimiter: string): {
    end: boolean, skip: number
} {
    const char = line.charAt(index);
    switch (char) {
        case delimiter:
        case '\n':
            return { end: true, skip: 1 };
        case '\r':
            if (line.charAt(index + 1) === '\n') {
                return { end: true, skip: 2 };
            }
        // eslint-disable-next-line no-fallthrough
        default:
            return { end: false, skip: 0 };
    }
}
