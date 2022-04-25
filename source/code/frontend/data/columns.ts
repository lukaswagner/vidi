import {
    Column,
    DataType,
    NumberColumn,
} from '@lukaswagner/csv-parser';
import { vec3 } from 'webgl-operate';

export enum ColumnUsage {
    X_AXIS = 0,
    Y_AXIS = 1,
    Z_AXIS = 2,
    VARIABLE_POINT_SIZE = 3,
    COLOR_SCALAR = 4,
    COLOR_COLOR = 5,
    CLUSTER_ID = 6
}

interface Source {
    at(index: number): vec3;
    length: number;
}

type SelectedColumn = {
    raw: boolean,
    index: number;
}

export class Columns {
    protected _rawColumns = Array<Column>();
    protected _processedColumns = Array<Column>();

    protected _selectedColumns: SelectedColumn[] = [];

    protected getColumn(sel: SelectedColumn): Column {
        return (sel.raw ? this._rawColumns : this._processedColumns)[sel.index];
    }

    public constructor(columns: Array<Column>) {
        this._rawColumns = columns;
        this._processedColumns = [];
        this.initSelectedColumns(true);
    }

    public addColumns(columns: Array<Column>): void {
        this._processedColumns.push(...columns);
    }

    public getColumnNames(type: DataType): string[] {
        return [...this._rawColumns, ...this._processedColumns]
            .filter((c) => c.type === type).map((c) => c.name);
    }

    protected getSelectedColumn(column: string): SelectedColumn {
        let index = this._rawColumns.findIndex((c) => c.name === column);
        if(index > -1) return { raw: true, index };
        return {
            raw: false,
            index: this._processedColumns.findIndex((c) => c.name === column)
        };
    }

    public selectColumn(usage: ColumnUsage, column: string): void {
        const sel = this.getSelectedColumn(column);
        this._selectedColumns[usage] = sel;
    }

    public selectedColumn(usage: ColumnUsage): Column {
        const sel = this._selectedColumns[usage];
        return this.getColumn(sel);
    }

    protected initSelectedColumns(initZ: boolean): void {
        const strings = ['x', 'y', 'z'];
        const columnNames = this._rawColumns.map((c, i) => {
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
        const fallback = this._rawColumns
            .map((c, i) => { return {t: c.type, i} })
            .filter((x) => x.t === DataType.Number)
            .map((x) => x.i);

        this._selectedColumns[ColumnUsage.X_AXIS] =
            { raw: true, index: match?.[0] ?? fallback[0] ?? -1 };
        this._selectedColumns[ColumnUsage.Y_AXIS] =
            { raw: true, index: match?.[1] ?? fallback[1] ?? -1 };
        this._selectedColumns[ColumnUsage.Z_AXIS] =
            {
                raw: true,
                index: initZ ? (match?.[2] ?? fallback[2] ?? -1) : -1
            };
        this._selectedColumns[ColumnUsage.VARIABLE_POINT_SIZE] =
            { raw: true, index: -1 };
        this._selectedColumns[ColumnUsage.COLOR_SCALAR] =
            { raw: true, index: -1 };
        this._selectedColumns[ColumnUsage.COLOR_COLOR] =
            { raw: true, index: -1 };
    }

    public get selectedColumns(): Column[] {
        return this._selectedColumns.map((sel) => this.getColumn(sel));
    }

    public get columns(): Column[] {
        return this._rawColumns;
    }

    protected static LassoProxy = class implements Source {
        protected _instance: Columns;
        protected get(a: ColumnUsage, i: number): number {
            const sel = this._instance._selectedColumns[a];
            return (this._instance.getColumn(sel) as NumberColumn)?.get(i) ?? 0;
        }
        constructor(instance: Columns) {
            this._instance = instance;
        }
        at(index: number): vec3 {
            return vec3.fromValues(
                this.get(ColumnUsage.X_AXIS, index),
                this.get(ColumnUsage.Y_AXIS, index),
                this.get(ColumnUsage.Z_AXIS, index),
            );
        }
        public get length(): number {
            return this._instance._rawColumns[0].length;
        }
    }

    public get positionSource(): Source {
        return new Columns.LassoProxy(this);
    }
}
