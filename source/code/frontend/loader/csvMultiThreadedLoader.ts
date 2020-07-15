import {
    ColorColumn,
    Column,
    DataType,
    FloatColumn,
    StringColumn,
    columnFromType,
    rebuildColumn
} from 'frontend/data/column';
import {
    CsvLoadOptions,
    LoadInfo
} from './csvLoadOptions';
import {
    FinishedData,
    MessageData,
    MessageType,
    StartData,
} from 'worker/loader/csvMultiThreadedLoader/interface';
import LoadWorker from
    'worker-loader?inline=true!loader/csvMultiThreadedLoader/worker';
import { PerfMon } from 'shared/performance/perfMon';
import { Progress } from 'frontend/ui/progress';
import { ProgressStep } from 'frontend/ui/progressStep';
import { prepareColumns } from 'shared/csvLoader/prepareColumns';
import { storeLine } from 'shared/csvLoader/storeLine';

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

    protected _perf = new PerfMon();

    public constructor(info: LoadInfo<CsvLoadOptions>) {
        this._stream = info.stream;
        this._size = info.size;
        this._options = info.options;
        this._progress = info.progress;
    }

    public load(): Promise<Column[]> {
        this._perf.sample(-1, 'start');
        this.prepareProgress();
        this.read();

        return new Promise<Column[]>((resolve) => {
            this._resolve = resolve;
        });
    }

    protected prepareProgress(): void {
        // don't show progress bar for small files - would just flash shortly
        if(this._size === undefined || this._size > 5e6) {
            this._progress.visible = true;
        }
    
        this._progress.steps = [
            new ProgressStep('Loading file',
                this._size || 1, this._size === undefined ? 0 : 5),
            new ProgressStep('Parsing data', 100, 90),
            new ProgressStep('Combining chunks', 100, 5),
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

        const targetNumWorkers = 25;
        let workerChunks: number;

        let workerId = 0;

        // it seems this has to be done on the main thread - if used in a worker
        // in firefox, the loading progress freezes on bigger files
        this._times.push(Date.now());
        const readChunk = (
            result: ReadableStreamReadResult<Uint8Array>
        ): void => {
            if (result.done) {
                console.log(`loaded ${bytes} bytes in ${numChunks} chunks (avg: ${bytes/numChunks} bytes/chunk)`);
                if(this._size !== undefined && bytes !== this._size) {
                    console.log(`size mismatch, expected ${this._size} bytes`);
                }
                this._progress.steps[1].total = chunks.length;
                if(this._columnTypes === undefined) {
                    this.prepareColumnInfo(
                        chunks, this._options.delimiter,
                        this._options.includesHeader);
                }
                if(chunks.length > 0) {
                    this.startLoadWorker(chunks, workerId++);
                }
                this._numWorkers = workerId;
                this._progress.steps[1].total = this._numWorkers;
                this._progress.steps[2].total = this._numWorkers;
                this._progress.applyValue();
                this._numChunks = numChunks;
                this._perf.sample(-1, 'load done');
                return;
            }

            if(workerChunks === undefined) {
                if(this._size !== undefined) {
                    const bytesPerChunk = result.value.length;
                    const estimatedChunks = this._size / bytesPerChunk;
                    workerChunks = Math.ceil(
                        estimatedChunks / targetNumWorkers);
                } else {
                    workerChunks = 100;
                }
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

        this._perf.sample(-1, 'load start');
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
        const lines = decoder
            .decode(firstLines)
            .split('\n')
            .map((l) => l.replace('\r', ''));

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
                types: this._columnTypes,
                options: {
                    delimiter: this._options.delimiter,
                    includesHeader: this._options.includesHeader
                }
            } as StartData
        };

        const worker = this.prepareWorker(index);

        this._perf.sample(index, `start worker ${index}`);
        worker.postMessage(d, { transfer: chunks });
    }

    protected loadDone(data: FinishedData, index: number): void {
        this._perf.sample(index, `worker ${index} done`);
        this._rawResults[index] = data;

        if(index === this._nextResult) {
            this.handleResults(data);
        }
    }

    protected handleResults(result: FinishedData): void {
        this._progress.steps[1].progress++;
        this._progress.applyValue();

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
            setTimeout(this.combine.bind(this));
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
        this._perf.sample(-1, 'combine start');
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
                    switch (c.type) {
                        case DataType.Float:
                            (c as FloatColumn).copy(
                                res[i] as FloatColumn,
                                resultOffset);
                            (c as FloatColumn).copy(
                                rem[i] as FloatColumn,
                                resultOffset + resLength);
                            break;
                        case DataType.Color:
                            (c as ColorColumn).copy(
                                res[i] as ColorColumn,
                                resultOffset * 4);
                            (c as ColorColumn).copy(
                                rem[i] as ColorColumn,
                                (resultOffset + resLength) * 4);
                            break;
                        case DataType.String:
                            (c as StringColumn).copy(
                                res[i] as StringColumn,
                                resultOffset);
                            (c as StringColumn).copy(
                                rem[i] as StringColumn,
                                resultOffset + resLength);
                            break;
                        default:
                            break;
                    }
                });

                resultOffset += resLength + 1;
            } else  {
                this._minMax.forEach((c) => {
                    const resData = res[c.ci] as FloatColumn;
                    c.min = Math.min(c.min, resData.min);
                    c.max = Math.max(c.max, resData.max);
                });

                result.forEach((c, i) => {
                    switch (c.type) {
                        case DataType.Float:
                            (c as FloatColumn).copy(
                                res[i] as FloatColumn,
                                resultOffset);
                            break;
                        case DataType.Color:
                            (c as ColorColumn).copy(
                                res[i] as ColorColumn,
                                resultOffset * 4);
                            break;
                        case DataType.String:
                            (c as StringColumn).copy(
                                res[i] as StringColumn,
                                resultOffset);
                            break;
                        default:
                            break;
                    }
                });

                resultOffset += res[0].length;
            }

            this._progress.steps[2].progress++;
            this._progress.applyValue();
        }

        this._minMax.forEach((c) => {
            result[c.ci].min = c.min;
            result[c.ci].max = c.max;
        });

        this._progress.visible = false;
        this._perf.sample(-1, 'done');
        // this._resolve(this._perf.toColumns());
        this._resolve(result);
    }
}
