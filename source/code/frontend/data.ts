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
        xAxis: string, yAxis: string, zAxis: string,
        range?: {min: number, max: number}
    ): Float32Array {
        let map: (x: number, y: number, z: number) => {
            x: number,
            y: number,
            z: number
        };

        if(range === undefined) {
            map = (x: number, y: number, z: number) => {
                return { x, y, z };
            };
        } else {
            const nc = '__NOCOLUMN__';
            const nce = { min: -1, max: 1 };
            const xe = xAxis !== nc ? this.extrema(xAxis) : nce;
            const ye = yAxis !== nc ? this.extrema(yAxis) : nce;
            const ze = zAxis !== nc ? this.extrema(zAxis) : nce;
            const oDiff = range.max - range.min;
            const xDiffInv = 1 / (xe.max - xe.min);
            const yDiffInv = 1 / (ye.max - ye.min);
            const zDiffInv = 1 / (ze.max - ze.min);
            map = (x: number, y: number, z: number) => {
                return {
                    x: range.min + (oDiff * xDiffInv * (x - xe.min)),
                    y: range.min + (oDiff * yDiffInv * (y - ye.min)),
                    z: range.min + (oDiff * zDiffInv * (z - ze.min))
                };
            };
        }

        const dataX = this._columns.find((c) => c.name === xAxis)?.data;
        const dataY = this._columns.find((c) => c.name === yAxis)?.data;
        const dataZ = this._columns.find((c) => c.name === zAxis)?.data;

        const result = new Float32Array(this._rowCount * 3);

        const getX = dataX === undefined ? () => 0 : (i: number) => dataX[i];
        const getY = dataY === undefined ? () => 0 : (i: number) => dataY[i];
        const getZ = dataZ === undefined ? () => 0 : (i: number) => dataZ[i];

        for(let i = 0; i < this._rowCount; i++) {
            const mapped = map(getX(i), getY(i), getZ(i));
            result[i * 3] = mapped.x;
            result[i * 3 + 1] = mapped.z;
            result[i * 3 + 2] = mapped.y;
        }

        return result;
    }
}
