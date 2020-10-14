import { Chunk, ColorChunk, } from 'shared/column/chunk';
import { MessageType } from 'shared/types/messageType';

export type Options = {
    limits: number[][],
    resolution: number[]
}

export type StartData = {
    chunks: Chunk[],
    options: Options
}

export type FinishedData = {
    colors: ColorChunk
}

export type MessageData = {
    type: MessageType,
    data: StartData | FinishedData;
}
