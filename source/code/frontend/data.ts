class Column<T> {
    name: string;
    data: Array<T>;
    min: T;
    max: T;
}

export class Data {
    protected _columns = new Array<Column<number>>();
    protected _rowCount: number;

    protected _selectedColumns: number[];

    constructor(csv: string) {
        // prepare data
        let lines = csv.split(/\r\n|\n/);
        lines = lines.filter((s: string) => s.trim() !== '');

        // get headers and create columns
        const columnNames = lines.shift().split(',');
        columnNames.forEach((column) => {
            this._columns.push({
                name: column,
                data: new Array<number>(),
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE
            });
        });

        // store number of rows
        this._rowCount = lines.length;

        // read values into columns
        lines.forEach((line) => {
            const values = line.split(',');
            values.forEach((value, column) => {
                this._columns[column].data.push(Number(value));
            });
        });

        // calculate min/max
        this._columns.forEach((c) => {
            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;
            c.data.forEach((n) => {
                if(n < min) min = n;
                if(n > max) max = n;
            });
            c.min = min;
            c.max = max;
        })

        this.initSelectedColumns(false);
    }

    initSelectedColumns(initZ: boolean): void {
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
            return [
                x.index,
                matches[1].filter((y) => x.name === y.name)[0].index,
                initZ ?
                    matches[2].filter((y) => x.name === y.name)[0].index :
                    -1
            ];
        });

        if(matchMatches.length > 0) {
            this._selectedColumns = matchMatches[0];
        } else {
            // fallback: use first columns
            this._selectedColumns = [0, 1, initZ ? 2 : -1];
        }
    }

    get columnNames(): string[] {
        return this._columns.map((c) => c.name);
    }

    selectColumn(axisIndex: number, column: string): void {
        const columnIndex = this._columns.findIndex((c) => c.name === column);
        this._selectedColumns[axisIndex] = columnIndex;
    }

    selectedColumn(axisIndex: number): string {
        const i = this._selectedColumns[axisIndex];
        if(i === -1) return '__NOCOLUMN__';
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
        if(range === undefined) {
            map = (x: number, y: number, z: number) => {
                return { x, y, z };
            };
        // otherwise, a mapping function has to be calculated per axis
        } else {
            // fetch the min/max values
            const e = this._selectedColumns.map((ci) => {
                if(ci === -1) return { min: -1, max: 1 };
                const c = this._columns[ci];
                return { min: c.min, max: c.max };
            });
            // ensure range exists for each axis
            while(range.length < e.length) {
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
            if(i === -1) return () => 0;
            const data = this._columns[i].data;
            return (i: number) => data[i];
        });

        const positions = new Float32Array(this._rowCount * 3);

        for(let i = 0; i < this._rowCount; i++) {
            const mapped = map(get[0](i), get[1](i), get[2](i));
            positions[i * 3] = mapped.x;
            positions[i * 3 + 1] = mapped.z;
            positions[i * 3 + 2] = -mapped.y;
        }

        const extents = this._selectedColumns.map((ci, ai) => {
            if(ci === -1) return { min: -1, max: 1 };
            if(ai < range.length) return range[ai];
            const c = this._columns[ci];
            return { min: c.min, max: c.max };
        });

        return { positions, extents };
    }
}
