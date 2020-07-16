import { Column } from 'frontend/data/column';
import { CsvLoadOptions } from 'frontend/loader/csvLoadOptions';

export enum MessageType {
    Start,
    Finished,
    ProgressStepTotal,
    Progress,
}

export type StartData = {
    chunks: ArrayBuffer[],
    options: CsvLoadOptions
}

export type FinishedData = Array<Column>;

export type ProgressStepTotalData = {
    index: number,
    total: number,
};

export type ProgressData = {
    index: number,
    progress: number,
};

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData | ProgressStepTotalData | ProgressData;
}
