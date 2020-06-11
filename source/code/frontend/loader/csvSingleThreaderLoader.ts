import {
    CsvLoadOptions,
    LoadInfo
} from './csvLoadOptions';
import {
    FinishedData,
    LoadWorkerMessageData,
    LoadWorkerMessageType,
    ProgressData,
    SetProgressData,
    SetProgressStepTotalData,
    SetProgressStepsData
} from '../../worker/loadWorker/source/loadWorkerMessages';
import { Column } from '../data/column';
import LoadWorker from 'worker-loader!../../worker/loadWorker/source/loadWorker';
import { Progress } from '../ui/progress';
import { ProgressStep } from '../ui/progressStep';

export class CsvSingleThreadedLoader {
    protected _stream: ReadableStream;
    protected _size: number;
    protected _options: CsvLoadOptions;
    protected _progress: Progress;
    protected _resolve: (value: Column[]) => void;
    protected _times = new Array<number>();
    protected _worker: LoadWorker;

    public constructor(info: LoadInfo<CsvLoadOptions>) {
        this._stream = info.stream;
        this._size = info.size;
        this._options = info.options;
        this._progress = info.progress;
    }

    public load(): Promise<Column[]> {
        this.prepareProgress();
        this._worker = this.prepareWorker();
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
            new ProgressStep('Decoding text', 100, 25),
            new ProgressStep('Parsing data', 100, 70),
        ];
        this._progress.applyValue();
    }
    
    protected prepareWorker(): LoadWorker {
        const worker = new LoadWorker();
        worker.onmessage = (m: MessageEvent) => {
            const message = m.data as LoadWorkerMessageData;
            switch (message.type) {
                case LoadWorkerMessageType.SetProgressSteps:
                    this._progress.steps = message.data as SetProgressStepsData;
                    break;
                case LoadWorkerMessageType.SetProgressStepTotal: {
                    const data = message.data as SetProgressStepTotalData;
                    this._progress.steps[data.index].total = data.total;
                    this._progress.applyValue();
                    break;
                }
                case LoadWorkerMessageType.Progress: {
                    const data = message.data as ProgressData;
                    this._progress.steps[data.index].progress += data.progress;
                    this._progress.applyValue();
                    break;
                }
                case LoadWorkerMessageType.SetProgress: {
                    const data = message.data as SetProgressData;
                    this._progress.steps[data.index].progress = data.progress;
                    this._progress.applyValue();
                    break;
                }
                case LoadWorkerMessageType.Finished:
                    this._times.push(Date.now());
                    this.done(message.data as FinishedData);
                    this._progress.visible = false;
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
        const res = new Array<ArrayBuffer>();
        let bytes = 0;
        let chunks = 0;

        // it seems this has to be done on the main thread - if used in a worker
        // in firefox, the loading progress freezes on bigger files
        this._times.push(Date.now());
        const readChunk = (
            result: ReadableStreamReadResult<Uint8Array>
        ): void => {
            if (result.done) {
                console.log(`loaded ${bytes} bytes in ${chunks} chunks`);
                if(bytes !== this._size) {
                    console.log(`size mismatch, expected ${this._size} bytes`);
                }
                this._progress.steps[1].total = chunks;
                this.startWorker(res);
                return;
            }

            bytes += result.value.length;
            this._progress.steps[0].progress = bytes;
            this._progress.applyValue();
            chunks++;

            res.push(result.value.buffer);

            reader.read().then(readChunk);
        };

        reader.read().then(readChunk);
    }

    protected startWorker(data: Array<ArrayBuffer>): void {
        const d: LoadWorkerMessageData = {
            type: LoadWorkerMessageType.ProcessBufferChunks,
            data: {
                data,
                size: this._size,
                delimiter: this._options.delimiter,
                includesHeader: this._options.includesHeader
            }
        };

        this._times.push(Date.now());
        this._worker.postMessage(d, { transfer: data });
    }

    protected done(data: FinishedData): void {
        console.log(`loaded in ${this._times[1] - this._times[0]}ms`);
        console.log(`parsed in ${this._times[2] - this._times[1]}ms`);
        this._resolve(data);
    }
}
