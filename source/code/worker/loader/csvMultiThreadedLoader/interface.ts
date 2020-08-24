import { Chunk } from 'shared/column/chunk';
import { CsvLoaderOptions } from 'shared/csvLoader/options';
import { DataType } from 'shared/column/dataType';

export enum MessageType {
    Start,
    Finished,
}

export type StartData = {
    chunks: ArrayBuffer[],
    types: DataType[],
    options: CsvLoaderOptions
}

export type FinishedData = {
    columns: Array<Chunk>,
    startRemainder: ArrayBuffer,
    endRemainder: ArrayBuffer
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
