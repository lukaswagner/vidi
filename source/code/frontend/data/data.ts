import { Color } from 'webgl-operate';
import { GLclampf4 } from 'webgl-operate/lib/tuples';
import { Column, DataType, ColumnContent } from './column';

export class Data {
    protected _columns = Array<Column<ColumnContent>>();
    protected _rowCount: number;

    protected _selectedColumns: number[];

    public constructor(
        columns: Array<Column<ColumnContent>>
    ) {
        this._columns = columns;
        this._rowCount = columns[0].data.length;
        this.initSelectedColumns(false);
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
