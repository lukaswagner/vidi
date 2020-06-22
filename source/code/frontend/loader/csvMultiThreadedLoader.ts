import {
    Column,
    DataType
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

export class CsvMultiThreadedLoader {
    protected _stream: ReadableStream;
    protected _size: number;
    protected _options: CsvLoadOptions;
    protected _progress: Progress;
    protected _resolve: (value: Column[]) => void;
    protected _times = new Array<number>();

    protected _columnNames: string[];
    protected _columnTypes: DataType[];
    protected _numChunks: number;
    protected _numWorkers: number;
    protected _rawResults: FinishedData[];
    protected _nextResult = 0;
    protected _processedResults: FinishedData[];

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
                console.log(`loaded ${bytes} bytes in ${numChunks} chunks`);
                if(bytes !== this._size) {
                    console.log(`size mismatch, expected ${this._size} bytes`);
                }
                this._progress.steps[1].total = chunks.length;
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
                if(this._columnNames === undefined) {
                    const info = this.readColumnInfo(
                        chunks,
                        this._options.delimiter,
                        this._options.includesHeader);
                    this._columnNames = info.map((c) => c.name);
                    this._columnTypes = info.map((c) => c.type);
                }

                const wChunks = chunks.splice(workerChunks);
                this.startLoadWorker(wChunks, workerId++);
            }

            reader.read().then(readChunk);
        };

        reader.read().then(readChunk);
    }

    protected readColumnInfo(
        chunks: ArrayBuffer[], delimiter: string, includesHeader: boolean
    ): Column[] {
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

        return columns;
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
        console.log(`starting worker ${index} with ${chunks.length} chunks`);

        worker.postMessage(d, { transfer: chunks });
    }

    protected loadDone(data: FinishedData, index: number): void {
        console.log(`received result from worker ${index}`);

        this._rawResults[index] = data;

        if(index === this._numWorkers - 1)
            this._resolve(data.columns);
    }
}
