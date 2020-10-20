import { Column } from 'shared/column/column';
import { MessageType } from 'shared/types/messageType';
import { NumberChunk } from 'shared/column/chunk';

export type BinningOptions = {
    resolution: number[]
}

export type KMeansOptions = {
    clusters: number,
    iterations: number
}

export type Options = BinningOptions | KMeansOptions;

export type StartData = {
    columns: Column[],
    options: Options
}

export type ClusterInfo = {
    center: number[],
    size: number[][]
}

export type FinishedData = {
    clusterIds: NumberChunk[],
    clusterInfo: ClusterInfo[]
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
