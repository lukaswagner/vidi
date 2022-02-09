import {
    CSV,
    Column,
    CsvLoaderOptions,
} from '@lukaswagner/csv-parser';

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

export async function load(
    options: Partial<CsvLoaderOptions>,
    init?: (columns: Column[]) => void, update?: () => void
): Promise<Column[]> {
    const loader = new CSV(options);

    const columnHeaders = await loader.open('data');
    const [columns, dispatch] = loader.load({
        columns: columnHeaders.map(({ type }) => type),
        generatedColumns: []
    });

    init?.(columns);

    for await (const data of dispatch()) {
        if(data.type === 'data' ) update?.();
    }

    return columns;
}
