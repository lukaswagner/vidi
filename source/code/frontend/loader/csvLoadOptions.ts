import { Progress } from '../ui/progress';

export type CsvLoadOptions = {
    delimiter: string,
    includesHeader: boolean,
}

export type LoadInfo<T> = {
    stream: ReadableStream,
    size?: number,
    options: T,
    progress: Progress,
}
