import { Column, DataType } from '../../../frontend/data/column';

export enum MtLoadSubWorkerMessageType {
    ProcessBufferChunks,
    Finished
}

export type ProcessBufferChunksData = {
    data: ArrayBuffer[],
    types: DataType[],
    size: number,
    delimiter: string,
    includesHeader: boolean,
}

export type FinishedData = {
    data: Array<Column>,
    startRemainder: ArrayBuffer,
    endRemainder: ArrayBuffer
}

export type MtLoadSubWorkerMessageData = {
    type: MtLoadSubWorkerMessageType,
    data: ProcessBufferChunksData | FinishedData;
}
