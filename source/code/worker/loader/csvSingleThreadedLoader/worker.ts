import {
    ColorColumn,
    Column,
    DataType,
    FloatColumn,
    StringColumn,
} from '../../../frontend/data/column';
import {
    FinishedData,
    MessageData,
    MessageType,
    ProgressData,
    ProgressStepTotalData,
    StartData
} from './interface';
import { Color } from 'webgl-operate';
import { prepareColumns } from '../../../shared/csvLoader/prepareColumns';
import { splitLine } from '../../../shared/csvLoader/splitLine';

self.addEventListener('message', (m: MessageEvent) => {
    const message = m.data as MessageData;

    if(message.type === MessageType.Start) {
        const columns = load(message.data as StartData);
        const d: MessageData = {
            type: MessageType.Finished,
            data: columns as FinishedData
        };
        const transfer: Array<Transferable> = [];
        columns.forEach((c) => transfer.push(...c.transferable));
        postMessage(d, { transfer });
    }
});

function progressStepTotal(index: number, total: number): void {
    const d: MessageData = {
        type: MessageType.ProgressStepTotal,
        data: {
            index,
            total
        } as ProgressStepTotalData
    };
    postMessage(d);
}

function progress(index: number, progress: number): void {
    const d: MessageData = {
        type: MessageType.Progress,
        data: {
            index,
            progress
        } as ProgressData
    };
    postMessage(d);
}

function load(data: StartData): Column[] {
    const lines = parse(data.chunks);

    let lineIndex = 0;
    const columns = prepareColumns(
        data.options.includesHeader ? lines[lineIndex++] : undefined,
        lines[lineIndex],
        data.options.delimiter,
        lines.length - 1);

    progressStepTotal(
        2,
        lines.length - Number(data.options.includesHeader) + columns.length);

    fillColumns(lines, data.options.delimiter, columns);
    calcMinMax(columns);

    return columns;
}

function parse(chunks: ArrayBuffer[]): string[] {
    const decoder = new TextDecoder();
    const lines = new Array<string>();

    const progressThreshold = chunks.length / 10;
    let prog = 0;

    let remainder = '';
    chunks.forEach((c, i) => {
        const str = decoder.decode(c, { stream: i < chunks.length - 1 });
        remainder = parseChunk(str, lines, remainder);
        prog++;
        if(prog >= progressThreshold) {
            progress(1, prog);
            prog = 0;
        }
    });
    if(prog > 0) {
        progress(1, prog);
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

function fillColumns(
    lines: string[], delimiter: string, columns: Column[]
): void {
    const progressThreshold = lines.length / 10;
    let prog = 0;
    for (let i = 0; i < lines.length - 1; i++) {
        storeLine(lines[i + 1], i, delimiter, columns);
        prog++;
        if(prog >= progressThreshold) {
            progress(2, prog);
            prog = 0;
        }
    }
    if(prog > 0) {
        progress(2, prog);
    }
}

function storeLine(
    line: string, index: number, delimiter: string, columns: Column[]
): void {
    const cells = splitLine(line, delimiter);
    cells.forEach((cell, ci) => {
        const column = columns[ci];
        switch (column.type) {
            case DataType.Float:
                (column as FloatColumn).set(index, Number(cell));
                break;
            case DataType.Color:
                (column as ColorColumn).set(index, Color.hex2rgba(cell));
                break;
            case DataType.String:
                (column as StringColumn).set(index, cell);
                break;
        }
    });
}

function calcMinMax(columns: Column[]): void {
    const progressThreshold = columns.length / 2;
    let prog = 0;
    columns.forEach((c) => {
        if (c.type === DataType.Float) {
            (c as FloatColumn).calcMinMax();
        }
        prog++;
        if(prog >= progressThreshold) {
            progress(2, prog);
            prog = 0;
        }
    });
    if(prog > 0) {
        progress(2, prog);
    }
}
