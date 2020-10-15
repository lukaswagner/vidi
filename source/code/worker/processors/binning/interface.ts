import { ColorChunk } from 'shared/column/chunk';
import { Column } from 'shared/column/column';
import { MessageType } from 'shared/types/messageType';

export type Options = {
    resolution: number[]
}

export type StartData = {
    columns: Column[],
    options: Options
}

export type FinishedData = {
    colors: ColorChunk[]
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
