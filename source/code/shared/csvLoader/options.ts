import { ProgressOutput } from '@lukaswagner/web-ui';

export type CsvLoaderOptions = {
    delimiter: string,
    includesHeader: boolean,
}

export type LoadInfo<T> = {
    stream: ReadableStream,
    size?: number,
    options: T,
    progress: ProgressOutput,
}
