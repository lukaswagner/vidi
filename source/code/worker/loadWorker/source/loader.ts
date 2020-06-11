import {
    ColorColumn, Column, DataType, FloatColumn, StringColumn,
} from '../../../frontend/data/column';
import { Color } from 'webgl-operate';

export abstract class Loader {
    protected _delimiter = ',';
    protected _includesHeader = true;
    protected _size: number;
    protected _chunks: ArrayBuffer[];

    protected _data = new Array<Column>();

    protected _setProgressStepTotal: (index: number, total: number) => void;
    protected _progress: (index: number, a: number) => void;
    protected _setProgress: (index: number, a: number) => void;

    protected cellEnd(line: string, index: number): {
        end: boolean, skip: number
    } {
        const char = line.charAt(index);
        switch (char) {
            case this._delimiter:
            case '\n':
                return { end: true, skip: 1 };
            case '\r':
                if (line.charAt(index + 1) === '\n') {
                    return { end: true, skip: 2 };
                }
            // eslint-disable-next-line no-fallthrough
            default:
                return { end: false, skip: 0 };
        }
    }

    protected splitLine(line: string): Array<string> {
        const cells = new Array<string>();

        let start = 0;
        let quote = false;
        let quoteActive = false;

        const push = (end: number): void => {
            cells.push(line.substring(
                quote ? start + 1 : start,
                quote ? end - 1 : end));
        };

        for (let i = 0; i < line.length; i++) {
            const char = line.charAt(i);
            if (char === '"') {
                quoteActive = !quoteActive;
                quote = true;
                continue;
            }
            if (quoteActive) {
                continue;
            }
            const { end, skip } = this.cellEnd(line, i);
            if (end) {
                push(i);
                start = i + skip;
                quote = false;
            }
        }
        push(undefined);

        return cells;
    }

    protected storeLine(line: string, index: number): void {
        const cells = this.splitLine(line);
        cells.forEach((cell, ci) => {
            const column = this._data[ci];
            switch (column.type) {
                case DataType.Float:
                    (column as FloatColumn).set(index, Number(cell));
                    break;
                case DataType.Color:
                    (column as ColorColumn).set(index, Color.hex2rgba(cell));
                    break;
                case DataType.String:
                    (column as StringColumn).set(index, cell);
                    break;
            }
        });
    }

    public abstract load(): Promise<Array<Column>>;

    public set delimiter(delimiter: string) {
        this._delimiter = delimiter;
    }

    public set includesHeader(includesHeader: boolean) {
        this._includesHeader = includesHeader;
    }

    public set size(size: number) {
        this._size = size;
    }

    public set chunks(chunks: ArrayBuffer[]) {
        this._chunks = chunks;
    }

    public set setProgressStepTotal(f: (index: number, total: number) => void) {
        this._setProgressStepTotal = f;
    }

    public set progress(f: (index: number, progress: number) => void) {
        this._progress = f;
    }

    public set setProgress(f: (index: number, progress: number) => void) {
        this._setProgress = f;
    }
}
