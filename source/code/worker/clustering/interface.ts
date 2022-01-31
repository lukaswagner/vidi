import {
    Column,
    Float32Chunk,
} from '@lukaswagner/csv-parser';

import { MessageType } from 'shared/types/messageType';

export type BinningOptions = {
    resolution: number[]
}

export type KMeansOptions = {
    clusters: number,
    maxIterations: number,
    minChange: number
}

export type Options = BinningOptions | KMeansOptions;

export type StartData = {
    columns: Column[],
    options: Options
}

export type ClusterInfo = {
    center: number[],
    extents: number[][]
}

export type FinishedData = {
    clusterIds: Float32Chunk[],
    clusterInfo: ClusterInfo[]
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
