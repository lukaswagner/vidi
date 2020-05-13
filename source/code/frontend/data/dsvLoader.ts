import { Column, ColumnContent } from "./column";
import { Progress, ProgressStep } from "../util/progress";

export class DSVLoader {
    protected _delimiter = ',';
    protected _includesHeader = true;
    protected _stream: ReadableStream<Uint8Array>;
    protected _size: number;

    protected _progress: Progress;
    protected _decoder: TextDecoder;
    protected _remainder = '';
    protected _charCount = 0;
    protected _lines = new Array<string>();

    protected _data = new Array<Column<ColumnContent>>();

    // protected processHeader(header: string, firstLine: string): void {
    //     // prepare header
    // };


    // protected processLine(line: string): void {
    //     this._lineCount++;
    //     if (this._lineCount === 1) {
    //         this._header = line;
    //         return;
    //     }
    //     if (this._lineCount === 1) {
    //         this.processHeader(this._header, line);
    //     }
    //     // actual processing
    // };

    protected processChunk(chunk: string): void {
        let start = 0;
        let newLine: number;

        while ((newLine = chunk.indexOf('\n', start)) !== -1) {
            const hasReturn = chunk.charAt(newLine - 1) === '\r';
            this._lines.push(
                this._remainder +
                chunk.substring(0, newLine - (hasReturn ? 1 : 0)));
            this._remainder = '';
            start = newLine + 1;
        }

        this._remainder = chunk.substring(start);
    };

    public load(): Promise<Array<Column<ColumnContent>>> {
        this._decoder = new TextDecoder();
        const reader = this._stream.getReader();

        const loadStep = new ProgressStep(this._size, 1);
        const processStep = new ProgressStep(1, 1);
        this._progress = new Progress([loadStep, processStep]);

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

                this._progress.progress(result.value.length, true);

                reader.read().then(callback);
            }

            const callback = readChunk.bind(this);
            reader.read().then(callback);
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
