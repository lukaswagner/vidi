import {
    ColorColumn,
    Column,
    DataType,
    FloatColumn,
    StringColumn,
    columnFromType,
    inferType
} from '../../../frontend/data/column';
import { Color } from 'webgl-operate';
import { Loader } from './loader';

export class SingleThreadedLoader extends Loader {
    protected _decoder: TextDecoder;
    protected _remainder = '';
    protected _charCount = 0;
    protected _lines = new Array<string>();

    public load(): Promise<Array<Column>> {
        this._decoder = new TextDecoder();

        return new Promise((resolve) => {
            this.parse()
                .then(() => this.process())
                .then(() => resolve(this._data));
        });
    }

    protected processChunk(chunk: string): void {
        let start = 0;
        let newLine: number; 

        while ((newLine = chunk.indexOf('\n', start)) !== -1) {
            const hasReturn = chunk.charAt(newLine - 1) === '\r';
            this._lines.push(
                this._remainder +
                chunk.substring(start, newLine - (hasReturn ? 1 : 0)));
            this._remainder = '';
            start = newLine + 1;
        }

        this._remainder = chunk.substring(start);
    }

    protected parse(): Promise<void> {
        const progressThreshold = this._chunks.length / 10;
        let progress = 0;
        return new Promise<void>((resolve) => {
            this._chunks.forEach((c, i) => {
                this.processChunk(this._decoder.decode(
                    c, { stream: i < this._chunks.length - 1 }
                ));
                progress++;
                if(progress >= progressThreshold) {
                    this._progress(1, progress);
                    progress = 0;
                }
            });
            if(progress > 0) {
                this._progress(1, progress);
            }
            resolve();
        });
    }

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

    protected parseLine(line: string): Array<string> {
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

    protected prepareColumns(): void {
        const header = this.parseLine(this._lines[0]);
        const firstLine = this.parseLine(this._lines[1]);

        header.map((header, index) => {
            const data = firstLine[index];
            const type = inferType(data);
            this._data.push(
                columnFromType(header, type, this._lines.length - 1));
        });
    }

    protected fillColumns(): void {
        const progressThreshold = this._lines.length / 10;
        let progress = 0;
        for (let i = 0; i < this._lines.length - 1; i++) {
            const cells = this.parseLine(this._lines[i + 1]);
            cells.forEach((cell, ci) => {
                const column = this._data[ci];
                switch (column.type) {
                    case DataType.Float:
                        (column as FloatColumn).set(i, Number(cell));
                        break;
                    case DataType.Color:
                        (column as ColorColumn).set(i, Color.hex2rgba(cell));
                        break;
                    case DataType.String:
                        (column as StringColumn).set(i, cell);
                        break;
                }
            });
            progress++;
            if(progress >= progressThreshold) {
                this._progress(2, progress);
                progress = 0;
            }
        }
        if(progress > 0) {
            this._progress(2, progress);
        }
    }

    protected calcMinMax(): void {
        const progressThreshold = this._data.length / 2;
        let progress = 0;
        this._data.forEach((c) => {
            if (c.type === DataType.Float) {
                (c as FloatColumn).calcMinMax();
            }
            progress++;
            if(progress >= progressThreshold) {
                this._progress(2, progress);
                progress = 0;
            }
        });
        if(progress > 0) {
            this._progress(2, progress);
        }
    }

    protected process(): Promise<void> {
        return new Promise((resolve) => {
            this.prepareColumns();
            this._setProgressStepTotal(
                2, this._lines.length - 1 + this._data.length);
            this.fillColumns();
            this.calcMinMax();
            resolve();
        });
    }
}
