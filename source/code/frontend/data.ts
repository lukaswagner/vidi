class Column<T> {
    name: string;
    data: Array<T>;
}

export class Data {
    protected _columns = new Array<Column<number>>();
    protected _rowCount: number;

    constructor(csv: string) {
        // prepare data
        let lines = csv.split(/\r\n|\n/);
        lines = lines.filter((s: string) => s.trim() !== '');

        // get headers and create columns
        const columnNames = lines.shift().split(',');
        columnNames.forEach((column) => {
            this._columns.push({
                name: column,
                data: new Array<number>()
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
    }

    get columnNames(): string[] {
        return this._columns.map((c) => c.name);
    }

    public extrema(columnName: string): { min: number, max: number } {
        const data =
            this._columns.find((c) => c.name === columnName)?.data;
        if(data === undefined) {
            return undefined;
        }
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        data.forEach((n) => {
            if(n < min) min = n;
            if(n > max) max = n;
        });
        return { min, max };
    }

    public getCoordinates(
        columnAName: string, columnBName: string, range?: {min: number, max: number}
    ): Float32Array {
        let map: (a: number, b: number) => { a: number, b: number };
        if(range === undefined) {
            map = (a: number, b: number) => {
                return { a, b };
            };
        } else {
            const ae = this.extrema(columnAName);
            const be = this.extrema(columnBName);
            const oDiff = range.max - range.min;
            const aDiffInv = 1 / (ae.max - ae.min);
            const bDiffInv = 1 / (be.max - be.min);
            map = (a: number, b: number) => {
                return {
                    a: range.min + (oDiff * aDiffInv * (a - ae.min)),
                    b: range.min + (oDiff * bDiffInv * (b - be.min))
                };
            };
        }

        const columnA =
            this._columns.find((c) => c.name === columnAName)?.data;
        const columnB =
            this._columns.find((c) => c.name === columnBName)?.data;

        // output as array of vec3 -> y stays 0
        const result = new Float32Array(this._rowCount * 3);

        if(columnA === undefined || columnB === undefined) {
            return result;
        }

        for(let i = 0; i < this._rowCount; i++) {
            const a = columnA[i];
            const b = columnB[i];
            const mapped = map(a, b);
            result[i * 3] = mapped.a;
            result[i * 3 + 2] = mapped.b;
        }

        return result;
    }
}
