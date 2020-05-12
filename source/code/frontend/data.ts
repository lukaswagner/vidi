import { Color } from 'webgl-operate';
import { GLclampf4 } from 'webgl-operate/lib/tuples';

export enum DataType {
    Number,
    Color,
    String
}

type Content = Number | GLclampf4 | String;

type Column<T> = {
    name: string;
    type: DataType;
    data: Array<T>;
    min: T;
    max: T;
}

export class Data {
    protected _columns = Array<Column<Content>>();
    protected _rowCount: number;

    protected _selectedColumns: number[];

    public constructor(
        data: ReadableStream<Uint8Array>,
        size: number,
        delimiter: string,
        includesHeader: boolean,
        loadedCallback: () => void
    ) {
        let count = 0;
        const resolution = 20;

        const processingComplete = (): void => {
            console.log(`Processed ${lineCount} lines.`);
            loadedCallback();
        };

        const processHeader = (header: string, firstLine: string): void => {
            // prepare header
        };

        let lineCount = 0;
        let header: string;
        const processLine = (line: string): void => {
            lineCount++;
            if (lineCount === 1) {
                header = line;
                return;
            }
            if (lineCount === 1) {
                processHeader(header, line);
            }
            // actual processing
        };

        let remainder = '';
        const processChunk = (chunk: string): void => {
            let start = 0;
            let newLine: number;

            while ((newLine = chunk.indexOf('\n', start)) !== -1) {
                const hasReturn = chunk.charAt(newLine - 1) === '\r';
                processLine(
                    remainder + chunk.substring(
                        0, newLine - (hasReturn ? 1 : 0)));
                remainder = '';
                start = newLine + 1;
            }

            remainder = chunk.substring(start);
        };

        const decoder = new TextDecoder();
        const read = (
            reader: ReadableStreamDefaultReader<Uint8Array>,
            result: ReadableStreamReadResult<Uint8Array>
        ): void => {
            if (result.done) {
                processingComplete();
                return;
            }

            count += result.value.length;

            processChunk(decoder.decode(
                result.value.buffer,
                { stream: count < size }
            ));

            const progress = Math.round(count / size * resolution);
            const done = '#'.repeat(progress);
            const remaining = '.'.repeat(resolution - progress);
            console.log(`[${done}${remaining}] ${count} / ${size}`);
            reader.read().then(callback);
        };

        const reader = data.getReader();
        const callback = read.bind(this, reader);

        reader.read().then(callback);

        // // prepare data
        // let lines = data.split(/\r\n|\n/);
        // lines = lines.filter((s: string) => s.trim() !== '');

        // // get headers and create columns - try to detect value type
        // const columnNames = includesHeader ?
        //     lines.shift().split(delimiter) :
        //     lines[0].split(delimiter).map((c, i) => i.toString());
        // const firstLine = lines[0].split(delimiter);
        // let result: Column<Content>;
        // columnNames.forEach((column, i) => {
        //     const type = this.inferType(firstLine[i]);
        //     console.log('interpreting column', column, 'as', DataType[type]);
        //     switch (type) {
        //         case DataType.Number:
        //             result = {
        //                 name: column,
        //                 type: type,
        //                 data: new Array<Number>(),
        //                 min: Number.MAX_VALUE,
        //                 max: Number.MIN_VALUE
        //             } as Column<Number>;
        //             break;
        //         case DataType.Color:
        //             result = {
        //                 name: column,
        //                 type: type,
        //                 data: new Array<GLclampf4>(),
        //                 min: [0, 0, 0, 0],
        //                 max: [0, 0, 0, 0]
        //             } as Column<GLclampf4>;
        //             break;
        //         case DataType.String:
        //             result = {
        //                 name: column,
        //                 type: type,
        //                 data: new Array<String>(),
        //                 min: '',
        //                 max: ''
        //             } as Column<String>;
        //             break;
        //     }
        //     this._columns.push(result);
        // });

        // // store number of rows
        // this._rowCount = lines.length;

        // // read values into columns
        // lines.forEach((line) => {
        //     const values = line.split(delimiter);
        //     values.forEach((value, i) => {
        //         const column = this._columns[i];
        //         switch (column.type) {
        //             case DataType.Number:
        //                 column.data.push(Number(value));
        //                 break;
        //             case DataType.Color:
        //                 column.data.push(Color.hex2rgba(value));
        //                 break;
        //             case DataType.String:
        //                 column.data.push(value);
        //                 break;
        //         }
        //     });
        // });

        // // calculate min/max
        // this._columns.forEach((c) => {
        //     if (c.type !== DataType.Number) {
        //         return;
        //     }
        //     let min = Number.MAX_VALUE;
        //     let max = Number.MIN_VALUE;
        //     c.data.forEach((n: number) => {
        //         if (n < min) min = n;
        //         if (n > max) max = n;
        //     });
        //     c.min = min;
        //     c.max = max;
        // });

        // this.initSelectedColumns(false);
    }

    public getColumnNames(type: DataType): string[] {
        return this._columns.filter((c) => c.type === type).map((c) => c.name);
    }

    public getColumnIndex(column: string): number {
        return this._columns.findIndex((c) => c.name === column);
    }

    public selectColumn(axisIndex: number, column: string): void {
        const columnIndex = this.getColumnIndex(column);
        this._selectedColumns[axisIndex] = columnIndex;
    }

    public selectedColumn(axisIndex: number): string {
        const i = this._selectedColumns[axisIndex];
        if (i === -1) return '__NONE__';
        return this._columns[i].name;
    }

    public getCoordinates(
        range?: { min: number, max: number }[]
    ): { positions: Float32Array, extents: { min: number, max: number }[] } {
        let map: (x: number, y: number, z: number) => {
            x: number,
            y: number,
            z: number
        };

        // if no custom output range is passed, just return the actual values
        if (range === undefined) {
            map = (x: number, y: number, z: number) => {
                return { x, y, z };
            };
            // otherwise, a mapping function has to be calculated per axis
        } else {
            // fetch the min/max values
            const e = this._selectedColumns.map((ci) => {
                if (ci === -1) return { min: -1, max: 1 };
                const c = this._columns[ci] as Column<number>;
                return { min: c.min, max: c.max };
            });
            // ensure range exists for each axis
            while (range.length < e.length) {
                range.push(e[range.length]);
            }
            // pre-calc mapping factors for all axes
            const f = e.map(
                (e, i) => (range[i].max - range[i].min) / (e.max - e.min));

            map = (x: number, y: number, z: number) => {
                return {
                    x: range[0].min + (f[0] * (x - e[0].min)),
                    y: range[1].min + (f[1] * (y - e[1].min)),
                    z: range[2].min + (f[2] * (z - e[2].min))
                };
            };
        }

        const sc = this._selectedColumns;
        const get = sc.map((i) => {
            if (i === -1) return () => 0;
            const data = (this._columns[i] as Column<number>).data;
            return (i: number) => data[i];
        });

        const positions = new Float32Array(this._rowCount * 3);

        for (let i = 0; i < this._rowCount; i++) {
            const mapped = map(get[0](i), get[1](i), get[2](i));
            positions[i * 3] = mapped.x;
            positions[i * 3 + 1] = mapped.z;
            positions[i * 3 + 2] = -mapped.y;
        }

        const extents = this._selectedColumns.map((ci, ai) => {
            if (ci === -1) return { min: -1, max: 1 };
            if (ai < range.length) return range[ai];
            const c = this._columns[ci] as Column<number>;
            return { min: c.min, max: c.max };
        });

        return { positions, extents };
    }

    public getColors(column: string): Float32Array {
        const colors = new Float32Array(this._rowCount * 3);
        const columnIndex = this.getColumnIndex(column);
        if (
            columnIndex === -1 ||
            this._columns[columnIndex].type !== DataType.Color
        ) {
            return colors;
        }
        const data = this._columns[columnIndex].data;
        for (let i = 0; i < this._rowCount; i++) {
            const c = data[i] as GLclampf4;
            colors[i * 3 + 0] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
        }
        return colors;
    }

    public getVariablePointSize(column: string): Float32Array {
        const pointSize = new Float32Array(this._rowCount);
        const columnIndex = this.getColumnIndex(column);
        if (
            columnIndex === -1 ||
            this._columns[columnIndex].type !== DataType.Number
        ) {
            return pointSize.fill(1);
        }
        const data = this._columns[columnIndex].data;
        for (let i = 0; i < this._rowCount; i++) {
            pointSize[i] = Math.log(data[i] as number);
        }
        return pointSize;
    }

    protected inferType(input: string): DataType {
        if (!Number.isNaN(Number(input))) {
            return DataType.Number;
        }

        if (input.startsWith('#')) {
            const col = Color.hex2rgba(input);
            if (col[0] !== 0 || col[1] !== 0 || col[2] !== 0 || col[3] !== 0) {
                return DataType.Color;
            }
        }

        return DataType.String;
    }

    protected initSelectedColumns(initZ: boolean): void {
        const strings = ['x', 'y', 'z'];
        const columnNames = this._columns.map((c, i) => {
            return { name: c.name.toLowerCase(), index: i };
        });

        const matches = strings.map((s) => {
            return columnNames.filter((c) => c.name.includes(s)).map((c) => {
                return { name: c.name.replace(s, ''), index: c.index };
            });
        });

        const matchMatches = matches[0].map((x) => {
            const yMatches = matches[1].filter((y) => x.name === y.name);
            const zMatches = matches[2].filter((z) => x.name === z.name);
            return [
                x.index,
                yMatches.length > 0 ? yMatches[0].index : -1,
                initZ && zMatches.length > 0 ? zMatches[0].index : -1
            ];
        });

        if (matchMatches.length > 0) {
            this._selectedColumns = matchMatches[0];
        } else {
            // fallback: use first columns
            this._selectedColumns = [0, 1, initZ ? 2 : -1];
        }
    }
}
