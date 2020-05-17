import { ProgressStep } from "../ui/progress";
import { Column } from "./column";

export enum LoadWorkerMessageType {
    LoadFromUrl,
    LoadFromFile,
    SetProgressSteps,
    SetProgressStepTotal,
    Progress,
    Finished
}

export type LoadFromUrlData = {
    url: string,
    size: number,
    delimiter: string,
    includesHeader: boolean,
}

export type LoadFromFileData = {
    file: File,
    delimiter: string,
    includesHeader: boolean,
}

export type SetProgressStepsData = Array<ProgressStep>;

export type SetProgressStepTotalData = {
    index: number,
    total: number,
};

export type ProgressData = number;

export type FinishedData = Array<Column>;

export type LoadWorkerMessageData = {
    type: LoadWorkerMessageType,
    data: LoadFromUrlData | LoadFromFileData | SetProgressStepsData | SetProgressStepTotalData | ProgressData | FinishedData;
}
