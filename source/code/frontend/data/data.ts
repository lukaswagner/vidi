import { Column, NumberColumn, ColorColumn } from "shared/column/column";
import { DataType } from "shared/column/dataType";

export class Data {
    protected _columns = Array<Column>();
    protected _rowCount: number;

    protected _selectedColumns: number[];

    public constructor(
        columns: Array<Column>
    ) {
        this._columns = columns;
        this._rowCount = columns[0].length;
        this.initSelectedColumns(true);
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

    public getCoordinates(): NumberColumn[] {
        return this._selectedColumns.map(
            (i) => this._columns[i] as NumberColumn);
    }

    public getColors(column: string): ColorColumn {
        const ci = this.getColumnIndex(column);
        if (ci > -1 && this._columns[ci].type === DataType.Color) {
            return this._columns[ci] as ColorColumn;
        }
        return undefined;
    }

    public getVariablePointSize(column: string): NumberColumn {
        const ci = this.getColumnIndex(column);
        if (ci > -1 && this._columns[ci].type === DataType.Number) {
            return this._columns[ci] as NumberColumn;
        }
        return undefined;
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
            this._selectedColumns = [
                this._columns.length > 0 ? 0 : -1,
                this._columns.length > 1 ? 1 : -1,
                initZ && this._columns.length > 2 ? 2 : -1
            ];
        }
    }
}
