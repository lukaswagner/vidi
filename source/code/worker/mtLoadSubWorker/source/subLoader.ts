import {
    ColorColumn,
    Column,
    DataType,
    FloatColumn,
    StringColumn,
    columnFromType
} from '../../../frontend/data/column';
import { Color } from 'webgl-operate';
import { Loader } from '../../loadWorker/source/loader';

export class SubLoader extends Loader {
    protected _decoder: TextDecoder;
    protected _remainder = '';
    protected _lines = new Array<string>();
    protected _types: DataType[];

    protected _startChunk: number;
    protected _startChar: number;
    protected _startRemainder: Uint8Array;
    protected _endChunk: number;
    protected _endChar: number;
    protected _endRemainder: Uint8Array;

    public load(): Promise<Array<Column>> {
        this._decoder = new TextDecoder();

        return new Promise((resolve) => {
            this.detectRemainders();
            this.parse();
            this.prepareColumns();
            this.fillColumns();
            this.calcMinMax();
            resolve(this._data);
        });
    }

    protected detectRemainders(): void {
        const lf = 0x0A;
        const cr = 0x0D;

        let done = false;
        let remainderLength = 0;
        for(let i = 0; i < this._chunks.length && !done; i++) {
            const chunk = new Uint8Array(this._chunks[i]);
            for(let j = 0; j < chunk.length && !done; j++) {
                if(chunk[j] === lf) {
                    if(j < chunk.length - 1) {
                        this._startChunk = i;
                        this._startChar = j + 1;
                    } else {
                        this._startChunk = i + 1;
                        this._startChar = 0;
                    }
                    const crFix = chunk[j - 1] === cr ? -1 : 0;
                    this._startRemainder =
                        new Uint8Array(remainderLength + j + crFix);
                    done = true;
                }
            }
            remainderLength += chunk.length;
        }

        done = false;
        let remainderIndex = 0;
        remainderLength = this._startRemainder.length;
        for(let i = 0; i < this._chunks.length && !done; i++) {
            const chunk = new Uint8Array(this._chunks[i]);
            if(chunk.length <= remainderLength - 1 - remainderIndex) {
                this._startRemainder.set(chunk, remainderIndex);
                remainderIndex += chunk.length;
            } else {
                const sub = chunk.subarray(0, remainderLength - remainderIndex);
                this._startRemainder.set(sub, remainderIndex);
                remainderIndex += sub.length;
            }
            if(remainderIndex >= remainderLength) {
                done = true;
            }
        }

        done = false;
        remainderLength = 0;
        for(let i = this._chunks.length - 1; i >= 0 && !done; i--) {
            const chunk = new Uint8Array(this._chunks[i]);
            for(let j = chunk.length - 1; j >= 0 && !done; j--) {
                if(chunk[j] === lf) {
                    this._endChunk = i;
                    this._endChar = j;
                    this._endRemainder =
                        new Uint8Array(remainderLength + chunk.length - 1 - j);
                    done = true;
                }
            }
            remainderLength += chunk.length;
        }

        done = false;
        remainderIndex = this._endRemainder.length - 1;
        remainderLength = this._endRemainder.length;
        for(let i = this._chunks.length - 1; i >= 0 && !done; i--) {
            if(remainderLength === 0) break;
            const chunk = new Uint8Array(this._chunks[i]);
            if(chunk.length <= remainderIndex) {
                this._endRemainder.set(
                    chunk, remainderIndex - chunk.length + 1);
                remainderIndex -= chunk.length;
            } else {
                const sub = chunk.subarray(chunk.length - remainderIndex - 1);
                this._endRemainder.set(sub, remainderIndex - sub.length + 1);
                remainderIndex -= sub.length;
            }
            if(remainderIndex < 0) {
                done = true;
            }
        }
    }

    protected parse(): void {
        if(this._startChunk === this._endChunk) {
            const chunk = new Uint8Array(
                this._chunks[this._startChunk],
                this._startChar, this._endChar - this._startChar + 1);
            this.parseChunk(chunk, false);
            return;
        }
        let chunk = new Uint8Array(
            this._chunks[this._startChunk], this._startChar);
        this.parseChunk(chunk, true);
        for(let i = this._startChunk + 1; i < this._endChunk; i++) {
            this.parseChunk(this._chunks[i], true);
        }
        chunk = new Uint8Array(
            this._chunks[this._endChunk], 0, this._endChar);
        this.parseChunk(chunk, false);
        // last chunk does not end with newline
        this._lines.push(this._remainder);
    }

    protected parseChunk(
        chunk: Uint8Array | ArrayBuffer, stream: boolean
    ): void {
        const str = this._decoder.decode(chunk, { stream });

        let start = 0;
        let newLine: number; 

        while ((newLine = str.indexOf('\n', start)) !== -1) {
            const hasReturn = str.charAt(newLine - 1) === '\r';
            this._lines.push(
                this._remainder +
                str.substring(start, newLine - (hasReturn ? 1 : 0)));
            this._remainder = '';
            start = newLine + 1;
        }

        this._remainder = str.substring(start);
    }

    protected prepareColumns(): void {
        // just use length, header will always be in remainder
        this._types.forEach((t) => this._data.push(
            columnFromType('', t, this._lines.length)));
    }

    protected fillColumns(): void {
        this._lines.forEach(this.storeLine.bind(this));
    }

    protected calcMinMax(): void {
        this._data.forEach((c) => {
            if (c.type === DataType.Float) {
                (c as FloatColumn).calcMinMax();
            }
        });
    }

    public set types(types: DataType[]) {
        this._types = types;
    }

    public get startRemainder(): ArrayBuffer {
        return this._startRemainder.buffer;
    }

    public get endRemainder(): ArrayBuffer {
        return this._endRemainder.buffer;
    }
}