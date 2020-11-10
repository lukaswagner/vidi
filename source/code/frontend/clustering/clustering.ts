import { 
    ClusterInfo,
    FinishedData,
    MessageData,
    Options
} from 'worker/clustering/interface';

import { Column, NumberColumn } from 'shared/column/column';
import { ColumnUsage, Columns } from '../data/columns';
import { NumberChunk, rebuildChunk } from 'shared/column/chunk';

import BinningWorker from 'worker-loader!worker/clustering/binning';
import LloydWorker from 'worker-loader!worker/clustering/lloyd';

import { MessageType } from 'shared/types/messageType';

type Worker = BinningWorker | LloydWorker;

type WorkerConfig = {
    name: string,
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
    protected _clusterInfoHandler: (n: string, c: ClusterInfo[]) => void;

    public initialize(columns: Columns): void {
        this._columnConfig = columns;

        this._binning = {
            name: 'binning',
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
                new NumberColumn('binning')
            ]
        };

        this._lloyd = {
            name: 'k-means',
            worker: new LloydWorker,
            options: {
                clusters: 10,
                maxIterations: 100,
                minChange: 0.1
            },
            inputs: [
                this._columnConfig.selectedColumn(ColumnUsage.X_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Y_AXIS),
                this._columnConfig.selectedColumn(ColumnUsage.Z_AXIS),
            ],
            outputs: [
                new NumberColumn('k-means')
            ]
        };

        this._workers = [
            //this._binning,
            this._lloyd
        ];
    }

    public getOutputs(): Column[] {
        return this._workers.flatMap((w) => w.outputs);
    }

    public runWorkers(): void {
        this._workers.forEach((w) => this.runWorker(w));
    }

    public set clusterInfoHandler(
        handler: (name: string, clusterInfo: ClusterInfo[]) => void
    ) {
        this._clusterInfoHandler = handler;
    }

    protected async runWorker(worker: WorkerConfig): Promise<void> {
        const inputs = worker.inputs.filter((c) => c !== undefined);
        if(inputs.some((c) => !c)) {
            console.log('No input!');
            return;
        }

        const w = worker.worker;

        const done = (msg: MessageEvent): void => {
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

        d.clusterIds.forEach((c) => {
            const chunk = rebuildChunk(c) as NumberChunk;
            column.push(chunk);
        });

        this._clusterInfoHandler(worker.name, d.clusterInfo);
    }
}
