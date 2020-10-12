import { Progress } from 'frontend/ui/progress';

export type CsvLoaderOptions = {
    delimiter: string,
    includesHeader: boolean,
}

export type LoadInfo<T> = {
    stream: ReadableStream,
    size?: number,
    options: T,
    progress: Progress,
}
