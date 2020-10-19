import { Column } from 'shared/column/column';
import { MessageType } from 'shared/types/messageType';
import { NumberChunk } from 'shared/column/chunk';

export type Options = {
    clusters: number,
    iterations: number
}

export type StartData = {
    columns: Column[],
    options: Options
}

export type FinishedData = {
    clusterIds: NumberChunk[],
    clusterInfo: {
        center: number[],
        size: number[][]
    }[]
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
