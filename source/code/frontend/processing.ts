import * as BinningInterface from 'worker/processors/binning/interface';
import { ColorChunk, rebuildChunk } from 'shared/column/chunk';
import { ColorColumn, Column } from 'shared/column/column';
import { ColumnUsage, Columns } from './data/columns';
import BinningWorker from 'worker-loader!worker/processors/binning/binning';
import { MessageType } from 'shared/types/messageType';

type Worker = BinningWorker;
type Options = BinningInterface.Options;
type MessageData = BinningInterface.MessageData;

type WorkerConfig = {
    worker: Worker,
    options: Options,
    inputs: Column[],
    outputs: Column[]
}

export class Processing {
    protected _columnConfig: Columns;
    protected _binning: WorkerConfig;
    protected _workers: WorkerConfig[];

    public initialize(columns: Columns): void {
        this._columnConfig = columns;

        this._binning = {
            worker: new BinningWorker,
            options: {
                resolution: [3, 3, 3]
            },
            inputs: [
                this._columnConfig.selectedColumn(ColumnUsage.X_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Y_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Z_AXIS),
            ],
            outputs: [
                new ColorColumn('binned')
            ]
        };

        this._workers = [
            this._binning
        ];
    }

    public getOutputs(): Column[] {
        return this._workers.flatMap((w) => w.outputs);
    }

    public runWorkers(): void {
        this._workers.forEach((w) => this.runWorker(w));
    }

    protected async runWorker(worker: WorkerConfig): Promise<void> {
        const inputs = worker.inputs.filter((c) => c !== undefined);
        if(inputs.some((c) => !c)) {
            console.log('No input!');
            return;
        }

        const w = worker.worker;

        const done = (msg: MessageEvent): void => {
            console.log('worker done');
            const msgData = msg.data as MessageData;
            const finData = msgData.data as BinningInterface.FinishedData;
            finData.colors.forEach((c) => {
                const chunk = rebuildChunk(c) as ColorChunk;
                (worker.outputs[0] as ColorColumn).push(chunk);
            });
            w.removeEventListener('message', done);
        };
        w.addEventListener('message', done);

        const data = {
            type: MessageType.Start,
            data: {
                columns: inputs,
                options: worker.options
            }
        } as MessageData;
        w.postMessage(data);
    }
}
