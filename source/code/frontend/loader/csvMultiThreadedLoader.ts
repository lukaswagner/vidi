import {
    BaseChunk,
    buildChunk,
    rebuildChunk,
} from 'shared/column/chunk';
import {
    CsvLoaderOptions,
    LoadInfo,
} from '../../shared/csvLoader/options';
import {
    FinishedData,
    MessageData,
    MessageType,
    StartData,
} from 'loader/csvMultiThreadedLoader/interface';
import { Column } from 'shared/column/column';
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
    protected _options: CsvLoaderOptions;
    protected _progress: Progress;
    protected _invalidate: (force?: boolean) => void;
    protected _times = new Array<number>();

    protected _numChunks: number;
    protected _numWorkers: number;

    protected _columns: Column[];

    protected _workerResults = new Array<FinishedData>();
    protected _nextWorkerResult = 0;
    protected _lastRemainder: ArrayBuffer;
    protected _decoder = new TextDecoder();

    protected _remainders: string[] = [];

    protected _perf = new PerfMon();

    public constructor(info: LoadInfo<CsvLoaderOptions>) {
        this._stream = info.stream;
        this._size = info.size;
        this._options = info.options;
        this._progress = info.progress;
    }

    public load(invalidate: (force: boolean) => void): Promise<Column[]> {
        this._perf.sample(-1, 'start');
        this.prepareProgress();
        this._invalidate = invalidate;

        return new Promise<Column[]>((resolve) => {
            this.read(resolve);
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

    protected read(resolve: (data: Column[]) => void): void {
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
                if(this._columns === undefined) {
                    this.setupColumns(chunks, resolve);
                }
                if(chunks.length > 0) {
                    this.startLoadWorker(chunks, workerId++);
                }
                this._numWorkers = workerId;
                this._progress.steps[1].total = this._numWorkers;
                this._progress.steps[2].total = 1;
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
                if(this._columns === undefined) {
                    this.setupColumns(chunks, resolve);
                }
                const wChunks = chunks.splice(0, workerChunks);
                this.startLoadWorker(wChunks, workerId++);
            }

            reader.read().then(readChunk);
        };

        this._perf.sample(-1, 'load start');
        reader.read().then(readChunk);
    }

    protected setupColumns(
        chunks: ArrayBuffer[], resolve: (data: Column[]) => void
    ): void {
        const lf = 0x0A;
        const cr = 0x0D;

        let firstLines: Uint8Array;
        let lfCount = this._options.includesHeader ? 2 : 1;
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
        this._columns = prepareColumns(
            this._options.includesHeader ? lines[lineIndex++] : undefined,
            lines[lineIndex],
            this._options.delimiter);
        resolve(this._columns);
    }

    protected startLoadWorker(chunks: Array<ArrayBuffer>, index: number): void {
        const d: MessageData = {
            type: MessageType.Start,
            data: {
                chunks,
                types: this._columns.map((c) => c.type),
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
        this._workerResults[index] = data;

        if(index === this._nextWorkerResult) {
            this.handleResults(data);
        }
    }

    protected handleResults(result: FinishedData): void {
        this._progress.steps[1].progress++;
        this._progress.applyValue();

        const fixed = result.columns.map(rebuildChunk);
        if(this._nextWorkerResult !== 0) {
            this._remainders.push(
                this._decoder.decode(this._lastRemainder, { stream: true }) +
                this._decoder.decode(result.startRemainder));
        }

        this._columns.map((c, ci) => c.push(fixed[ci] as BaseChunk<any>));
        this._lastRemainder = result.endRemainder;

        this._invalidate();

        delete this._workerResults[this._nextWorkerResult];
        this._nextWorkerResult++;

        if(this._numWorkers !== undefined &&
            this._nextWorkerResult === this._numWorkers &&
            this._lastRemainder.byteLength !== 0 // catch files ending with lf
        ) {
            this._remainders.push(this._decoder.decode(this._lastRemainder));
        }

        if(this._nextWorkerResult >= this._numWorkers) {
            setTimeout(this.combine.bind(this));
            return;
        }

        const next = this._workerResults[this._nextWorkerResult];
        if(next !== undefined) {
            setTimeout(this.handleResults.bind(this, next));
        }
    }

    protected combine(): void {
        this._perf.sample(-1, 'combine start');

        if(this._remainders.length > 0) {
            const chunks = this._columns.map((c) => {
                return buildChunk(c.type, this._remainders.length);
            });
            this._remainders.forEach((r, ri) => {
                storeLine(r, ri, this._options.delimiter, chunks);
            });

            this._columns.map((c, ci) => c.push(chunks[ci] as BaseChunk<any>));
        }

        this._progress.steps[2].progress = 1;
        this._progress.applyValue();

        this._progress.visible = false;
        const sample = this._perf.sample(-1, 'done');
        console.log(
            `loaded ${this._columns.length} columns with ${this._columns[0].length} rows in ${sample.time} ms`);

        console.groupCollapsed('loader performance data');
        console.log(this._perf.toCsv());
        console.groupEnd();

        this._invalidate();
    }
}
