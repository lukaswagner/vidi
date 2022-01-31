import {
    CSV,
    Column,
    CsvLoaderOptions,
} from '@lukaswagner/csv-parser';

import { ProgressOutput } from '@lukaswagner/web-ui';

type Invalidate = (force: boolean) => void;

type LoadInfo<T> = {
    stream: ReadableStream,
    size?: number,
    options: T,
    progress: ProgressOutput,
}

export function loadFromServer(
    url: string,
    format: string,
    progress: ProgressOutput,
    invalidate: Invalidate
): Promise<Column[]> {
    console.log('loading', url);

    return fetch(url)
        .then((response) => loadCsv({
            stream: response.body,
            options: {
                delimiter: deductSeparator(format) || ',',
                includesHeader: true
            },
            progress
        }, invalidate));
}

export function deductSeparator(format: string): string {
    switch (format.toLowerCase()) {
        case 'csv':
            return ',';
        case 'tsv':
            return '\t';
        default:
            return undefined;
    }
}

export function loadCustom(
    source: string,
    sourceFile: File,
    sourceUrl: string,
    delimiter: string,
    customDelimiter: string,
    includesHeader: boolean,
    progress: ProgressOutput,
    invalidate: Invalidate
): Promise<Column[]> {
    switch (source) {
        case 'File':
            return loadCustomFromFile(
                sourceFile, delimiter, customDelimiter,
                includesHeader, progress, invalidate);
        case 'URL':
            return loadCustomFromUrl(
                sourceUrl, delimiter, customDelimiter,
                includesHeader, progress, invalidate);
        default:
            break;
    }
}

function loadCustomFromFile(
    file: File,
    delimiter: string,
    customDelimiter: string,
    includesHeader: boolean,
    progress: ProgressOutput,
    invalidate: Invalidate
): Promise<Column[]> {
    console.log('loading custom file', file.name);

    return loadCsv({
        stream: file.stream() as unknown as ReadableStream<unknown>,
        size: file.size,
        options: {
            delimiter: delimiter === 'custom' ? customDelimiter : delimiter,
            includesHeader
        },
        progress
    }, invalidate);
}

function loadCustomFromUrl(
    url: string,
    delimiter: string,
    customDelimiter: string,
    includesHeader: boolean,
    progress: ProgressOutput,
    invalidate: Invalidate
): Promise<Column[]> {
    // const user = controls.customDataUrlUserInput.value;
    // const pass = controls.customDataUrlPassInput.value;

    const headers = new Headers();
    // if (user !== '' && pass !== '') {
    //     headers.set(
    //         'Authorization',
    //         'Basic ' + btoa(user + ':' + pass));
    // }

    console.log('loading from url', url);

    return fetch(url, { headers })
        .then((response) => loadCsv({
            stream: response.body,
            options: {
                delimiter,
                includesHeader
            },
            progress
        }, invalidate));
}

async function loadCsv(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info: LoadInfo<Partial<CsvLoaderOptions>>, invalidate: Invalidate
): Promise<Column[]> {
    const loader = new CSV({
        ...info.options,
        dataSources: {
            input: info.stream
        },
        size: info.size
    });
    const columnHeaders = await loader.open('input');
    const [columns, dispatch] = loader.load({
        columns: columnHeaders.map(({ type }) => type),
        generatedColumns: []
    });

    // this interface does not allow rendering of intermediate results,
    // as we have to wait for it to load before returning the columns...
    for await (const data of dispatch()) {
        if(data.type === 'data' && info.size) {
            info.progress.value = data.progress / info.size;
        }
    }

    return columns;
}
