import {
    Column,
    DataType,
    FloatColumn,
    columnFromType,
    rebuildColumn
} from '../data/column';
import {
    CsvLoadOptions,
    LoadInfo
} from './csvLoadOptions';
import {
    FinishedData,
    MessageData,
    MessageType,
    StartData,
} from '../../worker/loader/csvMultiThreadedLoader/interface';
import LoadWorker from
    'worker-loader!../../worker/loader/csvMultiThreadedLoader/worker';
import { Progress } from '../ui/progress';
import { ProgressStep } from '../ui/progressStep';
import { prepareColumns } from '../../shared/csvLoader/prepareColumns';
import { storeLine } from '../../shared/csvLoader/storeLine';

export class CsvMultiThreadedLoader {
    protected _stream: ReadableStream;
    protected _size: number;
    protected _options: CsvLoadOptions;
    protected _progress: Progress;
    protected _resolve: (value: Column[]) => void;
    protected _times = new Array<number>();

    protected _numChunks: number;
    protected _numWorkers: number;

    protected _columnNames: string[];
    protected _columnTypes: DataType[];

    protected _rawResults = new Array<FinishedData>();
    protected _nextResult = 0;
    protected _remainder: ArrayBuffer;
    protected _decoder = new TextDecoder();

    protected _minMax: { ci: number, min: number, max: number }[];
    protected _rowCount = 0;
    protected _processedResults: Column[][] = [];
    protected _processedRemainders: Column[][] = [];

    public constructor(info: LoadInfo<CsvLoadOptions>) {
        this._stream = info.stream;
        this._size = info.size;
        this._options = info.options;
        this._progress = info.progress;
    }

    public load(): Promise<Column[]> {
        this.prepareProgress();
        this.read();

        return new Promise<Column[]>((resolve) => {
            this._resolve = resolve;
        });
    }

    protected prepareProgress(): void {
        // don't show progress bar for small files - would just flash shortly
        if(this._size > 5e6) {
            this._progress.visible = true;
        }
    
        this._progress.steps = [
            new ProgressStep('Loading file', this._size, 5),
            new ProgressStep('Parsing data', 100, 70),
            new ProgressStep('Combining chunks', 100, 25),
        ];
        this._progress.applyValue();
    }
    
    protected prepareWorker(index: number): LoadWorker {
        const worker = new LoadWorker();
        worker.onmessage = (m: MessageEvent) => {
            const message = m.data as MessageData;
            switch (message.type) {
                case MessageType.Finished:
                    this.loadDone(message.data as FinishedData, index);
                    worker.terminate();
                    break;
                default:
                    break;
            }
        };
        return worker;
    }

    protected read(): void {
        const reader = this._stream.getReader();
        const chunks = new Array<ArrayBuffer>();
        let bytes = 0;
        let numChunks = 0;

        const workerChunks = 100;
        let workerId = 0;

        // it seems this has to be done on the main thread - if used in a worker
        // in firefox, the loading progress freezes on bigger files
        this._times.push(Date.now());
        const readChunk = (
            result: ReadableStreamReadResult<Uint8Array>
        ): void => {
            if (result.done) {
                // console.log(`loaded ${bytes} bytes in ${numChunks} chunks`);
                if(bytes !== this._size) {
                    console.log(`size mismatch, expected ${this._size} bytes`);
                }
                this._progress.steps[1].total = chunks.length;
                if(this._columnTypes === undefined) {
                    this.prepareColumnInfo(
                        chunks, this._options.delimiter,
                        this._options.includesHeader);
                }
                this.startLoadWorker(chunks, workerId++);
                this._numWorkers = workerId;
                this._numChunks = numChunks;
                return;
            }

            bytes += result.value.length;
            this._progress.steps[0].progress = bytes;
            this._progress.applyValue();

            chunks.push(result.value.buffer);
            numChunks++;

            if(chunks.length >= workerChunks) {
                if(this._columnTypes === undefined) {
                    this.prepareColumnInfo(
                        chunks, this._options.delimiter,
                        this._options.includesHeader);
                }
                const wChunks = chunks.splice(0, workerChunks);
                this.startLoadWorker(wChunks, workerId++);
            }

            reader.read().then(readChunk);
        };

        reader.read().then(readChunk);
    }

    protected prepareColumnInfo(
        chunks: ArrayBuffer[], delimiter: string, includesHeader: boolean
    ): void {
        const lf = 0x0A;
        const cr = 0x0D;

        let firstLines: Uint8Array;
        let lfCount = includesHeader ? 2 : 1;
        let length = 0;

        for(let i = 0; i < chunks.length && lfCount > 0; i++) {
            const chunk = new Uint8Array(chunks[i]);
            for(let j = 0; j < chunk.length && lfCount > 0; j++) {
                if(chunk[j] === lf) {
                    const crFix = chunk[j - 1] === cr ? -1 : 0;
                    lfCount--;
                    if(lfCount === 0) {
                        firstLines =
                            new Uint8Array(length + j + crFix);
                    }
                }
            }
            length += chunk.length;
        }

        let done = false;
        let index = 0;
        length = firstLines.length;
        for(let i = 0; i < chunks.length && !done; i++) {
            const chunk = new Uint8Array(chunks[i]);
            if(chunk.length <= length - 1 - index) {
                firstLines.set(chunk, index);
                index += chunk.length;
            } else {
                const sub = chunk.subarray(0, length - index);
                firstLines.set(sub, index);
                index += sub.length;
            }
            if(index >= length) {
                done = true;
            }
        }

        const decoder = new TextDecoder();
        const lines = decoder.decode(firstLines).split('\n');

        let lineIndex = 0;
        const columns = prepareColumns(
            includesHeader ? lines[lineIndex++] : undefined,
            lines[lineIndex],
            delimiter,
            lines.length - 1);

        this._columnNames = columns.map((c) => c.name);
        this._columnTypes = columns.map((c) => c.type);
        this._minMax = columns
            .map((c, ci) => {
                return { ci, type: c.type };
            })
            .filter((c) => c.type === DataType.Float)
            .map((c) => {
                return {
                    ci: c.ci,
                    min: Number.MAX_VALUE,
                    max: Number.MIN_VALUE
                };
            });
    }

    protected startLoadWorker(chunks: Array<ArrayBuffer>, index: number): void {
        const d: MessageData = {
            type: MessageType.Start,
            data: {
                chunks,
                size: this._size,
                types: this._columnTypes,
                options: {
                    delimiter: this._options.delimiter,
                    includesHeader: this._options.includesHeader
                }
            } as StartData
        };

        const worker = this.prepareWorker(index);

        worker.postMessage(d, /*{ transfer: chunks }*/);
    }

    protected loadDone(data: FinishedData, index: number): void {
        this._rawResults[index] = data;

        if(index === this._nextResult) {
            this.handleResults(data);
        }
    }

    protected handleResults(result: FinishedData): void {
        const fixed = result.columns.map(rebuildColumn);
        if(this._nextResult !== 0) {
            this.storeRemainder(
                this._decoder.decode(this._remainder, { stream: true }) +
                this._decoder.decode(result.startRemainder));
        }

        this._rowCount += fixed[0].length;

        this._processedResults.push(fixed);
        this._remainder = result.endRemainder;

        delete this._rawResults[this._nextResult];
        this._nextResult++;

        if(this._numWorkers !== undefined &&
            this._nextResult === this._numWorkers &&
            this._remainder.byteLength !== 0 // catch files ending with lf
        ) {
            this.storeRemainder(
                this._decoder.decode(this._remainder));
        }

        if(this._nextResult >= this._numWorkers) {
            this.combine();
            return;
        }

        const next = this._rawResults[this._nextResult];
        if(next !== undefined) {
            setTimeout(this.handleResults.bind(this, next));
        }
    }

    protected storeRemainder(line: string): void {
        const rem = this._columnTypes.map((t) => {
            return columnFromType('', t, 1);
        });

        storeLine(line, 0, this._options.delimiter, rem);

        this._processedRemainders.push(rem);
        this._rowCount++;
    }

    protected combine(): void {
        const result = this._columnTypes.map((t, i) => {
            return columnFromType(this._columnNames[i], t, this._rowCount);
        });
        let resultOffset = 0;

        for(let i = 0; i < this._numWorkers; i++) {
            const res = this._processedResults[i];
            const rem = this._processedRemainders[i];

            if(rem !== undefined) {
                this._minMax.forEach((c) => {
                    const resData = res[c.ci] as FloatColumn;
                    const remData = (rem[c.ci] as FloatColumn).get(0);
                    c.min = Math.min(c.min, resData.min, remData);
                    c.max = Math.max(c.max, resData.max, remData);
                });

                const resLength = res[0].length;
                result.forEach((c, i) => {
                    // @ts-ignore
                    c.copy(res[i], resultOffset);
                    // @ts-ignore
                    c.copy(rem[i], resultOffset + resLength);
                });

                resultOffset += resLength + 1;
            } else  {
                this._minMax.forEach((c) => {
                    const resData = res[c.ci] as FloatColumn;
                    c.min = Math.min(c.min, resData.min);
                    c.max = Math.max(c.max, resData.max);
                });

                result.forEach((c, i) => {
                    // @ts-ignore
                    c.copy(res[i], resultOffset);
                });

                resultOffset += res[0].length;
            }
        }

        this._minMax.forEach((c) => {
            result[c.ci].min = c.min;
            result[c.ci].max = c.max;
        });

        this._resolve(result);
    }
}
