import { CsvLoadOptions } from '../../../frontend/loader/csvLoadOptions';
import { Column } from '../../../frontend/data/column';

export enum MessageType {
    Start,
    Finished,
    ProgressStepTotal,
    Progress,
    SetProgress,
}

export type StartData = {
    data: ArrayBuffer[],
    size: number,
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

export type SetProgressData = {
    index: number,
    progress: number,
};

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData |
        ProgressStepTotalData | ProgressData | SetProgressData;
}
