import { Column, DataType } from 'frontend/data/column';
import { CsvLoadOptions } from 'frontend/loader/csvLoadOptions';

export enum MessageType {
    Start,
    Finished,
}

export type StartData = {
    chunks: ArrayBuffer[],
    types: DataType[],
    options: CsvLoadOptions
}

export type FinishedData = {
    columns: Array<Column>,
    startRemainder: ArrayBuffer,
    endRemainder: ArrayBuffer
}
export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
