import { Column, ColumnContent, inferType, DataType, emptyColumn } from "./column";
import { Progress, ProgressStep } from "../ui/progress";
import { Color } from "webgl-operate";

export class DSVLoader {
    protected _delimiter = ',';
    protected _includesHeader = true;
    protected _stream: ReadableStream<Uint8Array>;
    protected _size: number;

    protected _decoder: TextDecoder;
    protected _remainder = '';
    protected _charCount = 0;
    protected _lines = new Array<string>();

    protected _data = new Array<Column<ColumnContent>>();
    protected _progress: (a: number) => void;
    protected _setProgressStepTotal: (index: number, total: number) => void;

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
    };

    protected read(): Promise<void> {
        const reader = this._stream.getReader();
        return new Promise((resolve) => {
            const readChunk = (
                result: ReadableStreamReadResult<Uint8Array>
            ): void => {
                if (result.done) {
                    console.log(
                        `Loaded ${this._lines.length} lines (${this._size} bytes).`);
                    resolve();
                    return;
                }
                this._charCount += result.value.length;

                this.processChunk(this._decoder.decode(
                    result.value.buffer,
                    { stream: this._charCount < this._size }
                ));

                this._progress(result.value.length);

                reader.read().then(callback);
            }

            const callback = readChunk.bind(this);
            reader.read().then(callback);
        });
    }

    protected cellEnd(line: string, index: number): {
        end: boolean, skip: number
    } {
        const char = line.charAt(index);
        switch (char) {
            case this._delimiter:
            case '\n':
                return { end: true, skip: 1 }
            case '\r':
                if (line.charAt(index + 1) === '\n') {
                    return { end: true, skip: 2 }
                }
            default:
                return { end: false, skip: 0 }
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
        }

        for (let i = 0; i < line.length; i++) {
            const char = line.charAt(i);
            if (char === '"') {
                quoteActive = !quoteActive;
                quote = true;
                continue;
            }
            if (quoteActive) {
                continue;
            };
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
            this._data.push(emptyColumn(header, type, this._lines.length));
        });
    }

    protected fillColumns(): void {
        for (let i = 0; i < this._lines.length - 1; i++) {
            const cells = this.parseLine(this._lines[i] + 1);
            cells.forEach((cell, ci) => {
                const column = this._data[ci];
                switch (column.type) {
                    case DataType.Number:
                        column.data[i] = Number(cell);
                        break;
                    case DataType.Color:
                        column.data[i] = Number(Color.hex2rgba(cell));
                        break;
                    case DataType.String:
                        column.data[i] = Number(cell);
                        break;
                }
            });
            this._progress(1);
        }
    }

    protected calcMinMax(): void {
        this._data.forEach((c) => {
            if (c.type !== DataType.Number) {
                return;
            }
            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;
            c.data.forEach((n: number) => {
                if (n < min) min = n;
                if (n > max) max = n;
            });
            c.min = min;
            c.max = max;
            this._progress(1);
        });
    }

    protected process(): Promise<void> {
        return new Promise((resolve) => {
            this.prepareColumns();
            this._setProgressStepTotal(
                1, this._lines.length - 1 + this._data.length);
            this.fillColumns();
            this.calcMinMax();
            resolve();
        });
    }

    public load(
        setProgressSteps: (s: Array<ProgressStep>) => void,
        setProgressStepTotal: (index: number, total: number) => void,
        progress: (a: number) => void
    ): Promise<Array<Column<ColumnContent>>> {
        this._decoder = new TextDecoder();

        this._setProgressStepTotal = setProgressStepTotal;
        this._progress = progress;

        setProgressSteps([
            new ProgressStep(this._size, 1),
            new ProgressStep(1, 1)
        ]);

        return new Promise((resolve) => {
            this.read()
                .then(() => this.process())
                .then(() => resolve(this._data));
        });
    }

    public set delimiter(delimiter: string) {
        this._delimiter = delimiter;
    }

    public set includesHeader(includesHeader: boolean) {
        this._includesHeader = includesHeader;
    }

    public set stream(stream: ReadableStream<Uint8Array>) {
        this._stream = stream;
    }

    public set size(size: number) {
        this._size = size;
    }
}
