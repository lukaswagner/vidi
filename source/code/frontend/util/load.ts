import {
    CsvLoaderOptions,
    LoadInfo
} from 'shared/csvLoader/options';
import { Column } from 'shared/column/column';
import { Controls } from 'frontend/controls';
import { CsvMultiThreadedLoader } from 'frontend/loader/csv';

type Invalidate = (force: boolean) => void;

export function loadFromServer(
    url: string, format: string, controls: Controls, invalidate: Invalidate
): Promise<Column[]> {
    console.log('loading', url);

    return fetch(url)
        .then((response) => loadCsv({
            stream: response.body,
            options: {
                delimiter: deductSeparator(format) || ',',
                includesHeader: true
            },
            progress: controls.dataProgress
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
    controls: Controls, invalidate: Invalidate
): Promise<Column[]> {
    switch (controls.customDataSourceSelect.value) {
        case 'File':
            return loadCustomFromFile(controls, invalidate);
        case 'URL':
            return loadCustomFromUrl(controls, invalidate);
        default:
            break;
    }
}

function loadCustomFromFile(
    controls: Controls, invalidate: Invalidate
): Promise<Column[]> {
    const file = controls.customDataFile.files[0];
    let delimiter = controls.customDataDelimiterSelect.value;
    if (delimiter === 'custom') {
        delimiter = controls.customDataDelimiterInput.value;
    }
    const includesHeader = controls.customDataIncludesHeader.value;
    console.log('loading custom file', file.name);

    return loadCsv({
        stream: file.stream(),
        size: file.size,
        options: {
            delimiter,
            includesHeader
        },
        progress: controls.customDataProgress
    }, invalidate);
}

function loadCustomFromUrl(
    controls: Controls, invalidate: Invalidate
): Promise<Column[]> {
    const url = controls.customDataUrlInput.value;
    const user = controls.customDataUrlUserInput.value;
    const pass = controls.customDataUrlPassInput.value;

    const headers = new Headers();
    if (user !== '' && pass !== '') {
        headers.set(
            'Authorization',
            'Basic ' + btoa(user + ':' + pass));
    }

    let delimiter = controls.customDataDelimiterSelect.value;
    if (delimiter === 'custom') {
        delimiter = controls.customDataDelimiterInput.value;
    }
    const includesHeader = controls.customDataIncludesHeader.value;

    console.log('loading from url', url);

    return fetch(url, { headers })
        .then((response) => loadCsv({
            stream: response.body,
            options: {
                delimiter,
                includesHeader
            },
            progress: controls.customDataProgress
        }, invalidate));
}

function loadCsv(
    info: LoadInfo<CsvLoaderOptions>, invalidate: Invalidate
): Promise<Column[]> {
    const loader = new CsvMultiThreadedLoader(info);
    return loader.load(invalidate);
}
