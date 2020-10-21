import {  Column, NumberColumn } from 'shared/column/column';
import { ColumnUsage, Columns } from '../data/columns';
import { 
    FinishedData,
    MessageData,
    Options
} from 'worker/clustering/interface';

import BinningWorker from 'worker-loader!worker/clustering/binning';
import LloydWorker from 'worker-loader!worker/clustering/lloyd';

import { MessageType } from 'shared/types/messageType';

type Worker = BinningWorker | LloydWorker;

type WorkerConfig = {
    worker: Worker,
    options: Options,
    inputs: Column[],
    outputs: Column[]
}

export class Clustering {
    protected _columnConfig: Columns;
    protected _binning: WorkerConfig;
    protected _lloyd: WorkerConfig;
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
                new NumberColumn('binned clusters')
            ]
        };

        this._lloyd = {
            worker: new LloydWorker,
            options: {
                clusters: 10,
                iterations: 10
            },
            inputs: [
                this._columnConfig.selectedColumn(ColumnUsage.X_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Y_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Z_AXIS),
            ],
            outputs: [
                new NumberColumn('lloyd k-means clusters')
            ]
        };

        this._workers = [
            this._binning,
            this._lloyd
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
            this.storeResult(worker, msg.data);
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

    protected storeResult(worker: WorkerConfig, data: MessageData): void {
        const d = data.data as FinishedData;
        const column = worker.outputs[0] as NumberColumn;
        column.reset();

        console.log(d.clusterInfo);
        // d.colors.forEach((c) => {
        //     const chunk = rebuildChunk(c) as ColorChunk;
        //     column.push(chunk);
        // });
    }
}
