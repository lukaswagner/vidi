import {
    FinishedData,
    MessageData,
    MessageType,
    ProgressData,
    ProgressStepTotalData,
    StartData
} from './interface';
import { Column } from 'frontend/data/column';
import { calcMinMax } from 'shared/csvLoader/calcMinMax';
import { fillColumns } from 'shared/csvLoader/fillColumns';
import { parseChunk } from 'shared/csvLoader/parseChunk';
import { prepareColumns } from 'shared/csvLoader/prepareColumns';

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

    fillColumns(lines, data.options.delimiter, columns, progress);
    calcMinMax(columns, progress);

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
