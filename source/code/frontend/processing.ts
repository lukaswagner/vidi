import * as BinningInterface from 'worker/processors/binning/interface';
import { ColorColumn, Column, NumberColumn } from 'shared/column/column';
import { ColumnUsage, Columns } from './data/columns';
import BinningWorker from
    'worker-loader?inline=fallback!worker/processors/binning/worker';
import { Chunk, ColorChunk, rebuildChunk } from 'shared/column/chunk';
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
                limits: [[]],
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

    public updateColumnConfig(usage: ColumnUsage): void {
        const column = this._columnConfig.selectedColumn(usage);
        
        switch (usage) {
            case ColumnUsage.X_AXIS:
                this._binning.inputs[0] = column;
                this.runWorker(this._binning);
                break;
            case ColumnUsage.Y_AXIS:
                this._binning.inputs[1] = column;
                this.runWorker(this._binning);
                break;
            case ColumnUsage.Z_AXIS:
                this._binning.inputs[2] = column;
                this.runWorker(this._binning);
                break;
            default:
                break;
        }
    }

    public updateData(): void {
        this._workers
            .filter((w) => (w.inputs.some((c) => c?.altered)))
            .forEach((w) => this.runWorker(w));
    }

    protected async runWorker(worker: WorkerConfig): Promise<void> {
        const inputs = worker.inputs.filter((c) => c !== undefined);
        if(inputs.some((c) => !c)) {
            console.log('No input!');
            return;
        }

        const w = worker.worker;
        worker.options.limits = inputs.map((c: NumberColumn) => [c.min, c.max]);

        let chunkIndex = 0;

        const send = (): void => {
            const data = {
                type: MessageType.Start,
                data: {
                    chunks: inputs.map((c) => c.getChunk(chunkIndex) as Chunk),
                    options: worker.options
                }
            };
            console.log(data);
            w.postMessage(data);
            chunkIndex++;
        };

        const step = (msg: MessageEvent): void => {
            console.log('worker step');
            const msgData = msg.data as MessageData;
            const finData = msgData.data as BinningInterface.FinishedData;
            const colors = rebuildChunk(finData.colors) as ColorChunk;
            (worker.outputs[0] as ColorColumn).push(colors);
            
            if(chunkIndex < inputs[0].chunkCount) {
                send();
            } else {
                console.log('worker done');
                w.onmessage === undefined;
            }
        };

        const start = (): void => {
            worker.outputs.forEach((o) => o.reset());
            console.log('worker start');
            w.onmessage = step;
            send();
        };

        if(w.onmessage) {
            console.log('Worker still working! Trying to take over.');
            w.onmessage = start;
        } else {
            start();
        }
    }
}
