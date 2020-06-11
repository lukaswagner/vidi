import {
    Column,
    DataType,
    FloatColumn,
    columnFromType,
    inferType,
    rebuildColumn,
} from '../../../frontend/data/column';

import {
    FinishedData,
    MtLoadSubWorkerMessageData,
    MtLoadSubWorkerMessageType,
    ProcessBufferChunksData,
} from '../../mtLoadSubWorker/source/mtLoadSubWorkerMessages';

import { Loader } from './loader';

import SubWorker from
    'worker-loader!../../mtLoadSubWorker/source/mtLoadSubWorker';

export class MultiThreadedLoader extends Loader {
    private static readonly NUM_WORKERS = 8;
    protected _columnNames: Array<string>;
    protected _columnTypes: Array<DataType>;

    public load(): Promise<Array<Column>> {
        console.log('reading header');
        this.readHeader();
        console.log('starting workers');
        const all = this.startWorkers();

        return new Promise((resolve) => {
            all.then((resultChunks) => {
                console.log('workers finished');
                this.combine(resultChunks);
                resolve(this._data);
            });
        });
    }

    protected readHeader(): void {
        const lf = 0x0A;
        const cr = 0x0D;

        const chunk = new Uint8Array(this._chunks[0]);
        let headerEnd = 0;
        while(chunk[headerEnd] !== lf) headerEnd++;
        const headerBuf = chunk.subarray(
            0,
            chunk[headerEnd - 1] === cr ? headerEnd - 1 : headerEnd
        );
        let firstLineEnd = headerEnd + 1;
        while(chunk[firstLineEnd] !== lf) firstLineEnd++;
        const firstLineBuf = chunk.subarray(
            headerEnd + 1,
            chunk[firstLineEnd - 1] === cr ? firstLineEnd - 1 : firstLineEnd
        );

        const decoder = new TextDecoder();
        this._columnNames = this.splitLine(decoder.decode(headerBuf));
        this._columnTypes =
            this.splitLine(decoder.decode(firstLineBuf)).map(inferType);
    }

    protected startWorkers(): Promise<FinishedData[]> {
        const chunksPerWorker =
            Math.ceil(this._chunks.length / MultiThreadedLoader.NUM_WORKERS);

        const promises = new Array<Promise<FinishedData>>();

        while(this._chunks.length > 0) {
            const worker = new SubWorker();
            let done: (v: FinishedData) => void;
            promises.push(new Promise<FinishedData>((resolve) => {
                done = resolve;
            }));
            worker.onmessage = (m: MessageEvent) => {
                const message = m.data as MtLoadSubWorkerMessageData;
                switch(message.type) {
                    case MtLoadSubWorkerMessageType.Finished: {
                        const data = message.data as FinishedData;
                        done(data);
                        worker.terminate();
                        break;
                    }
                    case MtLoadSubWorkerMessageType.ProcessBufferChunks: 
                        break;
                    default:
                        break;
                }
            };

            const data = this._chunks.splice(
                0, Math.min(chunksPerWorker, this._chunks.length));
            const msgData: ProcessBufferChunksData = {
                data,
                types: this._columnTypes,
                size: this._size,
                delimiter: this._delimiter,
                includesHeader: this._includesHeader
            };
            const msg: MtLoadSubWorkerMessageData = {
                data: msgData,
                type: MtLoadSubWorkerMessageType.ProcessBufferChunks,
            };

            console.log('starting worker', promises.length - 1);
            worker.postMessage(msg, data);
        }

        return Promise.all(promises);
    }

    protected combine(resultChunks: FinishedData[]): void {
        let lines = 0;
        resultChunks.forEach((chunk) => {
            chunk.data = chunk.data.map((c) => rebuildColumn(c));
            lines += chunk.data[0].length;
        });

        const remainderLines = new Array<string>();

        const decoder = new TextDecoder();
        let remainder: string;
        resultChunks.forEach((chunk, chunkIndex) => {
            if(chunkIndex > 0) {
                const line = remainder + decoder.decode(chunk.startRemainder);
                remainderLines.push(line);
            }
            remainder = decoder.decode(chunk.endRemainder, { stream: true });
        });
        if(remainder !== undefined && remainder.length > 0) {
            remainderLines.push(remainder);
        }

        lines += remainderLines.length;

        this._data = this._columnNames.map((n, i) => {
            return columnFromType(n, this._columnTypes[i], lines);
        });

        this._data.forEach((c) => {
            if(c.type === DataType.Float) {
                c.min = Number.POSITIVE_INFINITY;
                c.max = Number.NEGATIVE_INFINITY;
            }
        });

        let lineIndex = 0;
        resultChunks.forEach((chunk, chunkIndex) => {
            this._data.forEach((c, ci) => {
                switch (c.type) {
                    case DataType.Float:
                        (c as FloatColumn)
                            .copy(chunk.data[ci] as FloatColumn, lineIndex);
                        break;
                    case DataType.Color:
                        (c as FloatColumn)
                            .copy(chunk.data[ci] as FloatColumn, lineIndex);
                        break;
                    case DataType.String:
                        (c as FloatColumn)
                            .copy(chunk.data[ci] as FloatColumn, lineIndex);
                        break;
                    default:
                        break;
                }
            });
            lineIndex += chunk.data[0].length;
            if(remainderLines.length > chunkIndex &&
                remainderLines[chunkIndex].length !== 0
            ) {
                this.storeLine(remainderLines[chunkIndex], lineIndex++);
            }
            this._data.forEach((c, ci) => {
                if(c.type === DataType.Float) {
                    const df = c as FloatColumn;
                    const cf = chunk.data[ci] as FloatColumn;
                    c.min = Math.min(df.min, cf.min, df.get(lineIndex - 1));
                    c.max = Math.max(df.max, cf.max, df.get(lineIndex - 1));
                }
            });
        });
    }
}
