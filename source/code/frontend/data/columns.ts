import { Column, NumberColumn, ColorColumn } from "shared/column/column";
import { DataType } from "shared/column/dataType";

export enum ColumnUsage {
    X_AXIS = 0,
    Y_AXIS = 1,
    Z_AXIS = 2,
    VARIABLE_POINT_SIZE = 3,
    PER_POINT_COLOR = 4
}

export class Columns {
    protected _columns = Array<Column>();

    protected _selectedColumns: number[] = [];

    public constructor(
        columns: Array<Column>
    ) {
        this._columns = columns;
        this.initSelectedColumns(true);
    }

    public getColumnNames(type: DataType): string[] {
        return this._columns.filter((c) => c.type === type).map((c) => c.name);
    }

    public getColumnIndex(column: string): number {
        return this._columns.findIndex((c) => c.name === column);
    }

    public selectColumn(usage: ColumnUsage, column: string): void {
        const columnIndex = this.getColumnIndex(column);
        this._selectedColumns[usage] = columnIndex;
    }

    public selectedColumn(usage: ColumnUsage): Column {
        const i = this._selectedColumns[usage];
        return this._columns[i];
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
                zMatches.length > 0 ? zMatches[0].index : -1
            ];
        });

        const match = matchMatches[0];

        // fallback: indices of first number columns
        const fallback = this._columns
            .map((c, i) => { return {t: c.type, i} })
            .filter((x) => x.t === DataType.Number)
            .map((x) => x.i);

        this._selectedColumns[ColumnUsage.X_AXIS] =
            match?.[0] ?? fallback[0] ?? -1;
        this._selectedColumns[ColumnUsage.Y_AXIS] =
            match?.[1] ?? fallback[1] ?? -1;
        this._selectedColumns[ColumnUsage.Z_AXIS] =
            initZ ? (match?.[2] ?? fallback[2] ?? -1) : -1;
        this._selectedColumns[ColumnUsage.VARIABLE_POINT_SIZE] = -1;
        this._selectedColumns[ColumnUsage.PER_POINT_COLOR] = -1;
    }

    public get selectedColumns(): Column[] {
        return this._selectedColumns.map((i) => this._columns[i]);
    }
}
