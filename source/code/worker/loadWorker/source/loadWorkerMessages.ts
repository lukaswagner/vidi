import { Column } from '../../../frontend/data/column';
import { ProgressStep } from '../../../frontend/ui/progressStep';

export enum LoadWorkerMessageType {
    ProcessBufferChunks,
    SetProgressSteps,
    SetProgressStepTotal,
    Progress,
    SetProgress,
    Finished
}

export type ProcessBufferChunksData = {
    data: ArrayBuffer[],
    size: number,
    delimiter: string,
    includesHeader: boolean,
}

export type SetProgressStepsData = Array<ProgressStep>;

export type SetProgressStepTotalData = {
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

export type FinishedData = Array<Column>;

export type LoadWorkerMessageData = {
    type: LoadWorkerMessageType,
    data: ProcessBufferChunksData | SetProgressStepsData |
    SetProgressStepTotalData | ProgressData | SetProgressData | FinishedData;
}
